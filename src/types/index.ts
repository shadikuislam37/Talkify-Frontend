import { buttonVariants } from "@/components/ui/button";
import { VariantProps } from "class-variance-authority";

// ==========================================
// ১. Enums (Prisma Schema থেকে)
// ==========================================
export type MessageStatus = "SENT" | "DELIVERED" | "READ";
export type Role = "ADMIN" | "USER";
export type FriendRequestStatus = "PENDING" | "ACCEPTED" | "REJECTED"; // 🌟 Prisma Enum যুক্ত করা হলো

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
  isOnline?: boolean; // 🌟 Prisma Field
  publicKey?: string | null; // 🌟 Prisma Field
  encryptedPrivateKey?: string | null; // 🌟 PIN দিয়ে এনক্রিপ্টেড প্রাইভেট কি ব্যাকআপ (E2EE)
  fcmToken?: string | null; // 🌟 Prisma Field
  twoFactorEnabled?: boolean | null; // 🌟 Prisma Field
  lastSeen?: string | Date;
  createdAt?: string | Date;
  updatedAt?: string | Date;

  // Relations (অপাওয়ালে ফ্রন্টএন্ডে ইউজার ডিটেইলস হ্যান্ডেল করার জন্য)
  blockedUsers?: AuthUser[];
  blockedBy?: AuthUser[];
  sentFriendRequests?: FriendRequest[];
  receivedFriendRequests?: FriendRequest[];
}

// রি-ইউজেবিলিটির জন্য টাইপ অ্যালিয়াস (Aliases)
export type User = AuthUser;
export type UserProfile = AuthUser;
export type ConversationUser = AuthUser;

// ==========================================
// ৩. Friend Request Interface (🌟 নতুন মডেল অনুযায়ী)
// ==========================================
export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: FriendRequestStatus;
  createdAt: string | Date;

  sender?: AuthUser;
  receiver?: AuthUser;
}

// ==========================================
// ৪. Reaction & Read Receipt Interfaces
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
// ৫. Message Interface
// ==========================================
export interface Message {
  id: string;
  body?: string | null;
  keys?: { userId: string; encryptedKey: string }[] | null;
  image?: string | null;
  status?: MessageStatus;
  createdAt?: string | Date;
  updatedAt?: string | Date;

  senderId?: string;
  sender?: AuthUser;
  clientId?: string;

  conversationId?: string;

  // file upload feature :
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;

  // Reply Feature
  replyToId?: string | null;
  replyTo?:
    | {
        id: string;
        body?: string | null;
        senderName?: string;
        sender?: AuthUser;
        keys?: { userId: string; encryptedKey: string }[]; // 🌟 টাইপ এরর ফিক্স করতে keys যোগ করা হলো
      }
    | Message
    | null;
  replies?: Message[];

  // 🌟 Delete For Me Support
  deletedForUsers?: AuthUser[];

  // Reactions & Read Receipts
  reactions?: Reaction[];
  reads?: MessageRead[];
  isEdited?: boolean;

  // 🌟 Optimistic UI
  _sendStatus?: "pending" | "failed";
  _retryPayload?: {
    conversationId: string;
    body?: string;
    image?: string;
    fileUrl?: string;
    fileType?: string;
    fileName?: string;
    replyToId?: string;
    members: { id: string; publicKey?: string | null }[];
    currentUserId: string;
  };
}

// ==========================================
// ৬. Conversation Interface
// ==========================================
export interface Conversation {
  id: string;
  name?: string | null;
  isGroup?: boolean;
  image?: string | null;
  adminIds?: string[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
  theme?: string | null;
  users?: AuthUser[];
  messages?: Message[];

  unreadCount?: number;
}

// ==========================================
// ৭. UI & WebRTC Call Props
// ==========================================
export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export interface CallState {
  isCalling: boolean;
  incomingCall: {
    from: string;
    name: string;
    sdp: any;
    isVideo?: boolean;
  } | null;
  callActive: boolean;
  targetUser: { id: string; name: string; image?: string } | null;
  setIncomingCall: (call: CallState["incomingCall"]) => void;
  startCall: (targetUser: CallState["targetUser"]) => void;
  acceptCall: () => void;
  endCall: () => void;
}



export interface GroupCreationMember extends AuthUser {
  isSelected?: boolean;
  isAcceptedConnection?: boolean; // ফ্রেন্ড রিকোয়েস্ট এক্সেপ্ট করা আছে কি না
}