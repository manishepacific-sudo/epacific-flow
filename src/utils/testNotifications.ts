import { supabase } from '@/integrations/supabase/client';

export async function createTestNotifications() {
  try {
    const { data, error } = await supabase.functions.invoke('create-test-notifications');
    
    if (error) {
      console.error('Error creating test notifications:', error);
      return { success: false, error: error.message };
    }

    console.log('Test notifications created:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error invoking function:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}