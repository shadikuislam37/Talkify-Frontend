import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { toast } from "sonner";

// প্রক্সি পাথ ব্যবহার করছি
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/backend-api";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// Axios ইন্সট্যান্স তৈরি   headers: {
  //   "Content-Type": "application/json",
  // },
const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true,
 
 
});

// Response Interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    // 🌟 ২. যেকোনো Successful Mutation (POST, PUT, PATCH, DELETE)-এ যদি ব্যাকএন্ড থেকে message আসে, তবে অটো Toast দেখাবে
    const method = response.config.method?.toLowerCase();
    const data = response.data as any;

    if (method && method !== "get") {
      const successMessage = data?.message || data?.data?.message;
      if (successMessage && typeof successMessage === "string") {
        toast.success(successMessage);
      }
    }

    return response.data; // ইন্টারসেপ্টর সরাসরি ডাটা রিটার্ন করবে
  },
  (error: AxiosError) => {
    let message = "Network error. Please check your connection and try again.";
    let status = 0;

    if (error.response) {
      status = error.response.status;
      const data = error.response.data as
        | { error?: string; message?: string; errorMessage?: string }
        | string;

      message =
        (data &&
          typeof data === "object" &&
          ((typeof data.error === "string" && data.error) ||
            data.message ||
            data.errorMessage)) ||
        (typeof data === "string" && data.slice(0, 200)) ||
        `Request failed with status ${error.response.status}`;
    }

    // 🌟 ৩. গ্লোবালি এরর দেখালেই স্বয়ংক্রিয়ভাবে Red Toast পপ-আপ হবে!
    // (নোট: 401 Unauthenticated এররের ক্ষেত্রে অনেক সময় টোস্ট না দেখিয়ে সাইন-ইনে রিডাইরেক্ট করানো ভালো)
    if (status !== 401) {
      toast.error(String(message));
    }

    throw new ApiError(String(message), status);
  }
);

// ✅ ফিক্সড API Helper Object (AxiosConfig সাপোর্ট সহ)
export const api = {
  get: <T = unknown>(url: string, config?: AxiosRequestConfig) =>
    axiosInstance.get<unknown, T>(url, config),

  post: <T = unknown>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    axiosInstance.post<unknown, T>(url, body, config),

  put: <T = unknown>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    axiosInstance.put<unknown, T>(url, body, config),

  patch: <T = unknown>(url: string, body?: unknown, config?: AxiosRequestConfig) =>
    axiosInstance.patch<unknown, T>(url, body, config),

  delete: <T = unknown>(url: string, config?: AxiosRequestConfig) =>
    axiosInstance.delete<unknown, T>(url, config),
};

/**
 * Unwraps common API envelope shapes...
 */
export function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const obj = payload as Record<string, unknown>;

    if (obj.data !== undefined && obj.data !== null) {
      return obj.data as T;
    }
    if (obj.result !== undefined && obj.result !== null) {
      return obj.result as T;
    }
  }
  return payload as T;
}

/**
 * Extracts an array from an unknown API payload shape...
 */
export function asArray<T>(payload: unknown): T[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload as T[];

  if (typeof payload === "object") {
    const obj = payload as Record<string, unknown>;

    const possibleKeys = ["data", "conversations", "result", "results", "items"];
    for (const key of possibleKeys) {
      if (Array.isArray(obj[key])) {
        return obj[key] as T[];
      }
    }
  }

  return [];
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}