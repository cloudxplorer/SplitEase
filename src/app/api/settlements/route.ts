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
    const { groupId, toUserId, amount, note } = body as {
      groupId: string;
      toUserId: string;
      amount: number;
      note?: string;
    };

    // Validation
    if (!groupId || typeof groupId !== "string") {
      return NextResponse.json(
        { error: "groupId is required" },
        { status: 400 }
      );
    }

    if (!toUserId || typeof toUserId !== "string") {
      return NextResponse.json(
        { error: "toUserId is required" },
        { status: 400 }
      );
    }

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "amount must be a positive number" },
        { status: 400 }
      );
    }

    if (toUserId === session.user.id) {
      return NextResponse.json(
        { error: "Cannot settle with yourself" },
        { status: 400 }
      );
    }

    // Check if user is a member of the group
    const membership = await db.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: session.user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: "You are not a member of this group" },
        { status: 403 }
      );
    }

    // Check if toUserId is a member of the group
    const toUserMembership = await db.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: toUserId,
        },
      },
    });

    if (!toUserMembership) {
      return NextResponse.json(
        { error: "The recipient is not a member of this group" },
        { status: 400 }
      );
    }

    // Create the settlement
    const settlement = await db.settlement.create({
      data: {
        groupId,
        fromUserId: session.user.id,
        toUserId,
        amount,
        note: note?.trim() || null,
      },
      include: {
        fromUser: {
          select: { id: true, name: true, email: true },
        },
        toUser: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return NextResponse.json({ settlement }, { status: 201 });
  } catch (error) {
    console.error("Create settlement error:", error);
    return NextResponse.json(
      { error: "Failed to create settlement" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get("groupId");

    const whereClause: {
      groupId?: string;
      OR: [{ fromUserId: string }, { toUserId: string }];
    } = {
      OR: [
        { fromUserId: session.user.id },
        { toUserId: session.user.id },
      ],
    };

    if (groupId) {
      whereClause.groupId = groupId;
    }

    const settlements = await db.settlement.findMany({
      where: whereClause,
      include: {
        fromUser: {
          select: { id: true, name: true, email: true },
        },
        toUser: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ settlements });
  } catch (error) {
    console.error("Get settlements error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settlements" },
      { status: 500 }
    );
  }
}
