"use client";

import { useSession } from "next-auth/react";
import { AuthPage } from "@/components/auth/auth-page";
import { Dashboard } from "@/components/dashboard/dashboard";
import { GroupDetail } from "@/components/groups/group-detail";
import { ExpenseDetail } from "@/components/expenses/expense-detail";
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";
import { SettleUpDialog } from "@/components/settlements/settle-up-dialog";
import { AddGroupDialog } from "@/components/groups/add-group-dialog";
import { useAppStore } from "@/lib/store";

export default function Home() {
  const { data: session, status } = useSession();
  const { currentView, selectedGroupId, selectedExpenseId, navigate, goBack } = useAppStore();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-muted-foreground font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

  return (
    <>
      {currentView === "dashboard" && (
        <Dashboard onNavigate={navigate} />
      )}
      {currentView === "group" && selectedGroupId && (
        <GroupDetail
          groupId={selectedGroupId}
          onNavigate={navigate}
          onBack={goBack}
        />
      )}
      {currentView === "expense-detail" && selectedExpenseId && (
        <ExpenseDetail
          expenseId={selectedExpenseId}
          onNavigate={navigate}
          onBack={goBack}
        />
      )}
      {currentView === "add-expense" && selectedGroupId && (
        <AddExpenseDialog
          groupId={selectedGroupId}
          onBack={goBack}
        />
      )}
      {currentView === "settle-up" && selectedGroupId && (
        <SettleUpDialog
          groupId={selectedGroupId}
          onBack={goBack}
        />
      )}
      {currentView === "add-group" && (
        <AddGroupDialog onBack={goBack} />
      )}
    </>
  );
}
