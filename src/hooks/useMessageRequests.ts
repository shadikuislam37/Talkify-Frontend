import { api, unwrap } from '@/lib/api';
import { useChatStore } from '@/store/use-chat-store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const useMessageRequests = () => {
  const queryClient = useQueryClient();
  const { setPendingMessageRequests, removeMessageRequest } = useChatStore();

  // ১. পেন্ডিং মেসেজ রিকোয়েস্টগুলো ফেচ করা
  const { 
    data: pendingRequests = [], 
    isLoading: isRequestsLoading, 
    error: requestsError 
  } = useQuery({
    queryKey: ['pending-message-requests'],
    queryFn: async () => {
      const response = await api.get('/users/friend-request/pending');
      const data = unwrap<any[]>(response); // unwrap হেল্পার দিয়ে সরাসরি ডাটা এক্সট্রাক্ট করা হলো
      
      setPendingMessageRequests(data || []);
      return data || [];
    },
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
  });

  // ২. মেসেজ রিকোয়েস্ট এক্সেপ্ট বা রিজেক্ট করার মিউটেশন
  const handleRequestMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string; status: 'ACCEPTED' | 'REJECTED' }) => {
      const response = await api.post('/users/friend-request/handle', {
        requestId,
        status,
      });
      return { response, requestId, status };
    },
    onMutate: async ({ requestId }) => {
      // অপ্টিমিস্টিক আপডেট (UI থেকে ইনস্ট্যান্ট রিমুভ)
      removeMessageRequest(requestId);
    },
    onSuccess: (data) => {
      // সফল হলে ক্যাশ রিফেচ করা
      queryClient.invalidateQueries({ queryKey: ['pending-message-requests'] });
      
      if (data.status === 'ACCEPTED') {
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      }
    },
    onError: () => {
      // এরর হলে কুয়েরি রিফেচ করে ব্যাকআপ রিস্টোর করা
      queryClient.invalidateQueries({ queryKey: ['pending-message-requests'] });
    },
  });

  // ৩. নতুন মেসেজ রিকোয়েস্ট পাঠানোর মিউটেশন
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