import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { AuthUser } from "@/types";

export function useGetMe(enabled: boolean) {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const res = await api.get<{ success: boolean; message: string; data: AuthUser }>("/users/me");
      return res.data;
    },
    enabled,
  });
}