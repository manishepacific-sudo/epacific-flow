import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format, isValid } from 'date-fns';
import useDebounce from '@/hooks/useDebounce';
import { useUpdateSetting } from '@/hooks/useSettings';
import { Calendar as CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  settingKey: string;
  category: string;
  label: string;
  description?: string;
  value: string | null | undefined; // ISO date or sentinel like 'last_day_of_month'
  onChange?: (value: string) => void;
  allowPresets?: boolean;
}

export default function DatePickerControl({ settingKey, category, label, description, value, onChange, allowPresets = true }: Props) {
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState<string | null>(value ?? null);
  const debounced = useDebounce(local, 500);
  const mutation = useUpdateSetting();
  const { toast } = useToast();

  useEffect(() => setLocal(value ?? null), [value]);

  useEffect(() => {
    if (debounced === value) return;
    // build payload for deadline
    const payload = { deadline: debounced };
    mutation.mutate({ category, key: settingKey, value: payload }, {
      onSuccess: () => {
        toast({ title: 'Saved', description: `${label} saved.` });
        if (onChange) onChange(String(debounced ?? ''));
      },
      onError: (err: unknown) => {
        toast({ title: 'Save failed', description: (err as Error)?.message || 'Failed to save', variant: 'destructive' });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const parseToDate = (v?: string | null): Date | undefined => {
    if (!v) return undefined;
    if (v === 'last_day_of_month' || v === 'fifteenth_of_month') return undefined;
    try {
      const d = new Date(v);
      return isValid(d) ? d : undefined;
    } catch { return undefined }
  }

  const displayLabel = (v?: string | null) => {
    if (!v) return 'None';
    if (v === 'last_day_of_month') return 'Last day of month';
    const d = parseToDate(v);
    if (d instanceof Date) return format(d, 'PPP');
    return String(v);
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">{label}</div>
          {description && <div className="text-sm text-muted-foreground">{description}</div>}
        </div>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <CalendarIcon className="w-4 h-4" />
              {displayLabel(local)}
            </Button>
          </PopoverTrigger>
          <PopoverContent>
            <div className="space-y-2">
              {allowPresets && (
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setLocal('last_day_of_month')}>Last day of month</Button>
                  <Button variant="ghost" onClick={() => setLocal('fifteenth_of_month')}>15th of month</Button>
                  <Button variant="ghost" onClick={() => setLocal((new Date()).toISOString())}>Today</Button>
                </div>
              )}
              <Calendar
                mode="single"
                selected={parseToDate(local)}
                onSelect={(d?: Date) => {
                  if (!d) return;
                  const iso = d.toISOString();
                  setLocal(iso);
                }}
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
