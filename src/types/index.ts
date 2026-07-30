import { buttonVariants } from "@/components/ui/button";
import { VariantProps } from "class-variance-authority";

// ==========================================
// ১. Enums
// ==========================================
export type MessageStatus = "SENT" | "DELIVERED" | "READ";
export type Role = "ADMIN" | "USER";

// ==========================================
// ২. User Interfaces
// ==========================================
export interface AuthUser {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  image?: string | null;
  role?: Role;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  isActiveStatusVisible?: boolean;
  lastSeen?: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

// রি-ইউজেবিলিটির জন্য টাইপ অ্যালিয়াস (Aliases)
export type User = AuthUser;
export type UserProfile = AuthUser;
export type ConversationUser = AuthUser;

// ==========================================
// ৩. Reaction & Read Receipt Interfaces
// ==========================================
export interface Reaction {
  id: string;
  emoji: string;
  messageId: string;
  userId: string;
  user?: AuthUser;
}

export interface MessageRead {
  id?: string;
  messageId?: string;
  userId: string;
  readAt?: string | Date;
  user?: AuthUser;
}

// ==========================================
// ৪. Message Interface
// ==========================================
export interface Message {
  id: string;
  body?: string | null;
  image?: string | null;
  status?: MessageStatus;
  createdAt?: string | Date;
  updatedAt?: string | Date;

  senderId?: string;
  sender?: AuthUser;

  conversationId?: string;

  // Reply Feature
  replyToId?: string | null;
  replyTo?: {
    id: string;
    body?: string | null;
    senderName?: string;
    sender?: AuthUser;
  } | Message | null;
  replies?: Message[];

  // Reactions & Read Receipts
  reactions?: Reaction[];
  reads?: MessageRead[];
}

// ==========================================
// ৫. Conversation Interface
// ==========================================
export interface Conversation {
  id: string;
  name?: string | null;
  isGroup?: boolean;
  image?: string | null; // 🌟 এখানে image যোগ করুন
  adminIds?: string[];
  createdAt?: string | Date;
  updatedAt?: string | Date;

  users?: AuthUser[];
  messages?: Message[];

  unreadCount?: number;
}

// ==========================================
// ৬. UI Related Props
// ==========================================
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}