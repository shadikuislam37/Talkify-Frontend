import axios, { AxiosError } from "axios";

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



// Axios ইন্সট্যান্স তৈরি (আপনার fetch এর credentials: "include" এর বিকল্প)
const axiosInstance = axios.create({
  baseURL: API_URL,
  withCredentials: true, 
  headers: {
    "Content-Type": "application/json",
  },
});

// Response Interceptor: আপনার fetch এর catch এবং error handling লজিক
axiosInstance.interceptors.response.use(
  (response) => {
    return response.data; // শুধু ডাটা রিটার্ন করবে
  },
  (error: AxiosError) => {
    if (error.response) {
      // Server থেকে error আসলে
      const data = error.response.data as { 
  error?: string; 
  message?: string; 
  errorMessage?: string 
} | string;


      const message =
        (data &&
          typeof data === "object" &&
          ((typeof data.error === "string" && data.error) ||
            data.message ||
            data.errorMessage)) ||
        (typeof data === "string" && data.slice(0, 200)) ||
        `Request failed with status ${error.response.status}`;
        
      throw new ApiError(String(message), error.response.status);
    }
    
    // Network error বা Server down থাকলে
    throw new ApiError(
      "Network error. Please check your connection and try again.",
      0
    );
  }
);

// ঠিক আগের মতোই api অবজেক্ট
export const api = {
  get: <T = unknown>(path: string) => axiosInstance.get<unknown, T>(path),
  post: <T = unknown>(path: string, body?: unknown) =>
    axiosInstance.post<unknown, T>(path, body),
  put: <T = unknown>(path: string, body?: unknown) =>
    axiosInstance.put<unknown, T>(path, body),
  patch: <T = unknown>(path: string, body?: unknown) =>
    axiosInstance.patch<unknown, T>(path, body),
  delete: <T = unknown>(path: string) => axiosInstance.delete<unknown, T>(path),
};

/**
 * Unwraps common API envelope shapes...
 */
/**
 * Unwraps common API envelope shapes...
 */
export function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    // টাইপস্ক্রিপ্টকে বলছি এটি একটি ডাইনামিক অবজেক্ট
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
/**
 * Extracts an array from an unknown API payload shape...
 */
export function asArray<T>(payload: unknown): T[] {
  const seen = new Set<unknown>();

  const dig = (value: unknown, depth: number): T[] | null => {
    if (value == null || depth > 3 || seen.has(value)) return null;
    if (Array.isArray(value)) return value as T[];
    if (typeof value !== "object") return null;
    
    seen.add(value);
    
    // টাইপস্ক্রিপ্টকে বলছি এটি একটি ডাইনামিক অবজেক্ট
    const obj = value as Record<string, unknown>; 
    
    const keys = [
      "data", "result", "results", "items", "meals",
      "orders", "users", "categories", "reviews", "docs",
    ];
    for (const key of keys) {
      if (key in obj) {
        const found = dig(obj[key], depth + 1);
        if (found) return found;
      }
    }
    return null;
  };

  return dig(payload, 0) ?? [];
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}