"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, MessageSquare, Send, Receipt, Calculator } from "lucide-react";
import { toast } from "sonner";
import { useAppStore, type View } from "@/lib/store";

interface ChatMsg {
  id: string;
  message: string;
  createdAt: string;
  user: { id: string; name: string; email: string };
}

interface ExpenseData {
  id: string;
  description: string;
  amount: number;
  currency: string;
  splitType: string;
  createdAt: string;
  paidBy: { id: string; name: string; email: string };
  splits: {
    id: string;
    amount: number;
    percent: number | null;
    shares: number | null;
    user: { id: string; name: string; email: string };
  }[];
  chatMessages: ChatMsg[];
}

const SCALEDRONE_CHANNEL_ID = "ReUM8GKvm3slcVpQ";
const POLL_INTERVAL = 3000; // Poll every 3 seconds as fallback

export function ExpenseDetail({
  expenseId,
  onNavigate,
  onBack,
}: {
  expenseId: string;
  onNavigate: (view: View, id?: string | null) => void;
  onBack: () => void;
}) {
  const { data: session } = useSession();
  const [expense, setExpense] = useState<ExpenseData | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const droneRef = useRef<any>(null);
  const roomRef = useRef<any>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const connectedRef = useRef(false);

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const fetchExpense = useCallback(async () => {
    try {
      const res = await fetch(`/api/expenses/${expenseId}`);
      const data = await res.json();
      if (data.expense) {
        setExpense(data.expense);
        setChatMessages(data.expense.chatMessages || []);
      }
    } catch (err) {
      console.error("Failed to fetch expense:", err);
    } finally {
      setLoading(false);
    }
  }, [expenseId]);

  // Fetch only new chat messages (polling)
  const pollNewMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/expenses/${expenseId}`);
      const data = await res.json();
      if (data.expense?.chatMessages) {
        setChatMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const newMsgs = data.expense.chatMessages.filter(
            (m: ChatMsg) => !existingIds.has(m.id)
          );
          if (newMsgs.length > 0) {
            return [...prev, ...newMsgs];
          }
          return prev;
        });
      }
    } catch {
      // Silently fail polling
    }
  }, [expenseId]);

  useEffect(() => {
    fetchExpense();
  }, [fetchExpense]);

  // Scaledrone real-time chat + polling fallback
  useEffect(() => {
    if (!session?.user?.id || typeof window === "undefined") return;

    // Start polling immediately as a reliable fallback
    pollRef.current = setInterval(pollNewMessages, POLL_INTERVAL);

    const loadScaledrone = () => {
      return new Promise<void>((resolve) => {
        if ((window as any).Scaledrone) {
          resolve();
          return;
        }
        const script = document.createElement("script");
        script.src = "https://cdn.scaledrone.com/scaledrone.min.js";
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => resolve();
        document.head.appendChild(script);
      });
    };

    const connectScaledrone = async () => {
      await loadScaledrone();
      const Scaledrone = (window as any).Scaledrone;
      if (!Scaledrone) {
        console.log("Scaledrone SDK not available, using polling fallback");
        return;
      }

      try {
        const drone = new Scaledrone(SCALEDRONE_CHANNEL_ID);
        droneRef.current = drone;

        drone.on("open", () => {
          connectedRef.current = true;
          const room = drone.subscribe(`expense-${expenseId}`);
          roomRef.current = room;

          room.on("data", (data: any) => {
            if (data && data.type === "chat" && data.message) {
              setChatMessages((prev) => {
                if (prev.some((m) => m.id === data.message.id)) return prev;
                return [...prev, data.message];
              });
            }
          });
        });

        drone.on("error", (error: any) => {
          console.error("Scaledrone error:", error);
          connectedRef.current = false;
        });

        drone.on("close", () => {
          connectedRef.current = false;
        });
      } catch (err) {
        console.error("Failed to connect Scaledrone:", err);
      }
    };

    connectScaledrone();

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      if (droneRef.current) {
        try {
          droneRef.current.close();
        } catch {}
      }
      connectedRef.current = false;
    };
  }, [expenseId, session?.user?.id, pollNewMessages]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    const msg = newMessage.trim();
    setNewMessage("");

    try {
      const res = await fetch(`/api/expenses/${expenseId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to send message");
        setNewMessage(msg);
        return;
      }

      // Publish via Scaledrone for real-time if connected
      if (connectedRef.current && droneRef.current) {
        try {
          droneRef.current.publish({
            room: `expense-${expenseId}`,
            message: {
              type: "chat",
              message: data.chatMessage,
            },
          });
        } catch {}
      }

      // Add to local state immediately
      if (data.chatMessage) {
        setChatMessages((prev) => {
          if (prev.some((m) => m.id === data.chatMessage.id)) return prev;
          return [...prev, data.chatMessage];
        });
      }
    } catch {
      toast.error("Failed to send message");
      setNewMessage(msg);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-10 w-10 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Expense not found</p>
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
            <h1 className="text-lg font-semibold truncate">{expense.description}</h1>
            <p className="text-sm text-muted-foreground">Expense Details</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expense Info */}
          <Card className="border-0 shadow-md shadow-black/5">
            <CardContent className="p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
                    <Receipt className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-2xl sm:text-3xl font-bold">₹{expense.amount.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">
                      Paid by <span className="font-medium text-foreground">{expense.paidBy.name}</span>
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="capitalize">{expense.splitType} split</Badge>
              </div>

              <Separator />

              {/* Splits */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calculator className="h-3.5 w-3.5" />
                  Split Details
                </p>
                {expense.splits.map((split) => {
                  const isCurrentUser = split.user.id === session?.user?.id;
                  return (
                    <div
                      key={split.id}
                      className={`flex items-center justify-between p-2.5 rounded-lg ${
                        isCurrentUser ? "bg-emerald-50" : "bg-muted/30"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarFallback className="text-[9px] bg-emerald-100 text-emerald-700">
                            {getInitials(split.user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium truncate">{split.user.name}</span>
                        {isCurrentUser && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">You</Badge>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold">₹{split.amount.toFixed(2)}</p>
                        {(split.percent !== null || split.shares !== null) && (
                          <p className="text-[10px] text-muted-foreground">
                            {split.percent !== null ? `${split.percent}%` : `${split.shares} shares`}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Chat Section */}
          <Card className="border-0 shadow-md shadow-black/5 flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-emerald-600" />
                Chat
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 flex flex-col">
              <div
                ref={chatContainerRef}
                className="flex-1 min-h-[200px] max-h-[300px] lg:max-h-[500px] overflow-y-auto px-4 pb-3 space-y-3"
              >
                {chatMessages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No messages yet. Start the conversation!
                  </p>
                ) : (
                  chatMessages.map((msg) => {
                    const isMe = msg.user.id === session?.user?.id;
                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}
                      >
                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarFallback className="text-[9px] bg-emerald-100 text-emerald-700">
                            {getInitials(msg.user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`max-w-[75%] ${isMe ? "text-right" : ""}`}>
                          <p className="text-[10px] text-muted-foreground mb-0.5">
                            {isMe ? "You" : msg.user.name}
                          </p>
                          <div
                            className={`inline-block px-3 py-2 rounded-2xl text-sm ${
                              isMe
                                ? "bg-emerald-600 text-white rounded-br-md"
                                : "bg-muted rounded-bl-md"
                            }`}
                          >
                            {msg.message}
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="px-4 pb-4 pt-2 border-t mt-auto">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex gap-2"
                >
                  <Input
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="h-10"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="shrink-0 h-10 w-10 bg-emerald-600 hover:bg-emerald-700 text-white"
                    disabled={!newMessage.trim()}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="mt-auto border-t bg-white/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-sm text-muted-foreground">
          SplitEase — Split Expenses with Friends
        </div>
      </footer>
    </div>
  );
}
