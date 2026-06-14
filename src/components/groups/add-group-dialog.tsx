"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, X, Users } from "lucide-react";
import { toast } from "sonner";

export function AddGroupDialog({ onBack }: { onBack: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [memberEmails, setMemberEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [loading, setLoading] = useState(false);

  const addEmail = () => {
    const email = emailInput.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }
    if (memberEmails.includes(email)) {
      toast.error("Email already added");
      return;
    }
    setMemberEmails([...memberEmails, email]);
    setEmailInput("");
  };

  const removeEmail = (email: string) => {
    setMemberEmails(memberEmails.filter((e) => e !== email));
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Group name is required");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          memberEmails,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create group");
        return;
      }
      toast.success("Group created!");
      onBack();
    } catch {
      toast.error("Failed to create group");
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
          <h1 className="text-lg font-semibold">Create New Group</h1>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 w-full space-y-6">
        <Card className="border-0 shadow-md shadow-black/5">
          <CardContent className="p-5 sm:p-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="group-name">Group Name</Label>
              <Input
                id="group-name"
                placeholder="e.g., Trip to Goa, House Expenses"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="group-desc">Description (optional)</Label>
              <Textarea
                id="group-desc"
                placeholder="What's this group about?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Add Members by Email</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="friend@example.com"
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addEmail())}
                  className="h-11"
                />
                <Button type="button" onClick={addEmail} variant="outline" className="shrink-0 h-11 px-4">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {memberEmails.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {memberEmails.map((email) => (
                    <div
                      key={email}
                      className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full text-sm"
                    >
                      <span>{email}</span>
                      <button onClick={() => removeEmail(email)} className="hover:text-emerald-900">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Button
          onClick={handleCreate}
          className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white gap-2 text-base"
          disabled={loading}
        >
          {loading ? "Creating..." : "Create Group"}
          {!loading && <Users className="h-5 w-5" />}
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
