import { useQueryClient, useMutation, useInfiniteQuery } from "@tanstack/react-query";
import { api, asArray } from "@/lib/api";
import { Message } from "@/types";
import { encryptMessage } from "@/lib/crypto"; // 🌟 ক্রিপ্টো এনক্রিপশন ইম্পোর্ট

export const useGetMessages = (conversationId: string | null) => {
  return useInfiniteQuery<Message[]>({
    queryKey: ["messages", conversationId],
    enabled: !!conversationId,
    queryFn: async ({ pageParam }) => {
      const res = await api.get(`/messages/${conversationId}`, {
        params: { cursor: pageParam },
      });
      return res.data; 
    },
    getNextPageParam: (lastPage: any) => 
      Array.isArray(lastPage) && lastPage.length === 20 
        ? lastPage[19].id 
        : undefined,
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
      recipientPublicKey, // 🌟 প্রাপকের পাবলিক কি (E2EE এর জন্য বাধ্যতামূলক)
    }: {
      conversationId: string;
      body?: string;
      image?: string;
      replyToId?: string;
      recipientPublicKey?: string;
    }) => {
      let encryptedBody = undefined;
      let encryptedKey = undefined;

      // যদি টেক্সট মেসেজ থাকে এবং প্রাপকের পাবলিক কি থাকে, তবে এনক্রিপ্ট হবে
      if (body && recipientPublicKey) {
        const encrypted = await encryptMessage(body, recipientPublicKey);
        encryptedBody = encrypted.encryptedBody;
        encryptedKey = encrypted.encryptedKey;
      } else if (body) {
        // পাবলিক কি না থাকলে ফলব্যাক হিসেবে প্লেন টেক্সট বা এম্পটি রাখতে পারেন
        encryptedBody = body; 
      }

     const response = await api.post(`/messages/${conversationId}`, {
  conversationId,
  encryptedBody: encryptedBody,  // 🌟 'body' এর পরিবর্তে 'encryptedBody' দিন
  encryptedKey: encryptedKey,    
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
      const res = await api.delete(`/messages/${messageId}/delete-for-me`);
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
  useMarkMessageAsRead,
};