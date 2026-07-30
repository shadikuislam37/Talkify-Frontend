import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// মেসেজ এডিট করার হুক
export const useEditMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId, newBody }: { messageId: string; newBody: string }) => {
      const res = await api.patch(`/messages/${messageId}`, { body: newBody });
      return res.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });
};

// মেসেজ ডিলিট (Delete for Everyone) করার হুক
export const useDeleteMessageForEveryone = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (messageId: string) => {
      const res = await api.delete(`/messages/${messageId}`);
      return res.data;
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
      // ব্যাকএন্ডে রুট থাকতে হবে যেমন: DELETE /messages/delete-for-me/:id
      const res = await api.delete(`/messages/delete-for-me/${messageId}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });
};