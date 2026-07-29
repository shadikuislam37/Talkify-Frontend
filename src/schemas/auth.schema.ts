import { z } from "zod";

const phoneRegex = /^01[3-9]\d{8}$/;

export const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .length(11, "Phone number must be exactly 11 digits!")
    .regex(phoneRegex, "Please enter a valid Bangladeshi phone number!"),
});
export type SignUpInput = z.infer<typeof signUpSchema>;

export const signInSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
export type SignInInput = z.infer<typeof signInSchema>;