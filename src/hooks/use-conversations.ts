import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, asArray } from "@/lib/api";
import { Conversation } from "@/types";
import { computeBackfillEntriesForNewMember } from "@/lib/crypto";

export const useGetConversations = () => {
  return useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await api.get("/conversations");
      return asArray<Conversation>(res);
    },
  });
};

export const useCreateOrGetOneToOne = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (targetUserId: string) => {
      const res: any = await api.post("/conversations/one-to-one", { targetUserId });
      return res?.data ?? res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

// 🌟 গ্রুপ তৈরির সাথে সাথে সাইডবারে ইনস্ট্যান্ট দেখানোর জন্য Optimistic Cache Update
export const useCreateGroupChat = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name: string; userIds: string[]; image?: string }) => {
      const res: any = await api.post("/conversations/group", data);
      return res?.data ?? res;
    },
    onSuccess: (newConversation) => {
      queryClient.setQueryData(["conversations"], (old: any[] | undefined) => {
        if (!old) return [newConversation];
        return [newConversation, ...old];
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

export const useUpdateGroupDetails = () => {
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
      return await api.patch(`/conversations/${conversationId}/details`, { name, image });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["conversations", variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

export const useAddGroupMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      conversationId,
      userIds,
      currentUserId,
    }: {
      conversationId: string;
      userIds: string[];
      currentUserId?: string;
    }) => {
      const res = await api.patch(`/conversations/${conversationId}/members`, { userIds });
      return res;
    },
    onSuccess: async (updatedConversation, variables) => {
      queryClient.invalidateQueries({ queryKey: ["conversations", variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });

      try {
        const { currentUserId } = variables;
        if (!currentUserId) return;

        const keysRes: any = await api.get(`/messages/${variables.conversationId}/keys-for-backfill`);
        const messages = (keysRes?.data ?? keysRes ?? []) as { id: string; keys: { userId: string; encryptedKey: string }[] }[];

        if (messages.length === 0) return;

        for (const newMemberId of variables.userIds) {
          const newMember = (updatedConversation as any)?.users?.find((u: any) => u.id === newMemberId);
          if (!newMember?.publicKey) continue;

          const entries = await computeBackfillEntriesForNewMember(
            messages,
            currentUserId,
            newMember.publicKey
          );

          if (entries.length === 0) continue;

          const BATCH_SIZE = 100;
          for (let i = 0; i < entries.length; i += BATCH_SIZE) {
            await api.post("/messages/backfill-keys", {
              conversationId: variables.conversationId,
              newMemberId,
              entries: entries.slice(i, i + BATCH_SIZE),
            });
          }
        }
      } catch (err) {
        console.error("History backfill failed:", err);
      }
    },
  });
};

export const useRemoveGroupMember = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, targetUserId }: { conversationId: string; targetUserId: string }) => {
      return await api.delete(`/conversations/${conversationId}/members/${targetUserId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["conversations", variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

export const useMakeGroupAdmin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, targetUserId }: { conversationId: string; targetUserId: string }) => {
      return await api.patch(`/conversations/${conversationId}/admin/${targetUserId}`);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["conversations", variables.conversationId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};


// 🌟 চ্যাট থিম আপডেট করার মিউটেশন হুক
export const useUpdateChatTheme = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (variables: { conversationId: string; theme: string }) => {
      const res: any = await api.patch(`/conversations/${variables.conversationId}/theme`, { 
        theme: variables.theme 
      });
      return res?.data ?? res;
    },
    // 🌟 ইনস্ট্যান্ট ক্যাশ আপডেট (Optimistic Update)
    onMutate: async ({ conversationId, theme }) => {
      await queryClient.cancelQueries({ queryKey: ["conversations"] });
      
      const previousConversations = queryClient.getQueryData(["conversations"]);

      queryClient.setQueryData(["conversations"], (old: any) => {
        if (!old) return old;
        return old.map((conv: any) => 
          conv.id === conversationId ? { ...conv, theme } : conv
        );
      });

      return { previousConversations };
    },
    onError: (_err, _variables, context: any) => {
      if (context?.previousConversations) {
        queryClient.setQueryData(["conversations"], context.previousConversations);
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["conversations", variables.conversationId] });
    },
  });
};