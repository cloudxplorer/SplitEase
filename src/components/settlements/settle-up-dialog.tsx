"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, HandCoins, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface GroupBalanceData {
  groupId: string;
  simplifiedDebts: {
    from: string;
    fromName: string;
    to: string;
    toName: string;
    amount: number;
  }[];
  memberBalances: {
    userId: string;
    name: string;
    balance: number;
  }[];
  yourBalance: number;
}

interface GroupMember {
  id: string;
  userId: string;
  role: string;
  user: { id: string; name: string; email: string };
}

export function SettleUpDialog({
  groupId,
  onBack,
}: {
  groupId: string;
  onBack: () => void;
}) {
  const { data: session } = useSession();
  const [balance, setBalance] = useState<GroupBalanceData | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [selectedToUserId, setSelectedToUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const fetchData = useCallback(async () => {
    try {
      const [balanceRes, groupRes] = await Promise.all([
        fetch(`/api/balances/${groupId}`),
        fetch(`/api/groups/${groupId}`),
      ]);
      const balanceData = await balanceRes.json();
      const groupData = await groupRes.json();

      if (balanceData.simplifiedDebts) setBalance(balanceData);
      if (groupData.group) setMembers(groupData.group.members);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    }
  }, [groupId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const myDebts = balance?.simplifiedDebts.filter(
    (d) => d.from === session?.user?.id
  ) || [];

  const handleSettle = async () => {
    if (!selectedToUserId) {
      toast.error("Please select who you're paying");
      return;
    }
    const settleAmount = parseFloat(amount);
    if (!settleAmount || settleAmount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          toUserId: selectedToUserId,
          amount: settleAmount,
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to record settlement");
        return;
      }
      toast.success("Settlement recorded!");
      onBack();
    } catch {
      toast.error("Failed to record settlement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Settle Up</h1>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 w-full space-y-5">
        {/* Quick Settle - Suggested Debts */}
        {myDebts.length > 0 && (
          <Card className="border-0 shadow-md shadow-black/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Suggested Settlements</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {myDebts.map((debt, i) => (
                <button
                  key={i}
                  className="w-full p-3 rounded-lg bg-muted/30 hover:bg-emerald-50 transition-colors text-left"
                  onClick={() => {
                    setSelectedToUserId(debt.to);
                    setAmount(debt.amount.toFixed(2));
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-7 w-7">
                        <AvatarFallback className="text-[9px] bg-emerald-100 text-emerald-700">
                          {getInitials(debt.toName)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{debt.toName}</span>
                    </div>
                    <span className="text-sm font-semibold text-red-500">
                      ₹{debt.amount.toFixed(2)}
                    </span>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Manual Settlement */}
        <Card className="border-0 shadow-md shadow-black/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Record a Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="text-[10px] bg-emerald-200 text-emerald-700">
                  {session?.user?.name ? getInitials(session.user.name) : "Y"}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium text-sm">You</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
              {selectedToUserId ? (
                <div className="flex items-center gap-2 min-w-0">
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarFallback className="text-[10px] bg-emerald-200 text-emerald-700">
                      {getInitials(members.find((m) => m.user.id === selectedToUserId)?.user.name || "")}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-sm truncate">
                    {members.find((m) => m.user.id === selectedToUserId)?.user.name}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Select person</span>
              )}
            </div>

            <div className="space-y-2">
              <Label>Pay to</Label>
              <div className="flex flex-wrap gap-2">
                {members
                  .filter((m) => m.user.id !== session?.user?.id)
                  .map((m) => (
                    <Button
                      key={m.user.id}
                      variant={selectedToUserId === m.user.id ? "default" : "outline"}
                      size="sm"
                      className={`gap-2 ${
                        selectedToUserId === m.user.id
                          ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                          : ""
                      }`}
                      onClick={() => setSelectedToUserId(m.user.id)}
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarFallback className="text-[8px] bg-emerald-100 text-emerald-700">
                          {getInitials(m.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      {m.user.name.split(" ")[0]}
                    </Button>
                  ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₹</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-11 pl-7 text-lg font-semibold"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Note (optional)</Label>
                <Textarea
                  placeholder="What's this payment for?"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={1}
                  className="h-11 resize-none"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={handleSettle}
          className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-base"
          disabled={loading || !selectedToUserId || !amount}
        >
          {loading ? "Recording..." : "Record Settlement"}
          {!loading && <HandCoins className="h-5 w-5" />}
        </Button>
      </main>

      <footer className="mt-auto border-t bg-white/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-sm text-muted-foreground">
          SplitEase — Split Expenses with Friends
        </div>
      </footer>
    </div>
  );
}
