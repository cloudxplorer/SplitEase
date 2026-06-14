import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, memberEmails } = body as {
      name: string;
      description?: string;
      memberEmails: string[];
    };

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Group name is required" },
        { status: 400 }
      );
    }

    if (
      !Array.isArray(memberEmails) ||
      memberEmails.some((e) => typeof e !== "string")
    ) {
      return NextResponse.json(
        { error: "memberEmails must be an array of strings" },
        { status: 400 }
      );
    }

    // Find users by email
    const users = await db.user.findMany({
      where: {
        email: { in: memberEmails },
      },
    });

    // Check for emails not found
    const foundEmails = users.map((u) => u.email);
    const notFoundEmails = memberEmails.filter((e) => !foundEmails.includes(e));
    if (notFoundEmails.length > 0) {
      return NextResponse.json(
        {
          error: `Users not found: ${notFoundEmails.join(", ")}`,
        },
        { status: 404 }
      );
    }

    // Don't include the creator in memberEmails (they'll be added as admin)
    const memberUserIds = users
      .filter((u) => u.id !== session.user.id)
      .map((u) => u.id);

    const group = await db.group.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        createdBy: session.user.id,
        members: {
          create: [
            { userId: session.user.id, role: "admin" },
            ...memberUserIds.map((userId) => ({
              userId,
              role: "member" as const,
            })),
          ],
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ group }, { status: 201 });
  } catch (error) {
    console.error("Create group error:", error);
    return NextResponse.json(
      { error: "Failed to create group" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const groups = await db.group.findMany({
      where: {
        members: {
          some: { userId: session.user.id },
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        expenses: {
          select: {
            id: true,
            amount: true,
          },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const groupsWithStats = groups.map((group) => {
      const totalExpenses = group.expenses.reduce(
        (sum, e) => sum + e.amount,
        0
      );
      return {
        id: group.id,
        name: group.name,
        description: group.description,
        createdBy: group.createdBy,
        creator: group.creator,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
        members: group.members,
        expenseCount: group.expenses.length,
        totalExpenses,
      };
    });

    return NextResponse.json({ groups: groupsWithStats });
  } catch (error) {
    console.error("Get groups error:", error);
    return NextResponse.json(
      { error: "Failed to fetch groups" },
      { status: 500 }
    );
  }
}
