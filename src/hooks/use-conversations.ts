import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, asArray } from "@/lib/api";
import { Conversation } from "@/types";

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
      const res = await api.post("/conversations/one-to-one", { targetUserId });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

export const useCreateGroupChat = () => {
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
      const res = await api.patch(`/conversations/${conversationId}`, { name, image });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

export const useAddGroupMember = () => {
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

export const useRemoveGroupMember = () => {
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

export const useLeaveGroup = () => {
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

export const useMakeGroupAdmin = () => {
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