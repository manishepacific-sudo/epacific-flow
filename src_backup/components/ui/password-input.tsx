import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Input } from './input'
import { Button } from './button'
import { cn } from '@/lib/utils'

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  showPassword?: boolean
  onShowPasswordChange?: (show: boolean) => void
  className?: string
}

export function PasswordInput({
  className,
  showPassword,
  onShowPasswordChange,
  ...props
}: PasswordInputProps) {
  const [showPasswordLocal, setShowPasswordLocal] = useState(false)
  const show = showPassword !== undefined ? showPassword : showPasswordLocal

  const toggleShow = () => {
    if (onShowPasswordChange) {
      onShowPasswordChange(!show)
    } else {
      setShowPasswordLocal(!show)
    }
  }

  return (
    <div className="relative">
      <Input
        type={show ? 'text' : 'password'}
        className={cn('pr-10', className)}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
        onClick={toggleShow}
        tabIndex={-1}
      >
        {show ? (
          <EyeOff className="h-4 w-4 text-muted-foreground" />
        ) : (
          <Eye className="h-4 w-4 text-muted-foreground" />
        )}
      </Button>
    </div>
  )
}