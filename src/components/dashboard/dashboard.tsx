"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession, signOut } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  LogOut,
  User,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { useAppStore, type View } from "@/lib/store";

interface GroupData {
  id: string;
  name: string;
  description: string | null;
  members: { user: { id: string; name: string; email: string } }[];
  expenseCount: number;
  totalExpenses: number;
}

interface BalanceData {
  totalOwed: number;
  totalOwing: number;
  netBalance: number;
  groupBalances: {
    groupId: string;
    groupName: string;
    owed: number;
    owing: number;
    netBalance: number;
    members: { user: { id: string; name: string; email: string } }[];
  }[];
}

export function Dashboard({ onNavigate }: { onNavigate: (view: View, id?: string | null) => void }) {
  const { data: session } = useSession();
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [balances, setBalances] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [groupsRes, balancesRes] = await Promise.all([
        fetch("/api/groups"),
        fetch("/api/balances"),
      ]);
      const groupsData = await groupsRes.json();
      const balancesData = await balancesRes.json();

      if (groupsData.groups) setGroups(groupsData.groups);
      if (balancesData.totalOwed !== undefined) setBalances(balancesData);
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-muted-foreground font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50/50 via-white to-teal-50/50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-emerald-600 rounded-xl flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">SplitEase</h1>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => onNavigate("add-group")}
              className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 gap-2"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">New Group</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9 bg-emerald-100 text-emerald-700">
                    <AvatarFallback className="bg-emerald-100 text-emerald-700 text-sm font-semibold">
                      {session?.user?.name ? getInitials(session.user.name) : "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{session?.user?.name}</p>
                  <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
                </div>
                <Separator />
                <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 lg:space-y-8 w-full">
        {/* Balance Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-0 shadow-md shadow-black/5 bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-emerald-200" />
                <p className="text-emerald-100 text-sm font-medium">You are owed</p>
              </div>
              <p className="text-2xl sm:text-3xl font-bold">₹{balances?.totalOwed.toFixed(2) || "0.00"}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md shadow-black/5 bg-gradient-to-br from-orange-500 to-red-500 text-white">
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-4 w-4 text-orange-200" />
                <p className="text-orange-100 text-sm font-medium">You owe</p>
              </div>
              <p className="text-2xl sm:text-3xl font-bold">₹{balances?.totalOwing.toFixed(2) || "0.00"}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-md shadow-black/5">
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-center gap-2 mb-2">
                {(balances?.netBalance ?? 0) > 0 ? (
                  <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                ) : (balances?.netBalance ?? 0) < 0 ? (
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
                ) : (
                  <Minus className="h-4 w-4 text-muted-foreground" />
                )}
                <p className="text-muted-foreground text-sm font-medium">Net balance</p>
              </div>
              <p className={`text-2xl sm:text-3xl font-bold ${
                (balances?.netBalance ?? 0) > 0 ? "text-emerald-600" : (balances?.netBalance ?? 0) < 0 ? "text-red-500" : ""
              }`}>
                ₹{(balances?.netBalance ?? 0) >= 0 ? "+" : ""}{balances?.netBalance.toFixed(2) || "0.00"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content: Groups + Balance Summary side-by-side on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Groups */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Your Groups</h2>
              <Button variant="outline" size="sm" onClick={() => onNavigate("add-group")} className="gap-2">
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">New Group</span>
              </Button>
            </div>

            {groups.length === 0 ? (
              <Card className="border-dashed border-2">
                <CardContent className="py-12 flex flex-col items-center gap-4">
                  <div className="h-16 w-16 bg-emerald-50 rounded-2xl flex items-center justify-center">
                    <Users className="h-8 w-8 text-emerald-400" />
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold text-lg">No groups yet</h3>
                    <p className="text-muted-foreground text-sm mt-1">Create a group to start splitting expenses</p>
                  </div>
                  <Button onClick={() => onNavigate("add-group")} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
                    <Plus className="h-4 w-4" />
                    Create Your First Group
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {groups.map((group) => {
                  const groupBalance = balances?.groupBalances?.find(
                    (b) => b.groupId === group.id
                  );
                  return (
                    <Card
                      key={group.id}
                      className="border-0 shadow-sm shadow-black/5 hover:shadow-md transition-shadow cursor-pointer group"
                      onClick={() => onNavigate("group", group.id)}
                    >
                      <CardContent className="p-4 sm:p-5 flex items-center justify-between">
                        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                          <div className="h-10 sm:h-12 w-10 sm:w-12 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
                            <Users className="h-5 sm:h-6 w-5 sm:w-6 text-emerald-600" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold truncate">{group.name}</h3>
                            <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                              <span>{group.members.length} members</span>
                              <span>·</span>
                              <span>{group.expenseCount} expenses</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                          {groupBalance && groupBalance.netBalance !== 0 && (
                            <div className="text-right hidden sm:block">
                              <p className={`text-sm font-semibold ${
                                groupBalance.netBalance > 0 ? "text-emerald-600" : "text-red-500"
                              }`}>
                                {groupBalance.netBalance > 0 ? "+" : ""}₹{groupBalance.netBalance.toFixed(2)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {groupBalance.netBalance > 0 ? "you're owed" : "you owe"}
                              </p>
                            </div>
                          )}
                          <div className="flex -space-x-2">
                            {group.members.slice(0, 3).map((m) => (
                              <Avatar key={m.user.id} className="h-7 w-7 border-2 border-white">
                                <AvatarFallback className="text-[10px] bg-emerald-100 text-emerald-700">
                                  {getInitials(m.user.name)}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                            {group.members.length > 3 && (
                              <Badge variant="secondary" className="h-7 w-7 rounded-full p-0 flex items-center justify-center text-[10px]">
                                +{group.members.length - 3}
                              </Badge>
                            )}
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-emerald-600 transition-colors" />
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Balance Summary Sidebar */}
          <div className="lg:col-span-1">
            {balances?.groupBalances && balances.groupBalances.length > 0 ? (
              <>
                <h2 className="text-lg font-semibold mb-4">Balance Summary</h2>
                <Card className="border-0 shadow-sm shadow-black/5">
                  <CardContent className="p-0">
                    {balances.groupBalances.map((gb, i) => (
                      <div key={gb.groupId}>
                        {i > 0 && <Separator />}
                        <div className="px-4 py-3 flex items-center justify-between">
                          <span className="font-medium text-sm truncate mr-2">{gb.groupName}</span>
                          <span className={`text-sm font-semibold shrink-0 ${
                            gb.netBalance > 0 ? "text-emerald-600" : gb.netBalance < 0 ? "text-red-500" : "text-muted-foreground"
                          }`}>
                            {gb.netBalance > 0 ? "+" : ""}₹{gb.netBalance.toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="border-dashed border-2 hidden lg:block">
                <CardContent className="py-10 flex flex-col items-center gap-3">
                  <Minus className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-muted-foreground text-sm text-center">No balances yet</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t bg-white/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-sm text-muted-foreground">
          SplitEase — Split Expenses with Friends
        </div>
      </footer>
    </div>
  );
}
