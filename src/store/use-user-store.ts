import { create } from "zustand";

interface UserState {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedUserId: string | null;
  setSelectedUserId: (id: string | null) => void;
}

export const useUserStore = create<UserState>((set) => ({
  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query }),
  selectedUserId: null,
  setSelectedUserId: (id) => set({ selectedUserId: id }),
}));