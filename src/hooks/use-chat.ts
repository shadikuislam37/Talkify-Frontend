import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { api, asArray } from "@/lib/api";

export interface Conversation {
  id: string;
  name?: string;
  isGroup?: boolean;
  adminIds?: string[];
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

// --- CONVERSATIONS ---
const useGetConversations = () => {
  return useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await api.get("/conversations");
      return asArray<Conversation>(res);
    },
  });
};

const useCreateOrGetOneToOne = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (targetUserId: string) => {
      // 🌟 ফিক্সড: ব্যাকএন্ডের এন্ডপয়েন্ট /conversations/one-to-one
      const res = await api.post("/conversations/one-to-one", { targetUserId });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

const useCreateGroupChat = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; userIds: string[] }) => {
      const res = await api.post("/conversations/group", data);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

const useAddGroupMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, userIds }: { conversationId: string; userIds: string[] }) => {
      const res = await api.patch(`/conversations/${conversationId}/members`, { userIds });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

const useRemoveGroupMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, targetUserId }: { conversationId: string; targetUserId: string }) => {
      const res = await api.delete(`/conversations/${conversationId}/members/${targetUserId}`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

const useMakeGroupAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, targetUserId }: { conversationId: string; targetUserId: string }) => {
      const res = await api.patch(`/conversations/${conversationId}/admin/${targetUserId}`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

// --- MESSAGES ---
const useGetMessages = (conversationId: string | null) => {
  return useInfiniteQuery({
    queryKey: ["messages", conversationId],
    enabled: !!conversationId,
    queryFn: async ({ pageParam }) => {
      const res = await api.get(`/messages/${conversationId}`, {
        params: { cursor: pageParam },
      });
      return asArray(res);
    },
    getNextPageParam: (lastPage: any) =>
      Array.isArray(lastPage) && lastPage.length ? lastPage[lastPage.length - 1].id : undefined,
    initialPageParam: undefined,
  });
};

const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      body,
      image,
      replyToId,
    }: {
      conversationId: string;
      body?: string;
      image?: string;
      replyToId?: string;
    }) => {
      // 🌟 conversationId বডি এবং ইউআরএল দুটিতেই পাস করা হলো
      const response = await api.post(`/messages/${conversationId}`, {
        conversationId, // 👈 ব্যাকএন্ডের req.body-তে পাওয়ার জন্য
        body,
        image,
        replyToId,
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["messages", variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

const useReactToMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      const res = await api.post(`/messages/${messageId}/react`, { emoji });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });
};

const useDeleteMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (messageId: string) => {
      const res = await api.delete(`/messages/${messageId}`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });
};

// --- USER SEARCH ---
const useSearchUsers = (query: string) => {
  return useQuery({
    queryKey: ["users", "search", query],
    queryFn: async () => {
      if (!query.trim()) return [];
      const res = await api.get(`/users/search?q=${query}`);
      return asArray(res);
    },
    enabled: query.trim().length > 0,
  });
};

export const useChat = {
  useSearchUsers,
  useReactToMessage,
  useSendMessage,
  useGetMessages,
  useCreateGroupChat,
  useAddGroupMember,
  useRemoveGroupMember,
  useMakeGroupAdmin,
  useCreateOrGetOneToOne,
  useGetConversations,
  useDeleteMessage,
};