export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          email: string | null;
          avatar_url: string | null;
          bio: string | null;
          role: 'user' | 'admin' | 'moderator';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          email?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          role?: 'user' | 'admin' | 'moderator';
        };
        Update: {
          username?: string;
          email?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          role?: 'user' | 'admin' | 'moderator';
        };
      };
      rooms: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          image: string | null;
          created_by: string;
          created_at: string;
        };
      };
      messages: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
