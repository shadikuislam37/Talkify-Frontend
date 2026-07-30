// hooks/use-chat.ts
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { api, asArray } from "@/lib/api";
import { useSyncExternalStore } from "react";
import { useChatStore } from "@/store/use-chat-store";
import { Conversation, Message, User } from "@/types";

const emptySubscribe = () => () => {};

export const useChatHydration = () => {
  const store = useChatStore();

  const isHydrated = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  return {
    ...store,
    isHydrated,
  };
};

// ==========================================
// 1. CONVERSATION HOOKS
// ==========================================

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
    mutationFn: async (data: { name: string; userIds: string[]; image?: string }) => {
      const res = await api.post("/conversations/group", data);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

const useUpdateGroupDetails = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      conversationId,
      name,
      image,
    }: {
      conversationId: string;
      name?: string;
      image?: string;
    }) => {
      const res = await api.patch(`/conversations/${conversationId}`, {
        name,
        image,
      });
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
    mutationFn: async ({
      conversationId,
      userIds,
    }: {
      conversationId: string;
      userIds: string[];
    }) => {
      const res = await api.patch(`/conversations/${conversationId}/members`, {
        userIds,
      });
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
    mutationFn: async ({
      conversationId,
      targetUserId,
    }: {
      conversationId: string;
      targetUserId: string;
    }) => {
      const res = await api.delete(
        `/conversations/${conversationId}/members/${targetUserId}`
      );
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

const useLeaveGroup = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (conversationId: string) => {
      const res = await api.post(`/conversations/${conversationId}/leave`);
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
    mutationFn: async ({
      conversationId,
      targetUserId,
    }: {
      conversationId: string;
      targetUserId: string;
    }) => {
      const res = await api.patch(
        `/conversations/${conversationId}/admin/${targetUserId}`
      );
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

// ==========================================
// 2. MESSAGE HOOKS
// ==========================================

const useGetMessages = (conversationId: string | null) => {
  return useInfiniteQuery<Message[]>({
    queryKey: ["messages", conversationId],
    enabled: !!conversationId,
    queryFn: async ({ pageParam }) => {
      const res = await api.get(`/messages/${conversationId}`, {
        params: { cursor: pageParam },
      });
      return asArray<Message>(res);
    },
    getNextPageParam: (lastPage: any) =>
      Array.isArray(lastPage) && lastPage.length
        ? lastPage[lastPage.length - 1].id
        : undefined,
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
      const response = await api.post(`/messages/${conversationId}`, {
        conversationId,
        body,
        image,
        replyToId,
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", variables.conversationId],
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

// 🌟 ৪২৯ লুপ ফিক্স: রিড মার্ক করলে আর invalidateQueries কল হবে না
const useMarkMessageAsRead = () => {
  return useMutation({
    mutationFn: async ({
      messageId,
      conversationId,
    }: {
      messageId: string;
      conversationId: string;
    }) => {
      const res = await api.patch(`/messages/${messageId}/status`, {
        status: "READ",
        conversationId,
      });
      return res;
    },
    // onSuccess তুলে দেওয়া হয়েছে যেন ইনফিনিট রিলক না ঘটে
  });
};

const useReactToMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      messageId,
      emoji,
    }: {
      messageId: string;
      emoji: string;
    }) => {
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

const useDeleteMessageForMe = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (messageId: string) => {
      const res = await api.post(`/messages/${messageId}/delete-for-me`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });
};

// ==========================================
// 3. USER, FRIEND REQUEST & BLOCK HOOKS
// ==========================================

const useSearchUsers = (query: string) => {
  return useQuery({
    queryKey: ["users", "search", query],
    queryFn: async () => {
      if (!query.trim()) return [];
      const res = await api.get(`/users/search?q=${query}`);
      return asArray<User>(res);
    },
    enabled: query.trim().length > 0,
  });
};

const useSendFriendRequest = () => {
  return useMutation({
    mutationFn: async (receiverId: string) => {
      return await api.post("/users/friend-request/send", { receiverId });
    },
  });
};

const useHandleFriendRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      requestId,
      status,
    }: {
      requestId: string;
      status: "ACCEPTED" | "REJECTED";
    }) => {
      return await api.post("/users/friend-request/handle", {
        requestId,
        status,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

const useBlockUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (targetUserId: string) => {
      return await api.post("/users/block", { targetUserId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

export const useChat = {
  useSearchUsers,
  useReactToMessage,
  useSendMessage,
  useMarkMessageAsRead,
  useGetMessages,
  useCreateGroupChat,
  useUpdateGroupDetails,
  useAddGroupMember,
  useRemoveGroupMember,
  useLeaveGroup,
  useMakeGroupAdmin,
  useCreateOrGetOneToOne,
  useGetConversations,
  useDeleteMessage,
  useDeleteMessageForMe,
  useSendFriendRequest,
  useHandleFriendRequest,
  useBlockUser,
};