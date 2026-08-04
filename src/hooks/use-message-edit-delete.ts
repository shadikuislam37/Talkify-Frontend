// import { useMutation, useQueryClient } from "@tanstack/react-query";
// import { api } from "@/lib/api";
// import { encryptMessage, getMyPublicKeyPem, Recipient } from "@/lib/crypto";

// interface MemberForEncryption {
//   id: string;
//   publicKey?: string | null;
// }

// // মেসেজ এডিট করার হুক
// export const useEditMessage = () => {
//   const queryClient = useQueryClient();
//   return useMutation({
//     mutationFn: async ({
//       messageId,
//       newBody,
//       members,        // 🌟 conversation-এর সব member (publicKey সহ) — নতুন AES key encrypt করতে দরকার
//       currentUserId,  // 🌟 নিজের public key খুঁজে বের করে recipients-এ যোগ করতে দরকার
//     }: {
//       messageId: string;
//       newBody: string;
//       members: MemberForEncryption[];
//       currentUserId: string;
//     }) => {
//       const myPublicKeyPem = getMyPublicKeyPem(currentUserId);
//       if (!myPublicKeyPem) {
//         throw new Error("Your encryption key isn't set up on this device yet.");
//       }

//       const recipients: Recipient[] = [{ userId: currentUserId, publicKeyPem: myPublicKeyPem }];
//       const missingKeyFor: string[] = [];

//       members.forEach((m) => {
//         if (m.id === currentUserId) return; // আগেই যোগ করা হয়েছে
//         if (m.publicKey) {
//           recipients.push({ userId: m.id, publicKeyPem: m.publicKey });
//         } else {
//           missingKeyFor.push(m.id);
//         }
//       });

//       if (missingKeyFor.length > 0) {
//         throw new Error(
//           `Cannot edit: ${missingKeyFor.length} member(s) haven't set up encryption yet.`
//         );
//       }

//       const { encryptedBody, keys } = await encryptMessage(newBody, recipients);

//       // 🌟 ফিক্স: আগে এখানে plaintext body পাঠানো হতো ভুল route-এ (`/messages/:messageId`)।
//       // সঠিক route হলো `/messages/edit/:messageId`, এবং backend `encryptedBody`+`keys` প্রত্যাশা করে।
//       const res = await api.patch(`/messages/edit/${messageId}`, { encryptedBody, keys });
//       // 🌟 ফিক্স: res নিজেই { success, message, data: updatedMessage } — res.data সরাসরি updatedMessage
//       return res;
//     },
//     onSuccess: (_, variables) => {
//       queryClient.invalidateQueries({ queryKey: ["messages"] });
//     },
//   });
// };

// // মেসেজ ডিলিট (Delete for Everyone) করার হুক
// export const useDeleteMessageForEveryone = () => {
//   const queryClient = useQueryClient();
//   return useMutation({
//     mutationFn: async (messageId: string) => {
//       const res = await api.delete(`/messages/${messageId}`);
//       return res;
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ["messages"] });
//     },
//   });
// };

// export const useDeleteMessageForMe = () => {
//   const queryClient = useQueryClient();
//   return useMutation({
//     mutationFn: async (messageId: string) => {
//       // 🌟 ফিক্স: backend route হলো DELETE /messages/:messageId/delete-for-me
//       // (আগে messageId আর delete-for-me এর ক্রম উল্টো ছিল, 404 দিত)
//       const res = await api.delete(`/messages/${messageId}/delete-for-me`);
//       return res;
//     },
//     onSuccess: () => {
//       queryClient.invalidateQueries({ queryKey: ["messages"] });
//     },
//   });
// };