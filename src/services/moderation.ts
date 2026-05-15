import { supabase, handleSupabaseError } from './supabase';
import { notificationService } from './notifications';

export interface BlockUser {
  id: string;
  blocked_id: string;
  blocked_user: {
    username: string;
    avatar_url: string | null;
  };
  created_at: string;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_id?: string;
  room_id?: string;
  message_id?: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved';
  created_at: string;
}

export interface RoomBan {
  id: string;
  room_id: string;
  user_id: string;
  banned_by: string;
  reason: string | null;
  created_at: string;
}

class ModerationService {
  // الحظر بين المستخدمين
  async blockUser(userId: string, targetUserId: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.from('blocks').insert({
      blocker_id: userId,
      blocked_id: targetUserId,
    });

    if (error) {
      return { success: false, error: handleSupabaseError(error) };
    }

    return { success: true };
  }

  async unblockUser(userId: string, targetUserId: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
     .from('blocks')
     .delete()
     .eq('blocker_id', userId)
     .eq('blocked_id', targetUserId);

    if (error) {
      return { success: false, error: handleSupabaseError(error) };
    }

    return { success: true };
  }

  async getBlockedUsers(userId: string): Promise<BlockUser[]> {
    const { data, error } = await supabase
     .from('blocks')
     .select('*, blocked_user:blocked_id(username, avatar_url)')
     .eq('blocker_id', userId)
     .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get blocked users:', error);
      return [];
    }

    return data as BlockUser[];
  }

  async isBlocked(userId: string, targetUserId: string): Promise<boolean> {
    const { data } = await supabase
     .from('blocks')
     .select('id')
     .eq('blocker_id', userId)
     .eq('blocked_id', targetUserId)
     .maybeSingle();

    return!!data;
  }

  async isBlockedBy(userId: string, targetUserId: string): Promise<boolean> {
    const { data } = await supabase
     .from('blocks')
     .select('id')
     .eq('blocker_id', targetUserId)
     .eq('blocked_id', userId)
     .maybeSingle();

    return!!data;
  }

  // التبليغات
  async reportUser(
    reporterId: string,
    reportedId: string,
    reason: string,
    context?: { roomId?: string; messageId?: string }
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.from('reports').insert({
      reporter_id: reporterId,
      reported_id: reportedId,
      room_id: context?.roomId,
      message_id: context?.messageId,
      reason,
      status: 'pending',
    });

    if (error) {
      return { success: false, error: handleSupabaseError(error) };
    }

    // إشعار الإدارة - اختياري
    await this.notifyAdmins('تبليغ جديد', reason);

    return { success: true };
  }

  async getReports(status?: 'pending' | 'reviewed' | 'resolved'): Promise<Report[]> {
    let query = supabase
     .from('reports')
     .select('*')
     .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Failed to get reports:', error);
      return [];
    }

    return data as Report[];
  }

  // حظر من الغرف
  async banFromRoom(
    roomId: string,
    userId: string,
    bannedBy: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.from('room_bans').insert({
      room_id: roomId,
      user_id: userId,
      banned_by: bannedBy,
      reason,
    });

    if (error) {
      return { success: false, error: handleSupabaseError(error) };
    }

    // إشعار المستخدم المحظور
    await notificationService.send({
      user_id: userId,
      type: 'ban',
      title: 'تم حظرك من غرفة',
      body: reason || 'تم حظرك من الغرفة بواسطة الإدارة',
      data: { roomId, type: 'room_ban' },
    });

    return { success: true };
  }

  async unbanFromRoom(roomId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
     .from('room_bans')
     .delete()
     .eq('room_id', roomId)
     .eq('user_id', userId);

    if (error) {
      return { success: false, error: handleSupabaseError(error) };
    }

    return { success: true };
  }

  async isBannedFromRoom(roomId: string, userId: string): Promise<boolean> {
    const { data } = await supabase
     .from('room_bans')
     .select('id')
     .eq('room_id', roomId)
     .eq('user_id', userId)
     .maybeSingle();

    return!!data;
  }

  async getRoomBans(roomId: string): Promise<RoomBan[]> {
    const { data, error } = await supabase
     .from('room_bans')
     .select('*')
     .eq('room_id', roomId)
     .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to get room bans:', error);
      return [];
    }

    return data as RoomBan[];
  }

  private async notifyAdmins(title: string, body: string): Promise<void> {
    // جلب الأدمنز من جدول profiles أو roles
    const { data: admins } = await supabase
     .from('profiles')
     .select('id')
     .eq('role', 'admin');

    if (admins) {
      await Promise.all(
        admins.map((admin) =>
          notificationService.send({
            user_id: admin.id,
            type: 'report',
            title,
            body,
          })
        )
      );
    }
  }
}

export const moderationService = new ModerationService();
