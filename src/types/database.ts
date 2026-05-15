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
          content: string | null;
          image_url: string | null;
          edited: boolean;
          created_at: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          user1_id: string;
          user2_id: string;
          created_at: string;
        };
      };
      direct_messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string | null;
          image_url: string | null;
          edited: boolean;
          read: boolean;
          created_at: string;
        };
      };
      blocks: {
        Row: {
          id: string;
          blocker_id: string;
          blocked_id: string;
          created_at: string;
        };
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          reported_id: string | null;
          room_id: string | null;
          message_id: string | null;
          reason: string;
          status: 'pending' | 'reviewed' | 'resolved';
          created_at: string;
        };
      };
      room_bans: {
        Row: {
          id: string;
          room_id: string;
          user_id: string;
          banned_by: string;
          reason: string | null;
          created_at: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: 'message' | 'mention' | 'report' | 'ban' | 'room_invite' | 'direct_message';
          title: string;
          body: string | null;
          data: Json;
          read: boolean;
          created_at: string;
        };
      };
      user_settings: {
        Row: {
          user_id: string;
          notifications_enabled: boolean;
          sound_enabled: boolean;
          vibration_enabled: boolean;
          updated_at: string;
        };
      };
    };
  };
}
