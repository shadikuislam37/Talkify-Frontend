import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const useUpdateGroupDetails = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ conversationId, name, image }: { conversationId: string; name?: string; image?: string }) => {
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
    mutationFn: async ({ conversationId, userIds }: { conversationId: string; userIds: string[] }) => {
      return await api.patch(`/conversations/${conversationId}/members`, { userIds });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["conversations", variables.conversationId] });
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
    },
  });
};