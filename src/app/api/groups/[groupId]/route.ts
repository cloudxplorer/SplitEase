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

    // Check if user is a member of this group
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

    const group = await db.group.findUnique({
      where: { id: groupId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
          orderBy: { joinedAt: "asc" },
        },
        creator: {
          select: { id: true, name: true, email: true },
        },
        expenses: {
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
          orderBy: { createdAt: "desc" },
          take: 20,
        },
      },
    });

    if (!group) {
      return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    // Calculate group balances
    const balances: Record<string, number> = {};
    group.members.forEach((m) => {
      balances[m.userId] = 0;
    });

    // For each expense: payer gets +amount, each split person gets -splitAmount
    group.expenses.forEach((expense) => {
      balances[expense.paidById] =
        (balances[expense.paidById] || 0) + expense.amount;
      expense.splits.forEach((split) => {
        balances[split.userId] =
          (balances[split.userId] || 0) - split.amount;
      });
    });

    // Subtract settlements
    const settlements = await db.settlement.findMany({
      where: { groupId },
    });

    settlements.forEach((settlement) => {
      balances[settlement.fromUserId] =
        (balances[settlement.fromUserId] || 0) + settlement.amount;
      balances[settlement.toUserId] =
        (balances[settlement.toUserId] || 0) - settlement.amount;
    });

    // Calculate simplified debts
    const creditors: { userId: string; amount: number }[] = [];
    const debtors: { userId: string; amount: number }[] = [];

    Object.entries(balances).forEach(([userId, balance]) => {
      if (balance > 0.01) {
        creditors.push({ userId, amount: balance });
      } else if (balance < -0.01) {
        debtors.push({ userId, amount: Math.abs(balance) });
      }
    });

    // Sort by amount descending
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    const simplifiedDebts: {
      from: string;
      to: string;
      amount: number;
    }[] = [];

    let i = 0;
    let j = 0;
    while (i < debtors.length && j < creditors.length) {
      const amount = Math.min(debtors[i].amount, creditors[j].amount);
      if (amount > 0.01) {
        simplifiedDebts.push({
          from: debtors[i].userId,
          to: creditors[j].userId,
          amount: Math.round(amount * 100) / 100,
        });
      }
      debtors[i].amount -= amount;
      creditors[j].amount -= amount;
      if (debtors[i].amount < 0.01) i++;
      if (creditors[j].amount < 0.01) j++;
    }

    return NextResponse.json({
      group,
      balances,
      simplifiedDebts,
    });
  } catch (error) {
    console.error("Get group error:", error);
    return NextResponse.json(
      { error: "Failed to fetch group" },
      { status: 500 }
    );
  }
}
