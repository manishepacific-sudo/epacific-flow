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
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('target_role', profile.role)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount((data || []).filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

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
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('target_role', profile.role)
        .eq('read', false);

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