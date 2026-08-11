import { api, unwrap } from '@/lib/api';
import { useChatStore } from '@/store/use-chat-store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const useMessageRequests = () => {
  const queryClient = useQueryClient();
  const { setPendingMessageRequests, removeMessageRequest } = useChatStore();

  const { 
    data: pendingRequests = [], 
    isLoading: isRequestsLoading, 
    error: requestsError 
  } = useQuery({
    queryKey: ['pending-message-requests'],
    queryFn: async () => {
      const response = await api.get('/users/friend-request/pending');
      const data = unwrap<any[]>(response);
      
      setPendingMessageRequests(data || []);
      return data || [];
    },
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
  });

  const handleRequestMutation = useMutation({
    // senderName রিসিভ করছি যাতে Toast এ নাম দেখানো যায়
    mutationFn: async ({ requestId, status, senderName }: { requestId: string; status: 'ACCEPTED' | 'REJECTED'; senderName: string }) => {
      const response = await api.post('/users/friend-request/handle', {
        requestId,
        status,
      });
      return { response, requestId, status, senderName };
    },
    onMutate: async ({ requestId }) => {
      // 🌟 অপ্টিমিস্টিক আপডেট: বাটনে ক্লিক করার সাথে সাথেই UI থেকে রিকোয়েস্ট গায়েব হয়ে যাবে
      removeMessageRequest(requestId);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['pending-message-requests'] });
      
      if (data.status === 'ACCEPTED') {
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        toast.success("Request Accepted! 🎉", {
          description: `You can now chat with ${data.senderName}.`,
          duration: 3000,
        });
      } else {
        toast("Request Deleted 🗑️", {
          description: `You removed ${data.senderName}'s request.`,
          duration: 3000,
        });
      }
    },
    onError: () => {
      toast.error("Oops! Something went wrong 😥");
      queryClient.invalidateQueries({ queryKey: ['pending-message-requests'] });
    },
  });

  const sendRequestMutation = useMutation({
    mutationFn: async (receiverId: string) => {
      const response = await api.post('/users/friend-request/send', {
        receiverId,
      });
      return response;
    },
  });

  return {
    pendingRequests,
    isRequestsLoading,
    requestsError,
    handleRequest: handleRequestMutation.mutateAsync,
    isHandling: handleRequestMutation.isPending,
    sendRequest: sendRequestMutation.mutateAsync,
    isSending: sendRequestMutation.isPending,
  };
};