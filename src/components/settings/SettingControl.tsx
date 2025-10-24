import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import useDebounce from '@/hooks/useDebounce';
import { Check, Loader2 } from 'lucide-react';
import { useUpdateSetting } from '@/hooks/useSettings';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface OptionType {
  label: string;
  value: string;
}

interface Props {
  settingKey: string;
  category: string;
  label: string;
  description?: string;
  type?: 'switch' | 'input' | 'number' | 'textarea' | 'select';
  value: unknown;
  // options either a list for select or bounds for number
  options?: OptionType[] | { min?: number; max?: number };
  disabled?: boolean;
  // optional context value representing the current grouped value for composeValue
  context?: unknown;
  // optional function to compose the final value to send to the API using the local control value and context
  composeValue?: (local: unknown, context?: unknown) => unknown;
  // optional change callback for optimistic UI updates
  onChange?: (local: unknown) => void;
}

export default function SettingControl({ settingKey, category, label, description, type = 'input', value, options, disabled, context, composeValue, onChange }: Props) {
  const [local, setLocal] = useState<unknown>(value);
  const debounced = useDebounce(local, 500);
  const mutation = useUpdateSetting();
  const [showSaved, setShowSaved] = useState(false);
  const { toast } = useToast();

  // helper: transform per-key values (session.* expect {minutes: number})
  const transformForKey = (key: string, v: unknown) => {
    if (key.startsWith('session.timeout.')) {
      return { minutes: Number(v as unknown as number) };
    }
    return v;
  }

  useEffect(() => setLocal(value), [value]);

  useEffect(() => {
    if (debounced === value) return;
  const transformedLocal = transformForKey(settingKey, debounced);
  const transformed = composeValue ? composeValue(transformedLocal, context) : transformedLocal;
    // validate number inputs
    if (type === 'number') {
      const n = Number(debounced as unknown as number);
      if (!Number.isFinite(n)) return; // skip invalid numbers
      const bounds = options as { min?: number; max?: number } | undefined;
      if (bounds?.min !== undefined && n < bounds.min) return;
      if (bounds?.max !== undefined && n > bounds.max) return;
    }

    mutation.mutate({ category, key: settingKey, value: transformed }, {
      onSuccess: () => {
        setShowSaved(true);
        setTimeout(() => setShowSaved(false), 1500);
        toast({ title: 'Saved', description: `${label} saved.` });
        if (typeof onChange === 'function') {
          try { onChange(debounced); } catch (e) { console.debug(e); }
        }
      },
      onError: (err: unknown) => {
        toast({ title: 'Save failed', description: (err as Error)?.message || 'Failed to save', variant: 'destructive' });
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium">{label}</Label>
      {type === 'switch' ? (
        <div className="flex items-center gap-4">
          <Switch checked={!!local} onCheckedChange={(v) => setLocal(v)} disabled={disabled} />
          <div className="text-sm text-muted-foreground">{description}</div>
        </div>
      ) : type === 'select' ? (
        <Select onValueChange={(v) => setLocal(v)}>
          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Array.isArray(options) ? options : []).map((o: OptionType) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      ) : type === 'textarea' ? (
        <Textarea value={String(local ?? '')} onChange={(e) => setLocal(e.target.value)} placeholder={description} />
      ) : (
        <div className="flex items-center gap-2">
          <Input type={type === 'number' ? 'number' : 'text'} value={String(local ?? '')} onChange={(e) => {
            if (type === 'number') {
              const nextNum = Number(e.target.value);
              if (!Number.isFinite(nextNum)) {
                setLocal(e.target.value);
                return;
              }
              const bounds = options as { min?: number; max?: number } | undefined;
              if (bounds?.min !== undefined && nextNum < bounds.min) {
                setLocal(nextNum);
                return;
              }
              if (bounds?.max !== undefined && nextNum > bounds.max) {
                setLocal(nextNum);
                return;
              }
              setLocal(nextNum);
            } else {
              setLocal(e.target.value);
            }
          }} min={(options as { min?: number } | undefined)?.min} max={(options as { max?: number } | undefined)?.max} disabled={disabled} />
          <div className="w-6 h-6 flex items-center justify-center">
            {(mutation as unknown as { isLoading?: boolean }).isLoading ? <Loader2 className="animate-spin" /> : showSaved ? <Check className="text-success" /> : null}
          </div>
        </div>
      )}
      {mutation.isError && <div className="text-sm text-destructive">Failed to save</div>}
    </div>
  )
}
