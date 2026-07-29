import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from "@tanstack/react-query";
import { api, asArray } from "@/lib/api"; // Your Fixed Axios Instance
import { Conversation } from "@/components/chat/chat-sidebar";

// --- CONVERSATIONS ---
const useGetConversations = () => {
  return useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await api.get("/conversations");
      console.log("Raw Conversations API Response:", res);
      return asArray<Conversation>(res);
    },
  });
};

const useCreateOrGetOneToOne = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (targetUserId: string) => {
      const res = await api.post("/conversations", { targetUserId });
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

// 🌟 ১. গ্রুপে নতুন মেম্বার যুক্ত করার Mutation
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

// 🌟 ২. গ্রুপ থেকে মেম্বার রিমুভ করার Mutation
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

// 🌟 ৩. কাউকে Group Admin বানানোর Mutation
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
    mutationFn: async ({ conversationId, ...payload }: { conversationId: string; body?: string; image?: string; replyToId?: string }) => {
      const res = await api.post(`/messages/${conversationId}`, payload);
      return res;
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
  useAddGroupMember,     // 👈 Exported
  useRemoveGroupMember,  // 👈 Exported
  useMakeGroupAdmin,     // 👈 Exported
  useCreateOrGetOneToOne,
  useGetConversations,
  useDeleteMessage,
};