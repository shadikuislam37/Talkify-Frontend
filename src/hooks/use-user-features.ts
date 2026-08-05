import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, asArray } from "@/lib/api";
import { User } from "@/types";

// ১. ইউজার সার্চ করার হুক
export const useSearchUsers = (query: string) => {
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

// ২. প্রোফাইল আপডেট করার হুক
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { name?: string; image?: string }) => {
      const res = await api.patch("/users/profile", data);
      return res;
    },
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["me"] }); // 🌟 ফিক্স
    },
  });
};

// ৩. অ্যাক্টিভ স্ট্যাটাস (Online/Offline Visibility) টগল করার হুক
export const useToggleActiveStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (isVisible: boolean) => {
      const res = await api.patch("/users/active-status", { isVisible });
      return res;
    },
    onSuccess: () => {
       queryClient.invalidateQueries({ queryKey: ["me"] }); // 🌟 ফিক্স
    },
  });
};

// ৪. পাবলিক কি আপডেট করার হুক (E2EE এর জন্য)
export const useUpdatePublicKey = () => {
  return useMutation({
    mutationFn: async (publicKey: string) => {
      const res = await api.patch("/users/public-key", { publicKey });
      return res;
    },
  });
};

// ৫. ইউজার ব্লক করার হুক
export const useBlockUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (targetUserId: string) => {
      const res = await api.post("/users/block", { targetUserId });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
    },
  });
};

// ৬. ইউজার আনব্লক করার হুক
export const useUnblockUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (targetUserId: string) => {
      const res = await api.post("/users/unblock", { targetUserId });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      queryClient.invalidateQueries({ queryKey: ["blocked-users"] });
    },
  });
};

// ৭. ফ্রেন্ড রিকোয়েস্ট পাঠানোর হুক
export const useSendFriendRequest = () => {
  return useMutation({
    mutationFn: async (receiverId: string) => {
      const res = await api.post("/users/friend-request/send", { receiverId });
      return res;
    },
  });
};

// ৮. ফ্রেন্ড রিকোয়েস্ট হ্যান্ডেল (Accept/Reject) করার হুক
export const useHandleFriendRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string; status: "ACCEPTED" | "REJECTED" }) => {
      const res = await api.post("/users/friend-request/handle", { requestId, status });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friend-requests"] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

// ৯. পেন্ডিং ফ্রেন্ড রিকোয়েস্ট ফেচ করার হুক
export const useGetPendingFriendRequests = () => {
  return useQuery({
    queryKey: ["friend-requests", "pending"],
    queryFn: async () => {
      const res = await api.get("/users/friend-request/pending");
      return asArray(res);
    },
  });
};

// ১০. ফ্রেন্ডস লিস্ট ফেচ করার হুক
export const useGetFriends = () => {
  return useQuery({
    queryKey: ["friends"],
    queryFn: async () => {
      const res = await api.get("/users/friends");
      return asArray(res);
    },
  });
};

// ১১. FCM Token আপডেট করার হুক (নোটিফিকেশনের জন্য)
export const useUpdateFcmToken = () => {
  return useMutation({
    mutationFn: async (fcmToken: string) => {
      const res = await api.post("/users/fcm-token", { fcmToken });
      return res;
    },
  });
};