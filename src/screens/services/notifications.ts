import { supabase } from './supabase';
import notifee, { AndroidImportance } from '@notifee/react-native';

export type NotificationPayload = {
  user_id: string;
  type: 'message' | 'mention' | 'report' | 'ban' | 'room_invite';
  title: string;
  body: string;
  data?: Record<string, any>;
};

class NotificationService {
  async init() {
    // طلب صلاحية الإشعارات
    await notifee.requestPermission();

    // انشاء channel للأندرويد
    await notifee.createChannel({
      id: 'messages',
      name: 'الرسائل',
      importance: AndroidImportance.HIGH,
      sound: 'default',
    });

    await notifee.createChannel({
      id: 'moderation',
      name: 'الإدارة',
      importance: AndroidImportance.HIGH,
    });
  }

  async sendLocalNotification(payload: NotificationPayload) {
    const channelId = payload.type === 'message'? 'messages' : 'moderation';

    await notifee.displayNotification({
      title: payload.title,
      body: payload.body,
      android: {
        channelId,
        smallIcon: 'ic_launcher',
        pressAction: { id: 'default' },
      },
      data: payload.data,
    });
  }

  async saveNotification(payload: NotificationPayload) {
    const { error } = await supabase.from('notifications').insert(payload);
    if (error) console.error('Failed to save notification:', error);
  }

  async getUnreadCount(userId: string): Promise<number> {
    const { count } = await supabase
   .from('notifications')
   .select('*', { count: 'exact', head: true })
   .eq('user_id', userId)
   .eq('read', false);

    return count || 0;
  }

  async markAsRead(notificationId: string) {
    await supabase
   .from('notifications')
   .update({ read: true })
   .eq('id', notificationId);
  }

  async markAllAsRead(userId: string) {
    await supabase
   .from('notifications')
   .update({ read: true })
   .eq('user_id', userId)
   .eq('read', false);
  }

  subscribeToNotifications(userId: string, callback: (notification: any) => void) {
    return supabase
   .channel(`notifications:${userId}`)
   .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          callback(payload.new);
          this.sendLocalNotification(payload.new as NotificationPayload);
        }
      )
   .subscribe();
  }
}

export const notificationService = new NotificationService();
