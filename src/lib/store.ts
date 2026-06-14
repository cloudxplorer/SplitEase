import { create } from "zustand";

export type View =
  | "dashboard"
  | "group"
  | "expense-detail"
  | "add-expense"
  | "settle-up"
  | "add-group";

interface AppState {
  currentView: View;
  selectedGroupId: string | null;
  selectedExpenseId: string | null;
  navigate: (view: View, id?: string | null) => void;
  goBack: () => void;
  viewHistory: { view: View; groupId: string | null; expenseId: string | null }[];
}

export const useAppStore = create<AppState>((set, get) => ({
  currentView: "dashboard",
  selectedGroupId: null,
  selectedExpenseId: null,
  viewHistory: [],
  navigate: (view, id = null) => {
    const state = get();
    set({
      viewHistory: [
        ...state.viewHistory,
        {
          view: state.currentView,
          groupId: state.selectedGroupId,
          expenseId: state.selectedExpenseId,
        },
      ],
      currentView: view,
      ...(view === "group" ? { selectedGroupId: id } : {}),
      ...(view === "expense-detail" ? { selectedExpenseId: id } : {}),
      ...(view === "add-expense" ? { selectedGroupId: id || state.selectedGroupId } : {}),
      ...(view === "settle-up" ? { selectedGroupId: id || state.selectedGroupId } : {}),
    });
  },
  goBack: () => {
    const state = get();
    const lastView = state.viewHistory[state.viewHistory.length - 1];
    if (lastView) {
      set({
        currentView: lastView.view,
        selectedGroupId: lastView.groupId,
        selectedExpenseId: lastView.expenseId,
        viewHistory: state.viewHistory.slice(0, -1),
      });
    } else {
      set({ currentView: "dashboard", selectedGroupId: null, selectedExpenseId: null });
    }
  },
}));
