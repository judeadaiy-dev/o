import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database';

const supabaseUrl = 'https://jmsmrojtlstppnpwmkkk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imptc21yb2p0bHN0cHBucHdta2trIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4MTg2NDAsImV4cCI6MjA4ODM5NDY0MH0.j7gxr5CvrfvbJJzK_pMwVHiCE2AqpXUTThpeLEBmsos';

export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
    global: {
      headers: {
        'X-Client-Info': 'seachat-rn/1.0.0',
      },
    },
  }
);

// Helper للـ Error Handling
export const handleSupabaseError = (error: any): string => {
  if (!error) return '';
  if (error.message.includes('JWT')) return 'انتهت صلاحية الجلسة، سجل دخول مرة ثانية';
  if (error.message.includes('duplicate key')) return 'الاسم مستخدم بالفعل';
  if (error.message.includes('network')) return 'مشكلة في الاتصال بالإنترنت';
  return error.message || 'حدث خطأ غير متوقع';
};
