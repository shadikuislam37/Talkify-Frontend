import { useMutation } from "@tanstack/react-query";
import { mediaApi } from "@/lib/api";

export const useUploadMedia = () => {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("files", file);

      const res = await mediaApi.post("/media/upload", formData);
      
      console.log("Upload response:", res.data); // 🌟 ডিবাগের জন্য

      if (!res.data?.data?.[0]?.fileUrl) {
        throw new Error(
          res.data?.message || "Upload succeeded but response format unexpected"
        );
      }

      return res.data.data[0].fileUrl;
    },
  });
};