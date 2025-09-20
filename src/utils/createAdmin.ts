import { supabase } from '@/integrations/supabase/client';

export const createAdminAccount = async () => {
  try {
    // Use the manageUser edge function to create a real admin account
    const { data, error } = await supabase.functions.invoke('manageUser', {
      body: {
        action: 'create',
        data: {
          email: 'admin@epacific.com',
          role: 'admin',
          full_name: 'Admin User',
          mobile_number: '1234567890',
          station_id: 'HQ001',
          center_address: 'Head Office'
        }
      }
    });

    if (error) {
      console.error('Error creating admin account:', error);
      return { success: false, error };
    }

    console.log('Admin account created successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Failed to create admin account:', error);
    return { success: false, error };
  }
};