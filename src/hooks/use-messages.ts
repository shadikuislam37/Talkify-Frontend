import { useQueryClient, useMutation, useInfiniteQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Message } from "@/types";
import { encryptMessage, getMyPublicKeyPem, Recipient } from "@/lib/crypto";

// 🌟 Message[] এর সাথে nextCursor জুড়ে দেওয়ার হ্যাক — এতে ChatBox/useSocket-এর বাকি জায়গায়
// pages কে সরাসরি Message[] হিসেবে ট্রিট করা কোড না ভেঙেই pagination তথ্য বহন করা যায়।
type MessagesPage = Message[] & { nextCursor?: string };

interface ConversationMemberForEncryption {
  id: string;
  publicKey?: string | null;
}

export const useGetMessages = (conversationId: string | null) => {
  return useInfiniteQuery<MessagesPage>({
    queryKey: ["messages", conversationId],
    enabled: !!conversationId,
    queryFn: async ({ pageParam }) => {
      const res = await api.get<T>(`/messages/${conversationId}`, {
        params: { cursor: pageParam },
      });
      // 🌟 ফিক্স: api.ts-এর axios interceptor আগে থেকেই response.data রিটার্ন করে,
      // তাই res নিজেই backend envelope { success, message, data, nextCursor } —
      // res.data সরাসরি Message[], আর nextCursor top-level-এই আছে (res.data.nextCursor না)
      const messages = (res.data ?? []) as MessagesPage;
      messages.nextCursor = res.nextCursor;
      return messages;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined,
  });
};

interface SendMessageVars {
  clientId: string; // 🌟 ক্লায়েন্ট-জেনারেটেড temp id — optimistic bubble আর retry ম্যাচ করতে ব্যবহার হয়
  conversationId: string;
  body?: string;
  image?: string;
  fileUrl?: string;
  fileType?: string;
  fileName?: string;
  replyToId?: string;
  replyToPreview?: Message["replyTo"]; // শুধু optimistic bubble-এ reply-quote দেখানোর জন্য
  members: ConversationMemberForEncryption[];
  currentUserId: string;
 currentUserPublicKey?: string | null; // 🌟 Zustand থেকে পাঠানো পাবলিক কী
}

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      conversationId,
      body,
      image,
      fileUrl,
      fileType,
      fileName,
      replyToId,
      members,
      currentUserId,
      currentUserPublicKey, // 🌟 আর্গুমেন্ট রিসিভ
    }: SendMessageVars) => {
      let encryptedBody: string | undefined;
      let keys: { userId: string; encryptedKey: string }[] | undefined;

      if (body) {
  const myPublicKeyPem = currentUserPublicKey;

  // 🌟 ফেইল-ফাস্ট: নিজের কী না থাকলে প্রথমেই আটকে দিন
  if (!myPublicKeyPem) {
    throw new Error(
      "Your own encryption key is not set up on this device yet. Please complete E2EE setup first."
    );
  }

  const allMemberIds = new Set([currentUserId, ...members.map((m) => m.id)]);
  const recipients: Recipient[] = [];
  const missingKeyFor: string[] = [];

  allMemberIds.forEach((id) => {
    const pem =
      id === currentUserId
        ? myPublicKeyPem
        : members.find((m) => m.id === id)?.publicKey;

    if (pem) {
      recipients.push({ userId: id, publicKeyPem: pem });
    } else {
      missingKeyFor.push(id);
    }
  });

  if (missingKeyFor.length > 0) {
    throw new Error(
      `Cannot send: ${missingKeyFor.length} member(s) haven't set up encryption yet. Ask them to open the app once.`
    );
  }

  const encrypted = await encryptMessage(body, recipients);
  encryptedBody = encrypted.encryptedBody;
  keys = encrypted.keys;
}

      const response = await api.post(`/messages/${conversationId}`, {
        encryptedBody,
        keys,
        image,
        fileUrl,
        fileType,
        fileName,
        replyToId,
      });
      return response.data; 
    },

    // 🌟 নতুন: Optimistic UI — REST কল শেষ হওয়ার জন্য অপেক্ষা না করে সাথে সাথেই
    // একটা "pending" বাবল cache-এ বসিয়ে দেওয়া হচ্ছে
    onMutate: async (vars: SendMessageVars) => {
      await queryClient.cancelQueries({ queryKey: ["messages", vars.conversationId] });

      const previousData = queryClient.getQueryData(["messages", vars.conversationId]);

      const optimisticMessage: Message = {
        id: vars.clientId,
        body: vars.body ?? null,
        image: vars.image ?? null,
        fileUrl: vars.fileUrl ?? null,
        fileName: vars.fileName ?? null,
        fileType: vars.fileType ?? null,
        senderId: vars.currentUserId,
        conversationId: vars.conversationId,
        replyToId: vars.replyToId ?? null,
        replyTo: vars.replyToPreview ?? null,
        createdAt: new Date().toISOString(),
        status: "SENT",
        isEdited: false,
        keys: undefined, // 🌟 keys না থাকায় ChatBox-এর decrypt effect body-কে already-plain ধরে নেবে
        _sendStatus: "pending",
        _retryPayload: {
          conversationId: vars.conversationId,
          body: vars.body,
          image: vars.image,
          fileUrl: vars.fileUrl,
          fileType: vars.fileType,
          fileName: vars.fileName,
          replyToId: vars.replyToId,
          members: vars.members,
          currentUserId: vars.currentUserId,
        },
      };

      queryClient.setQueryData(["messages", vars.conversationId], (old: any) => {
        if (!old || !old.pages || old.pages.length === 0) {
          return { pages: [[optimisticMessage]], pageParams: [undefined] };
        }

        // 🌟 রিট্রাই হলে (একই clientId ইতিমধ্যে কোনো page-এ আছে) সেই এন্ট্রিটাই আপডেট
        // করা হচ্ছে "pending" স্ট্যাটাসে — নতুন করে prepend করলে duplicate বাবল দেখা যেত
        const alreadyExists = old.pages.some((page: Message[]) =>
          page.some((m) => m.id === vars.clientId)
        );

        if (alreadyExists) {
          return {
            ...old,
            pages: old.pages.map((page: Message[]) =>
              page.map((m) => (m.id === vars.clientId ? optimisticMessage : m))
            ),
          };
        }

        const newPages = [...old.pages];
        newPages[0] = [optimisticMessage, ...newPages[0]];
        return { ...old, pages: newPages };
      });

      return { previousData, clientId: vars.clientId };
    },

    // 🌟 ব্যর্থ হলে বাবল মুছে ফেলা হচ্ছে না — "failed" মার্ক করে রাখা হচ্ছে, যাতে
    // ইউজার bubble-এ retry বাটন দেখে আবার পাঠাতে পারে
    onError: (_error, vars, context) => {
      queryClient.setQueryData(["messages", vars.conversationId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: Message[]) =>
            page.map((m) => (m.id === context?.clientId ? { ...m, _sendStatus: "failed" as const } : m))
          ),
        };
      });
    },

    // 🌟 সফল হলে temporary বাবলটাকে সার্ভার থেকে আসা আসল মেসেজ দিয়ে replace করা হচ্ছে
    onSuccess: (newMessage, vars, context) => {
      queryClient.setQueryData(["messages", vars.conversationId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page: Message[]) =>
            page.map((m) => (m.id === context?.clientId ? newMessage : m))
          ),
        };
      });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
};

export const useMarkMessageAsRead = () => {
  return useMutation({
    mutationFn: async ({ messageId, conversationId }: { messageId: string; conversationId: string }) => {
      const res = await api.patch(`/messages/${messageId}/status`, {
        status: "READ",
        conversationId,
      });
      return res;
    },
  });
};

export const useReactToMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      const res = await api.post(`/messages/${messageId}/react`, { emoji });
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });
};

export const useDeleteMessage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (messageId: string) => {
      const res = await api.delete(`/messages/${messageId}`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });
};

export const useDeleteMessageForMe = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (messageId: string) => {
      // 🌟 ফিক্স: backend route হলো DELETE /messages/:messageId/delete-for-me
      // (আগে messageId আর delete-for-me এর ক্রম উল্টো ছিল, 404 দিত)
      const res = await api.delete(`/messages/${messageId}/delete-for-me`);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    },
  });
};

export const useMessage = {
  useDeleteMessageForMe,
  useDeleteMessage,
  useReactToMessage,
  useGetMessages,
  useSendMessage,
  useMarkMessageAsRead,
};