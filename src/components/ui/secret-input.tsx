import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "./button"
import { Input } from "./input"
import { type InputHTMLAttributes } from "react"

type InputProps = InputHTMLAttributes<HTMLInputElement>
import { cn } from "@/lib/utils"

interface SecretInputProps extends Omit<InputProps, 'type'> {
  isSecret?: boolean;
  secretPlaceholder?: string;
}

export function SecretInput({
  className,
  isSecret = true,
  secretPlaceholder = "••••••••",
  ...props
}: SecretInputProps) {
  const [showSecret, setShowSecret] = useState(false)

  return (
    <div className="relative">
      <Input
        type={showSecret ? "text" : "password"}
        className={cn("pr-10", className)}
        placeholder={isSecret ? secretPlaceholder : props.placeholder}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
        onClick={() => setShowSecret(!showSecret)}
        tabIndex={-1}
      >
        {showSecret ? (
          <EyeOff className="h-4 w-4 text-gray-400" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4 text-gray-400" aria-hidden="true" />
        )}
        <span className="sr-only">
          {showSecret ? "Hide secret" : "Show secret"}
        </span>
      </Button>
    </div>
  )
}