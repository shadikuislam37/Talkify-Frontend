import { z } from "zod";

// ১. Send Message Schema
export const sendMessageSchema = z
  .object({
    body: z.string().trim().optional(),
    image: z.string().optional(),
    conversationId: z.string().min(1, "Conversation ID is required"),
    replyToId: z.string().optional(), // 🌟 মেসেজ রিপ্লাই ফিচারের জন্য
  })
  .refine((data) => (data.body && data.body.length > 0) || !!data.image, {
    message: "Message must contain either text or an image!",
    path: ["body"],
  });

// ২. Create Group Schema
export const createGroupSchema = z.object({
  name: z.string().min(3, "Group name must be at least 3 characters"),
  userIds: z.array(z.string()).min(2, "Select at least 2 other members"),
  image: z.string().optional(), // 🌟 নতুন যুক্ত করা হলো (গ্রুপের প্রফাইল ছবি)
});

// ৩. Update Profile Schema
export const updateProfileSchema = z.object({
  name: z.string().min(2, "Name is too short").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  image: z
    .string()
    .url("Invalid image URL")
    .optional()
    .or(z.literal(""))
    .nullable(), // 🌟 ফাঁকা স্ট্রিং বা null হ্যান্ডেল করার জন্য
});

// Types Export
export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;