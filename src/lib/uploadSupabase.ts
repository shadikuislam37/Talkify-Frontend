import { createClient } from "@supabase/supabase-js";

// আপনার Supabase URL এবং Anon Key দিন
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export const uploadFileToSupabase = async (file: File): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `chat-images/${fileName}`;

    // 🌟 ১. ফাইল আপলোড (chat-uploads বাকটে)
    const { data, error } = await supabaseClient.storage
      .from('chat-uploads') 
      .upload(filePath, file);

    if (error) {
      console.error("Supabase Upload Error:", error);
      return null;
    }

    // 🌟 ২. পাবলিক ইউআরএল নেওয়া (অবশ্যই একই বাকট 'chat-uploads' হতে হবে)
    const { data: publicUrlData } = supabaseClient.storage
      .from('chat-uploads') // ⚠️ আগে এখানে 'chat-media' লেখা ছিল, যা ঠিক করে 'chat-uploads' করা হলো
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.error("Upload failed:", err);
    return null;
  }
};