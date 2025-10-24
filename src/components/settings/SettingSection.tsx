import { ReactNode } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';

interface Props {
  title: string;
  description?: string;
  children?: ReactNode;
  lastUpdatedBy?: string;
  lastUpdatedAt?: string;
  className?: string;
  isSaving?: boolean;
}

export default function SettingSection({ title, description, children, lastUpdatedBy, lastUpdatedAt, className, isSaving }: Props) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <div className="text-sm text-muted-foreground mt-1">{description}</div>}
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
      <CardFooter>
        <div className="text-sm text-muted-foreground w-full flex items-center justify-between">
          <div>
            {lastUpdatedBy && lastUpdatedAt ? (
              <>Last updated by {lastUpdatedBy} on {format(new Date(lastUpdatedAt), "MMM dd, yyyy 'at' HH:mm")}</>
            ) : (
              <>Not updated yet</>
            )}
          </div>
          <div>{isSaving ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}</div>
        </div>
      </CardFooter>
    </Card>
  )
}
