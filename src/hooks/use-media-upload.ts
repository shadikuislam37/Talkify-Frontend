import { useMutation } from "@tanstack/react-query";
import { mediaApi } from "@/lib/api";

export const useUploadMedia = () => {
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("files", file);

      const res = await mediaApi.post("/media/upload", formData);
      return res.data.data[0].fileUrl;
    },
  });
};