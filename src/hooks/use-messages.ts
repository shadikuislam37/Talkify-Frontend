import { useQueryClient, useMutation, useInfiniteQuery } from "@tanstack/react-query";
import { api, asArray } from "@/lib/api";
import { Message } from "@/types";

export const useGetMessages = (conversationId: string | null) => {
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
      Array.isArray(lastPage) && lastPage.length ? lastPage[lastPage.length - 1].id : undefined,
    initialPageParam: undefined,
  });
};

export const useSendMessage = () => {
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
      queryClient.invalidateQueries({ queryKey: ["messages", variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

export const useMarkMessageAsRead = () => {
  return useMutation({
    mutationFn: async ({ messageId, conversationId }: { messageId: string; conversationId: string }) => {
      const res = await api.patch(`/messages/${messageId}/status`, {
        status: "READ",
        conversationId,
      });
      return res;
    },
  });
};

export const useReactToMessage = () => {
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

export const useDeleteMessage = () => {
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

export const useDeleteMessageForMe = () => {
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


export const useMessage = {
  useDeleteMessageForMe,
  useDeleteMessage,
  useReactToMessage,
  useGetMessages,
  useSendMessage,
  useMarkMessageAsRead
}