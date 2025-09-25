import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';

interface NotificationData {
  id: string;
  type: 'report_uploaded' | 'payment_submitted' | 'report_rejected' | 'payment_rejected';
  title: string;
  message: string;
  created_at: string;
  read: boolean;
  user_id: string;
  target_role: 'admin' | 'manager' | 'user';
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { profile } = useAuth();

  useEffect(() => {
    if (!profile?.role) return;

    // Fetch existing notifications
    fetchNotifications();

    // Set up real-time subscription for new notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `target_role=eq.${profile.role}`,
        },
        (payload) => {
          const newNotification = payload.new as NotificationData;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.role]);

  const fetchNotifications = async () => {
    if (!profile?.role) return;

    try {
      // Use rpc to bypass TypeScript typing issues with new table
      const { data, error } = await supabase.rpc('get_notifications_for_role', {
        target_role_param: profile.role
      });

      if (error) {
        console.log('Error fetching notifications (expected if table is new):', error);
        return;
      }

      const typedData = (data || []) as NotificationData[];
      setNotifications(typedData);
      setUnreadCount(typedData.filter(n => !n.read).length);
    } catch (error) {
      console.log('Error fetching notifications (expected if table is new):', error);
      // Fallback: set empty state instead of failing
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // Use rpc to bypass TypeScript typing issues
      const { error } = await supabase.rpc('mark_notification_read', {
        notification_id: notificationId
      });

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!profile?.role) return;

    try {
      // Use rpc to bypass TypeScript typing issues
      const { error } = await supabase.rpc('mark_all_notifications_read', {
        target_role_param: profile.role
      });

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications
  };
}