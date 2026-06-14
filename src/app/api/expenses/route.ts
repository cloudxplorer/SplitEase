import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

interface SplitInput {
  userId: string;
  amount?: number;
  percent?: number;
  shares?: number;
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { groupId, description, amount, splitType, paidById, splits } =
      body as {
        groupId: string;
        description: string;
        amount: number;
        splitType: "equal" | "unequal" | "percent" | "shares";
        paidById: string;
        splits: SplitInput[];
      };

    // Validation
    if (!groupId || typeof groupId !== "string") {
      return NextResponse.json(
        { error: "groupId is required" },
        { status: 400 }
      );
    }

    if (!description || typeof description !== "string") {
      return NextResponse.json(
        { error: "description is required" },
        { status: 400 }
      );
    }

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "amount must be a positive number" },
        { status: 400 }
      );
    }

    if (!splitType || !["equal", "unequal", "percent", "shares"].includes(splitType)) {
      return NextResponse.json(
        { error: "splitType must be one of: equal, unequal, percent, shares" },
        { status: 400 }
      );
    }

    if (!paidById || typeof paidById !== "string") {
      return NextResponse.json(
        { error: "paidById is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(splits) || splits.length === 0) {
      return NextResponse.json(
        { error: "splits must be a non-empty array" },
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

    // Verify paidById is a group member
    const payerMembership = await db.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId: paidById,
        },
      },
    });

    if (!payerMembership) {
      return NextResponse.json(
        { error: "The payer is not a member of this group" },
        { status: 400 }
      );
    }

    // Calculate split amounts based on splitType
    let calculatedSplits: { userId: string; amount: number; percent: number | null; shares: number | null }[];

    switch (splitType) {
      case "equal": {
        const splitAmount = Math.round((amount / splits.length) * 100) / 100;
        calculatedSplits = splits.map((s) => ({
          userId: s.userId,
          amount: splitAmount,
          percent: null,
          shares: null,
        }));
        // Adjust for rounding: add remainder to first split
        const totalSplit = splitAmount * splits.length;
        const remainder = Math.round((amount - totalSplit) * 100) / 100;
        if (remainder !== 0 && calculatedSplits.length > 0) {
          calculatedSplits[0].amount =
            Math.round((calculatedSplits[0].amount + remainder) * 100) / 100;
        }
        break;
      }

      case "unequal": {
        calculatedSplits = splits.map((s) => ({
          userId: s.userId,
          amount: s.amount ?? 0,
          percent: null,
          shares: null,
        }));
        break;
      }

      case "percent": {
        calculatedSplits = splits.map((s) => {
          const pct = s.percent ?? 0;
          return {
            userId: s.userId,
            amount: Math.round((amount * pct) / 100 * 100) / 100,
            percent: pct,
            shares: null,
          };
        });
        break;
      }

      case "shares": {
        const totalShares = splits.reduce((sum, s) => sum + (s.shares ?? 0), 0);
        if (totalShares === 0) {
          return NextResponse.json(
            { error: "Total shares cannot be zero" },
            { status: 400 }
          );
        }
        calculatedSplits = splits.map((s) => {
          const sh = s.shares ?? 0;
          return {
            userId: s.userId,
            amount: Math.round((amount * sh) / totalShares * 100) / 100,
            percent: null,
            shares: sh,
          };
        });
        // Adjust for rounding
        const totalFromShares = calculatedSplits.reduce((sum, s) => sum + s.amount, 0);
        const sharesRemainder = Math.round((amount - totalFromShares) * 100) / 100;
        if (sharesRemainder !== 0 && calculatedSplits.length > 0) {
          calculatedSplits[0].amount =
            Math.round((calculatedSplits[0].amount + sharesRemainder) * 100) / 100;
        }
        break;
      }

      default:
        return NextResponse.json(
          { error: "Invalid splitType" },
          { status: 400 }
        );
    }

    // Validate that splits sum equals total amount (within 0.01 tolerance)
    const totalSplitAmount = calculatedSplits.reduce(
      (sum, s) => sum + s.amount,
      0
    );
    if (Math.abs(totalSplitAmount - amount) > 0.01) {
      return NextResponse.json(
        {
          error: `Split amounts (${totalSplitAmount}) do not equal the total amount (${amount})`,
        },
        { status: 400 }
      );
    }

    // Verify all split users are group members
    const splitUserIds = calculatedSplits.map((s) => s.userId);
    const groupMembers = await db.groupMember.findMany({
      where: { groupId },
      select: { userId: true },
    });
    const groupMemberIds = new Set(groupMembers.map((m) => m.userId));

    for (const userId of splitUserIds) {
      if (!groupMemberIds.has(userId)) {
        return NextResponse.json(
          { error: `User ${userId} is not a member of this group` },
          { status: 400 }
        );
      }
    }

    // Create expense and splits in a transaction
    const expense = await db.$transaction(async (tx) => {
      const newExpense = await tx.expense.create({
        data: {
          groupId,
          description: description.trim(),
          amount,
          splitType,
          paidById,
          splits: {
            create: calculatedSplits.map((s) => ({
              userId: s.userId,
              amount: s.amount,
              percent: s.percent,
              shares: s.shares,
            })),
          },
        },
        include: {
          paidBy: {
            select: { id: true, name: true, email: true },
          },
          splits: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      });

      return newExpense;
    });

    return NextResponse.json({ expense }, { status: 201 });
  } catch (error) {
    console.error("Create expense error:", error);
    return NextResponse.json(
      { error: "Failed to create expense" },
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

    if (!groupId) {
      return NextResponse.json(
        { error: "groupId query parameter is required" },
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

    const expenses = await db.expense.findMany({
      where: { groupId },
      include: {
        paidBy: {
          select: { id: true, name: true, email: true },
        },
        splits: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        _count: {
          select: { chatMessages: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const expensesWithMessageCount = expenses.map((expense) => {
      const { _count, ...expenseData } = expense;
      return {
        ...expenseData,
        chatMessageCount: _count.chatMessages,
      };
    });

    return NextResponse.json({ expenses: expensesWithMessageCount });
  } catch (error) {
    console.error("Get expenses error:", error);
    return NextResponse.json(
      { error: "Failed to fetch expenses" },
      { status: 500 }
    );
  }
}
