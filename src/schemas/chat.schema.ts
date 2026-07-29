import { z } from "zod";

export const sendMessageSchema = z
  .object({
    body: z.string().trim().optional(),
    image: z.string().optional(),
    conversationId: z.string().min(1, "Conversation ID is required"),
  })
  .refine((data) => data.body || data.image, {
    message: "Message must contain either body or image!",
    path: ["body"], // Validation error showing in body field
  });


export const createGroupSchema = z.object({
  name: z.string().min(3, "Group name must be at least 3 characters"),
  userIds: z.array(z.string()).min(2, "Select at least 2 other members"),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2, "Name is too short").optional(),
  image: z.string().url("Invalid image URL").optional(),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;