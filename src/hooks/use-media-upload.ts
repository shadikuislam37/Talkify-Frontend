import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const useUploadMedia = () => {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);

      // ব্যাকএন্ডে ফাইল আপলোড রাউট (যা ক্লাউড স্টোরেজে পাঠিয়ে URL রিটার্ন করবে)
      const res = await api.post("/media/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data.url; // আপলোড করা ফাইলের URL
    },
  });
};