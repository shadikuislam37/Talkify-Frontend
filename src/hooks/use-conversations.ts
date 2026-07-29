// hooks/use-conversations.ts
import { useQuery } from "@tanstack/react-query";
import { api, asArray } from "@/lib/api";

export interface Conversation {
  id: string;
  updatedAt: string;
  users: {
    id: string;
    name: string;
    image?: string | null;
  }[];
  messages?: {
    body?: string | null;
    image?: string | null;
    createdAt: string;
  }[];
}

export function useConversations() {
  return useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await api.get<any>("/conversations");
return asArray<Conversation>(res.data);
    },
  });
}