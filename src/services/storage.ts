import { supabase } from './supabase';
import { decode } from 'base64-arraybuffer';

export type StorageBucket = 'avatars' | 'rooms' | 'messages';

export interface UploadResult {
  url: string | null;
  error: string | null;
}

class StorageService {
  async uploadImage(
    bucket: StorageBucket,
    path: string,
    base64: string,
    contentType: string = 'image/jpeg'
  ): Promise<UploadResult> {
    try {
      const { error: uploadError } = await supabase.storage
       .from(bucket)
       .upload(path, decode(base64), {
          contentType,
          upsert: true,
          cacheControl: '3600',
        });

      if (uploadError) {
        return { url: null, error: uploadError.message };
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return { url: data.publicUrl, error: null };
    } catch (err: any) {
      return { url: null, error: err.message || 'فشل رفع الملف' };
    }
  }

  async deleteFile(bucket: StorageBucket, path: string): Promise<boolean> {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    return!error;
  }

  getPublicUrl(bucket: StorageBucket, path: string): string {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }

  // Helper: توليد مسار فريد
  generatePath(prefix: string, userId: string, ext: string = 'jpg'): string {
    return `${prefix}/${userId}/${Date.now()}.${ext}`;
  }
}

export const storageService = new StorageService();
