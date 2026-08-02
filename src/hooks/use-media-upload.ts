import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const useUploadMedia = () => {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      // 🌟 ১. ব্যাকএন্ডের upload.array('files') এর সাথে মিল রেখে 'files' দিতে হবে
      formData.append("files", file);

      // 🌟 ২. headers অংশটি মুছে ফেলা হয়েছে যাতে Axios নিজে boundary সেট করতে পারে
      const res = await api.post("/media/upload", formData);

      // 🌟 ৩. ব্যাকএন্ডের রেসপন্স স্ট্রাকচার অনুযায়ী fileUrl রিটার্ন করা হলো
      return res.data.data[0].fileUrl; 
    },
  });
};