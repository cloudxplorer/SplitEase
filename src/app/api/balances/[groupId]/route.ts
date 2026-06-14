import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { groupId } = await params;

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

    // Get all group members
    const groupMembers = await db.groupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Get all expenses for the group
    const expenses = await db.expense.findMany({
      where: { groupId },
      include: { splits: true },
    });

    // Get all settlements for the group
    const settlements = await db.settlement.findMany({
      where: { groupId },
    });

    // Initialize balances for all members
    const balances: Record<string, number> = {};
    groupMembers.forEach((m) => {
      balances[m.userId] = 0;
    });

    // Process expenses: payer gets +amount, each split person gets -splitAmount
    expenses.forEach((expense) => {
      balances[expense.paidById] =
        (balances[expense.paidById] || 0) + expense.amount;
      expense.splits.forEach((split) => {
        balances[split.userId] =
          (balances[split.userId] || 0) - split.amount;
      });
    });

    // Process settlements: payer's balance increases, receiver's balance decreases
    settlements.forEach((settlement) => {
      balances[settlement.fromUserId] =
        (balances[settlement.fromUserId] || 0) + settlement.amount;
      balances[settlement.toUserId] =
        (balances[settlement.toUserId] || 0) - settlement.amount;
    });

    // Round balances
    Object.keys(balances).forEach((userId) => {
      balances[userId] = Math.round(balances[userId] * 100) / 100;
    });

    // Calculate simplified debts using greedy algorithm
    const creditors: { userId: string; amount: number }[] = [];
    const debtors: { userId: string; amount: number }[] = [];

    Object.entries(balances).forEach(([userId, balance]) => {
      if (balance > 0.01) {
        creditors.push({ userId, amount: balance });
      } else if (balance < -0.01) {
        debtors.push({ userId, amount: Math.abs(balance) });
      }
    });

    // Sort by amount descending for better matching
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    const simplifiedDebts: {
      from: string;
      fromName: string;
      to: string;
      toName: string;
      amount: number;
    }[] = [];

    let i = 0;
    let j = 0;
    while (i < debtors.length && j < creditors.length) {
      const amount = Math.min(debtors[i].amount, creditors[j].amount);
      if (amount > 0.01) {
        const fromUser = groupMembers.find(
          (m) => m.userId === debtors[i].userId
        );
        const toUser = groupMembers.find(
          (m) => m.userId === creditors[j].userId
        );
        simplifiedDebts.push({
          from: debtors[i].userId,
          fromName: fromUser?.user.name || "Unknown",
          to: creditors[j].userId,
          toName: toUser?.user.name || "Unknown",
          amount: Math.round(amount * 100) / 100,
        });
      }
      debtors[i].amount -= amount;
      creditors[j].amount -= amount;
      if (debtors[i].amount < 0.01) i++;
      if (creditors[j].amount < 0.01) j++;
    }

    // Build member balance details
    const memberBalances = groupMembers.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      email: m.user.email,
      role: m.role,
      balance: balances[m.userId] || 0,
    }));

    // Current user's specific balance in this group
    const userBalance = balances[session.user.id] || 0;

    return NextResponse.json({
      groupId,
      memberBalances,
      simplifiedDebts,
      yourBalance: Math.round(userBalance * 100) / 100,
    });
  } catch (error) {
    console.error("Get group balance error:", error);
    return NextResponse.json(
      { error: "Failed to fetch group balance" },
      { status: 500 }
    );
  }
}
