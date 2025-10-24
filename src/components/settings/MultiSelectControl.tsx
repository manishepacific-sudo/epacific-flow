import { useEffect, useMemo, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useUpdateSetting } from '@/hooks/useSettings';
import useDebounce from '@/hooks/useDebounce';
import { useToast } from '@/hooks/use-toast';
import { X } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface Props {
  settingKey: string;
  category: string;
  label: string;
  description?: string;
  options: Option[];
  value?: string[] | { assigned: string[] };
  onChange?: (vals: string[] | { assigned: string[] }) => void;
  composeValue?: (vals: string[]) => unknown; // optional override similar to SettingControl
}

export default function MultiSelectControl({ settingKey, category, label, description, options, value = [], onChange, composeValue }: Props) {
  // normalize incoming value to string[] (support { assigned: [] } shape)
  const initial = useMemo(() => {
    if (Array.isArray(value)) return value as string[];
  if ((value as unknown as { assigned?: unknown })?.assigned) return (value as unknown as { assigned: string[] }).assigned as string[];
    return [] as string[];
  }, [value]);

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>(initial || []);
  const debounced = useDebounce(selected, 400);
  const mutation = useUpdateSetting();
  const { toast } = useToast();

  useEffect(() => setSelected(initial || []), [initial]);

  useEffect(() => {
  const current = Array.isArray(value) ? (value as string[]) : ((value as unknown as { assigned?: string[] })?.assigned || []);
    if (JSON.stringify(debounced) === JSON.stringify(current || [])) return;
    const payload = composeValue ? composeValue(debounced) : { assigned: debounced };
    mutation.mutate({ category, key: settingKey, value: payload }, {
      onSuccess: () => {
        toast({ title: 'Saved', description: `${label} saved.` });
        onChange?.(Array.isArray(value) ? debounced : { assigned: debounced });
      },
      onError: (err: unknown) => {
        toast({ title: 'Save failed', description: (err as Error)?.message || 'Failed to save', variant: 'destructive' });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  const filtered = options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()) || o.value.toLowerCase().includes(query.toLowerCase()));

  const toggle = (v: string) => {
    setSelected(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">{label}</div>
          {description && <div className="text-sm text-muted-foreground">{description}</div>}
        </div>
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="min-w-[140px] justify-between">
                <span className="truncate">{selected.length === 0 ? 'None' : `${selected.length} selected`}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px]">
              <div className="space-y-2">
                <Command>
                  <CommandInput value={query} onValueChange={(v: string) => setQuery(v)} placeholder={`Search ${label}...`} />
                  <CommandList>
                    {filtered.length === 0 && <CommandEmpty>No results</CommandEmpty>}
                    {filtered.map(o => (
                      <CommandItem key={o.value} onSelect={() => toggle(o.value)}>
                        <div className="flex items-center justify-between w-full">
                          <div className="truncate">{o.label}</div>
                          <div className="text-sm text-muted-foreground">{selected.includes(o.value) ? 'Selected' : ''}</div>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandList>
                </Command>
                <div className="flex flex-wrap gap-2">
                  {selected.map(s => {
                    const opt = options.find(o => o.value === s);
                    return (
                      <Badge key={s} className="inline-flex items-center gap-2">
                        <span>{opt?.label ?? s}</span>
                        <button aria-label={`Remove ${s}`} onClick={() => toggle(s)} className="-mr-2 p-1">
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    )
                  })}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  )
}
