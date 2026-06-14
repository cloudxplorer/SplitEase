"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Users,
  Receipt,
  HandCoins,
  UserPlus,
  UserMinus,
  MoreVertical,
  MessageSquare,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useAppStore, type View } from "@/lib/store";

interface GroupDetailData {
  id: string;
  name: string;
  description: string | null;
  createdBy: string;
  members: {
    id: string;
    userId: string;
    role: string;
    user: { id: string; name: string; email: string };
  }[];
  expenses: {
    id: string;
    description: string;
    amount: number;
    splitType: string;
    createdAt: string;
    paidBy: { id: string; name: string };
  }[];
}

interface GroupBalanceData {
  groupId: string;
  simplifiedDebts: { from: string; fromName: string; to: string; toName: string; amount: number }[];
  memberBalances: { userId: string; name: string; balance: number }[];
  yourBalance: number;
}

interface Settlement {
  id: string;
  amount: number;
  note: string | null;
  createdAt: string;
  fromUser: { id: string; name: string; email: string };
  toUser: { id: string; name: string; email: string };
}

export function GroupDetail({
  groupId,
  onNavigate,
  onBack,
}: {
  groupId: string;
  onNavigate: (view: View, id?: string | null) => void;
  onBack: () => void;
}) {
  const { data: session } = useSession();
  const [group, setGroup] = useState<GroupDetailData | null>(null);
  const [balance, setBalance] = useState<GroupBalanceData | null>(null);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [addMemberEmail, setAddMemberEmail] = useState("");
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  const fetchGroup = useCallback(async () => {
    try {
      const [groupRes, balanceRes, settlementsRes] = await Promise.all([
        fetch(`/api/groups/${groupId}`),
        fetch(`/api/balances/${groupId}`),
        fetch(`/api/settlements?groupId=${groupId}`),
      ]);
      const groupData = await groupRes.json();
      const balanceData = await balanceRes.json();
      const settlementsData = await settlementsRes.json();

      if (groupData.group) setGroup(groupData.group);
      if (balanceData.simplifiedDebts) setBalance(balanceData);
      if (settlementsData.settlements) setSettlements(settlementsData.settlements);
    } catch (err) {
      console.error("Failed to fetch group:", err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

  const handleAddMember = async () => {
    if (!addMemberEmail.trim()) return;
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addMemberEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      toast.success("Member added!");
      setAddMemberEmail("");
      setAddMemberOpen(false);
      fetchGroup();
    } catch {
      toast.error("Failed to add member");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      toast.success("Member removed");
      fetchGroup();
    } catch {
      toast.error("Failed to remove member");
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    try {
      const res = await fetch(`/api/expenses/${expenseId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error);
        return;
      }
      toast.success("Expense deleted");
      fetchGroup();
    } catch {
      toast.error("Failed to delete expense");
    }
  };

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const isAdmin = group?.members.find((m) => m.user.id === session?.user?.id)?.role === "admin";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-10 w-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Group not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold truncate">{group.name}</h1>
            <p className="text-sm text-muted-foreground">{group.members.length} members</p>
          </div>
          <Button
            onClick={() => onNavigate("add-expense", groupId)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 gap-2"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Expense</span>
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 w-full">
        <Tabs defaultValue="expenses" className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-11 max-w-md">
            <TabsTrigger value="expenses" className="gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <Receipt className="h-4 w-4" />
              Expenses
            </TabsTrigger>
            <TabsTrigger value="balances" className="gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <HandCoins className="h-4 w-4" />
              Balances
            </TabsTrigger>
            <TabsTrigger value="members" className="gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <Users className="h-4 w-4" />
              Members
            </TabsTrigger>
          </TabsList>

          {/* Expenses Tab */}
          <TabsContent value="expenses" className="mt-4 sm:mt-6 space-y-3">
            {group.expenses.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="py-10 flex flex-col items-center gap-3">
                  <Receipt className="h-10 w-10 text-muted-foreground/40" />
                  <p className="text-muted-foreground">No expenses yet</p>
                  <Button onClick={() => onNavigate("add-expense", groupId)} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                    <Plus className="h-4 w-4" />
                    Add First Expense
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {group.expenses.map((expense) => (
                  <Card
                    key={expense.id}
                    className="border-0 shadow-sm shadow-black/5 hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => onNavigate("expense-detail", expense.id)}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 bg-emerald-50 rounded-lg flex items-center justify-center shrink-0">
                          <Receipt className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{expense.description}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Paid by {expense.paidBy.name} · {new Date(expense.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        <div className="text-right">
                          <p className="font-semibold text-sm sm:text-base">₹{expense.amount.toFixed(2)}</p>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            {expense.splitType}
                          </Badge>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteExpense(expense.id);
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Balances Tab */}
          <TabsContent value="balances" className="mt-4 sm:mt-6 space-y-4">
            {balance?.simplifiedDebts && balance.simplifiedDebts.length > 0 ? (
              <>
                <Card className="border-0 shadow-sm shadow-black/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Simplified Debts</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {balance.simplifiedDebts.map((debt, i) => (
                      <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-[10px] bg-red-100 text-red-700">
                              {getInitials(debt.fromName)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">{debt.fromName}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm font-semibold text-red-500">₹{debt.amount.toFixed(2)}</span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm font-medium">{debt.toName}</span>
                          <Avatar className="h-7 w-7">
                            <AvatarFallback className="text-[10px] bg-emerald-100 text-emerald-700">
                              {getInitials(debt.toName)}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Button
                  onClick={() => onNavigate("settle-up", groupId)}
                  className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                >
                  <HandCoins className="h-4 w-4" />
                  Settle Up
                </Button>
              </>
            ) : (
              <Card className="border-dashed border-2">
                <CardContent className="py-10 flex flex-col items-center gap-3">
                  <HandCoins className="h-10 w-10 text-muted-foreground/40" />
                  <p className="text-muted-foreground">All settled up! No outstanding debts.</p>
                </CardContent>
              </Card>
            )}

            {/* Settlements History */}
            {settlements.length > 0 && (
              <Card className="border-0 shadow-sm shadow-black/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Settlement History</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {settlements.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50">
                      <div className="text-sm">
                        <span className="font-medium">{s.fromUser.name}</span>
                        <span className="text-muted-foreground"> paid </span>
                        <span className="font-medium">{s.toUser.name}</span>
                      </div>
                      <span className="font-semibold text-emerald-600">₹{s.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="mt-4 sm:mt-6 space-y-3">
            <div className="flex justify-end">
              <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <UserPlus className="h-3.5 w-3.5" />
                    Add Member
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Member to Group</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <Input
                      placeholder="Enter email address"
                      type="email"
                      value={addMemberEmail}
                      onChange={(e) => setAddMemberEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
                    />
                    <Button onClick={handleAddMember} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                      Add Member
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {group.members.map((member) => (
                <Card key={member.id} className="border-0 shadow-sm shadow-black/5">
                  <CardContent className="p-3 sm:p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-10 w-10 shrink-0">
                        <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm">
                          {getInitials(member.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{member.user.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{member.user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={member.role === "admin" ? "default" : "secondary"} className="text-xs">
                        {member.role}
                      </Badge>
                      {isAdmin && member.role !== "admin" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveMember(member.user.id)}
                        >
                          <UserMinus className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <footer className="mt-auto border-t bg-white/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-sm text-muted-foreground">
          SplitEase — Split Expenses with Friends
        </div>
      </footer>
    </div>
  );
}
