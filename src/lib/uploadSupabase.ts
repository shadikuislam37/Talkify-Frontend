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

    const { data, error } = await supabaseClient.storage
      .from('chat-uploads') // আপনার Bucket Name
      .upload(filePath, file);

    if (error) {
      console.error("Supabase Upload Error:", error);
      return null;
    }

    const { data: publicUrlData } = supabaseClient.storage
      .from('chat-media')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.error("Upload failed:", err);
    return null;
  }
};