"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, Receipt, Calculator } from "lucide-react";
import { toast } from "sonner";

interface GroupMember {
  id: string;
  userId: string;
  role: string;
  user: { id: string; name: string; email: string };
}

interface SplitEntry {
  userId: string;
  name: string;
  amount: number;
  percent: number;
  shares: number;
  included: boolean;
}

export function AddExpenseDialog({
  groupId,
  onBack,
}: {
  groupId: string;
  onBack: () => void;
}) {
  const { data: session } = useSession();
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paidById, setPaidById] = useState("");
  const [splitType, setSplitType] = useState<"equal" | "unequal" | "percent" | "shares">("equal");
  const [splits, setSplits] = useState<SplitEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMembers = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${groupId}`);
      const data = await res.json();
      if (data.group) {
        setMembers(data.group.members);
        setPaidById(session?.user?.id || "");
        setSplits(
          data.group.members.map((m: GroupMember) => ({
            userId: m.user.id,
            name: m.user.name,
            amount: 0,
            percent: 0,
            shares: 1,
            included: true,
          }))
        );
      }
    } catch (err) {
      console.error("Failed to fetch members:", err);
    }
  }, [groupId, session?.user?.id]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const totalAmount = parseFloat(amount) || 0;

  const updateSplit = (userId: string, field: "amount" | "percent" | "shares" | "included", value: number | boolean) => {
    setSplits((prev) =>
      prev.map((s) => (s.userId === userId ? { ...s, [field]: value } : s))
    );
  };

  const toggleAllIncluded = (included: boolean) => {
    setSplits((prev) => prev.map((s) => ({ ...s, included })));
  };

  const totalSplitAmount = splits
    .filter((s) => s.included)
    .reduce((sum, s) => {
      if (splitType === "equal") return sum + totalAmount / splits.filter((s) => s.included).length;
      if (splitType === "unequal") return sum + s.amount;
      if (splitType === "percent") return sum + (totalAmount * s.percent) / 100;
      if (splitType === "shares") {
        const totalShares = splits.filter((s) => s.included).reduce((a, b) => a + b.shares, 0);
        return sum + (totalShares > 0 ? (totalAmount * s.shares) / totalShares : 0);
      }
      return sum;
    }, 0);

  const totalPercent = splits.filter((s) => s.included).reduce((sum, s) => sum + s.percent, 0);

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error("Description is required");
      return;
    }
    if (totalAmount <= 0) {
      toast.error("Amount must be greater than 0");
      return;
    }
    if (!paidById) {
      toast.error("Please select who paid");
      return;
    }

    const includedSplits = splits.filter((s) => s.included);
    if (includedSplits.length === 0) {
      toast.error("At least one person must be included in the split");
      return;
    }

    let expenseSplits: { userId: string; amount?: number; percent?: number; shares?: number }[];

    switch (splitType) {
      case "equal":
        expenseSplits = includedSplits.map((s) => ({ userId: s.userId }));
        break;
      case "unequal":
        expenseSplits = includedSplits.map((s) => ({ userId: s.userId, amount: s.amount }));
        break;
      case "percent":
        if (Math.abs(totalPercent - 100) > 0.01) {
          toast.error(`Percentages must add up to 100% (currently ${totalPercent.toFixed(1)}%)`);
          return;
        }
        expenseSplits = includedSplits.map((s) => ({ userId: s.userId, percent: s.percent }));
        break;
      case "shares":
        expenseSplits = includedSplits.map((s) => ({ userId: s.userId, shares: s.shares }));
        break;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId,
          description: description.trim(),
          amount: totalAmount,
          splitType,
          paidById,
          splits: expenseSplits,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create expense");
        return;
      }
      toast.success("Expense added!");
      onBack();
    } catch {
      toast.error("Failed to create expense");
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
          <h1 className="text-lg font-semibold">Add Expense</h1>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 w-full space-y-5">
        <Card className="border-0 shadow-md shadow-black/5">
          <CardContent className="p-5 sm:p-6 space-y-5">
            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="e.g., Dinner, Uber ride, Groceries"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-11"
              />
            </div>

            {/* Amount */}
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

            {/* Paid By */}
            <div className="space-y-2">
              <Label>Paid by</Label>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => (
                  <Button
                    key={m.user.id}
                    variant={paidById === m.user.id ? "default" : "outline"}
                    size="sm"
                    className={`gap-2 ${paidById === m.user.id ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
                    onClick={() => setPaidById(m.user.id)}
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

            {/* Split Type */}
            <div className="space-y-3">
              <Label>Split Type</Label>
              <Tabs value={splitType} onValueChange={(v) => setSplitType(v as typeof splitType)}>
                <TabsList className="grid w-full grid-cols-4 h-10">
                  <TabsTrigger value="equal" className="text-xs sm:text-sm">Equal</TabsTrigger>
                  <TabsTrigger value="unequal" className="text-xs sm:text-sm">Unequal</TabsTrigger>
                  <TabsTrigger value="percent" className="text-xs sm:text-sm">Percent</TabsTrigger>
                  <TabsTrigger value="shares" className="text-xs sm:text-sm">Shares</TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Split Details */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Included</span>
                  <Button variant="ghost" size="sm" className="text-xs h-6" onClick={() => toggleAllIncluded(true)}>
                    Select all
                  </Button>
                </div>

                {splits.map((split) => (
                  <div key={split.userId} className="flex items-center gap-2 sm:gap-3 p-2 rounded-lg bg-muted/30">
                    <input
                      type="checkbox"
                      checked={split.included}
                      onChange={(e) => updateSplit(split.userId, "included", e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 shrink-0"
                    />
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="text-[9px] bg-emerald-100 text-emerald-700">
                        {getInitials(split.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium flex-1 truncate">{split.name}</span>

                    {splitType === "equal" && split.included && (
                      <span className="text-sm text-muted-foreground shrink-0">
                        ₹{(totalAmount / splits.filter((s) => s.included).length).toFixed(2)}
                      </span>
                    )}
                    {splitType === "unequal" && (
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={split.amount || ""}
                        onChange={(e) => updateSplit(split.userId, "amount", parseFloat(e.target.value) || 0)}
                        className="h-8 w-20 sm:w-24 text-sm"
                        disabled={!split.included}
                      />
                    )}
                    {splitType === "percent" && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          placeholder="0"
                          value={split.percent || ""}
                          onChange={(e) => updateSplit(split.userId, "percent", parseFloat(e.target.value) || 0)}
                          className="h-8 w-16 sm:w-20 text-sm"
                          disabled={!split.included}
                        />
                        <span className="text-xs text-muted-foreground">%</span>
                      </div>
                    )}
                    {splitType === "shares" && (
                      <Input
                        type="number"
                        step="1"
                        min="0"
                        placeholder="1"
                        value={split.shares || ""}
                        onChange={(e) => updateSplit(split.userId, "shares", parseInt(e.target.value) || 0)}
                        className="h-8 w-16 sm:w-20 text-sm"
                        disabled={!split.included}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Split Summary */}
              {totalAmount > 0 && (
                <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total expense</span>
                    <span className="font-medium">₹{totalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {splitType === "percent" ? "Total %" : "Split total"}
                    </span>
                    <span className={`font-medium ${
                      splitType === "percent"
                        ? Math.abs(totalPercent - 100) < 0.01
                          ? "text-emerald-600"
                          : "text-red-500"
                        : Math.abs(totalSplitAmount - totalAmount) < 0.02
                        ? "text-emerald-600"
                        : "text-red-500"
                    }`}>
                      {splitType === "percent"
                        ? `${totalPercent.toFixed(1)}%`
                        : `₹${totalSplitAmount.toFixed(2)}`}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={handleSubmit}
          className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-base"
          disabled={loading}
        >
          {loading ? "Adding..." : "Add Expense"}
          {!loading && <Receipt className="h-5 w-5" />}
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
