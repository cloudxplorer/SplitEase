import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get all groups the user is a member of
    const userGroups = await db.groupMember.findMany({
      where: { userId },
      select: { groupId: true },
    });

    const groupIds = userGroups.map((g) => g.groupId);

    if (groupIds.length === 0) {
      return NextResponse.json({
        totalOwed: 0,
        totalOwing: 0,
        netBalance: 0,
        groupBalances: [],
      });
    }

    // Get all expenses across all user's groups
    const expenses = await db.expense.findMany({
      where: { groupId: { in: groupIds } },
      include: { splits: true },
    });

    // Get all settlements across all user's groups
    const settlements = await db.settlement.findMany({
      where: { groupId: { in: groupIds } },
    });

    // Calculate balance per group
    const groupBalanceMap: Record<
      string,
      { totalOwed: number; totalOwing: number }
    > = {};

    for (const groupId of groupIds) {
      groupBalanceMap[groupId] = { totalOwed: 0, totalOwing: 0 };
    }

    // Process expenses
    expenses.forEach((expense) => {
      // If user paid, they are owed
      if (expense.paidById === userId) {
        groupBalanceMap[expense.groupId].totalOwed += expense.amount;
      }
      // If user has a split, they owe
      const userSplit = expense.splits.find((s) => s.userId === userId);
      if (userSplit) {
        groupBalanceMap[expense.groupId].totalOwing += userSplit.amount;
      }
    });

    // Process settlements
    settlements.forEach((settlement) => {
      if (settlement.fromUserId === userId) {
        // User paid a settlement - reduces what they owe
        groupBalanceMap[settlement.groupId].totalOwing -= settlement.amount;
      }
      if (settlement.toUserId === userId) {
        // User received a settlement - reduces what they are owed
        groupBalanceMap[settlement.groupId].totalOwed -= settlement.amount;
      }
    });

    // Get group details
    const groups = await db.group.findMany({
      where: { id: { in: groupIds } },
      select: {
        id: true,
        name: true,
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    const groupBalances = groups.map((group) => {
      const balance = groupBalanceMap[group.id];
      const net = Math.round((balance.totalOwed - balance.totalOwing) * 100) / 100;
      return {
        groupId: group.id,
        groupName: group.name,
        owed: Math.round(balance.totalOwed * 100) / 100,
        owing: Math.round(balance.totalOwing * 100) / 100,
        netBalance: net,
        members: group.members,
      };
    });

    const totalOwed = Math.round(
      Object.values(groupBalanceMap).reduce((sum, b) => sum + b.totalOwed, 0) * 100
    ) / 100;
    const totalOwing = Math.round(
      Object.values(groupBalanceMap).reduce((sum, b) => sum + b.totalOwing, 0) * 100
    ) / 100;
    const netBalance = Math.round((totalOwed - totalOwing) * 100) / 100;

    return NextResponse.json({
      totalOwed,
      totalOwing,
      netBalance,
      groupBalances,
    });
  } catch (error) {
    console.error("Get balances error:", error);
    return NextResponse.json(
      { error: "Failed to fetch balances" },
      { status: 500 }
    );
  }
}
