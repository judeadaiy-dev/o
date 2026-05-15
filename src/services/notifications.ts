import notifee, { AndroidImportance, AndroidStyle, EventType } from '@notifee/react-native';
import { supabase } from './supabase';
import { Platform } from 'react-native';

export type NotificationType = 'message' | 'mention' | 'report' | 'ban' | 'room_invite' | 'direct_message';

export interface NotificationPayload {
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
  image_url?: string;
}

class NotificationService {
  private channels = {
    messages: 'messages',
    moderation: 'moderation',
    system: 'system',
  };

  async init(): Promise<void> {
    if (Platform.OS === 'android') {
      await notifee.createChannels([
        {
          id: this.channels.messages,
          name: 'الرسائل',
          description: 'إشعارات الرسائل والدردشات',
          importance: AndroidImportance.HIGH,
          sound: 'default',
          vibration: true,
        },
        {
          id: this.channels.moderation,
          name: 'الإدارة',
          description: 'إشعارات الحظر والتبليغات',
          importance: AndroidImportance.HIGH,
          sound: 'default',
        },
        {
          id: this.channels.system,
          name: 'النظام',
          importance: AndroidImportance.DEFAULT,
        },
      ]);
    }

    notifee.onForegroundEvent(({ type, detail }) => {
      if (type === EventType.PRESS) {
        this.handleNotificationPress(detail.notification?.data);
      }
    });

    notifee.onBackgroundEvent(async ({ type, detail }) => {
      if (type === EventType.PRESS) {
        this.handleNotificationPress(detail.notification?.data);
      }
    });
  }

  async requestPermission(): Promise<boolean> {
    const settings = await notifee.requestPermission();
    return settings.authorizationStatus >= 1;
  }

  async sendLocal(payload: NotificationPayload): Promise<void> {
    const channelId = this.getChannelId(payload.type);

    await notifee.displayNotification({
      id: `${payload.type}-${Date.now()}`,
      title: payload.title,
      body: payload.body,
      data: payload.data,
      android: {
        channelId,
        smallIcon: 'ic_notification',
        largeIcon: payload.image_url,
        style: payload.image_url
         ? { type: AndroidStyle.BIGPICTURE, picture: payload.image_url }
          : { type: AndroidStyle.BIGTEXT, text: payload.body },
        pressAction: { id: 'default' },
        actions: this.getActions(payload.type),
      },
      ios: {
        sound: 'default',
        categoryId: payload.type,
      },
    });
  }

  async save(payload: NotificationPayload): Promise<string | null> {
    const { data, error } = await supabase
     .from('notifications')
     .insert({
        user_id: payload.user_id,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        data: payload.data || {},
        read: false,
      })
     .select('id')
     .single();

    if (error) {
      console.error('Failed to save notification:', error);
      return null;
    }

    return data.id;
  }

  async send(payload: NotificationPayload): Promise<void> {
    await Promise.all([this.sendLocal(payload), this.save(payload)]);
  }

  async getUnreadCount(userId: string): Promise<number> {
    const { count, error } = await supabase
     .from('notifications')
     .select('*', { count: 'exact', head: true })
     .eq('user_id', userId)
     .eq('read', false);

    if (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }

    return count || 0;
  }

  async getNotifications(userId: string, limit = 50): Promise<any[]> {
    const { data, error } = await supabase
     .from('notifications')
     .select('*')
     .eq('user_id', userId)
     .order('created_at', { ascending: false })
     .limit(limit);

    if (error) {
      console.error('Failed to get notifications:', error);
      return [];
    }

    return data || [];
  }

  async markAsRead(notificationId: string): Promise<void> {
    await supabase
     .from('notifications')
     .update({ read: true })
     .eq('id', notificationId);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await supabase
     .from('notifications')
     .update({ read: true })
     .eq('user_id', userId)
     .eq('read', false);
  }

  subscribe(userId: string, callback: (payload: NotificationPayload) => void) {
    return supabase
     .channel(`notifications:${userId}`)
     .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const notification = payload.new as NotificationPayload;
          this.sendLocal(notification);
          callback(notification);
        }
      )
     .subscribe();
  }

  private getChannelId(type: NotificationType): string {
    if (['message', 'direct_message', 'mention'].includes(type)) return this.channels.messages;
    if (['ban', 'report'].includes(type)) return this.channels.moderation;
    return this.channels.system;
  }

  private getActions(type: NotificationType) {
    if (type === 'message' || type === 'direct_message') {
      return [{ title: 'رد', pressAction: { id: 'reply' } }];
    }
    return undefined;
  }

  private handleNotificationPress(data: any) {
    // Navigation logic here - يتم ربطها مع NavigationContainer
    console.log('Notification pressed:', data);
  }

  async cancelAll(): Promise<void> {
    await notifee.cancelAllNotifications();
  }
}

export const notificationService = new NotificationService();
