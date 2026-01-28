import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface UpdateSettingParams {
  category: string;
  key: string;
  value: unknown;
}

export function useUpdateSetting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ category, key, value }: UpdateSettingParams) => {
      const { data, error } = await supabase.functions.invoke('manage-settings', {
        body: {
          action: 'update',
          payload: { category, key, value }
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // Invalidate settings queries to refetch
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    }
  });
}
