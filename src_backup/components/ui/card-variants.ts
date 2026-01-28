import { cva } from "class-variance-authority";

export const cardVariants = cva(
  "rounded-2xl border bg-card text-card-foreground transition-all duration-300 flex flex-col gap-4",
  {
    variants: {
      variant: {
        default: "shadow-sm hover:shadow-md hover:border-border/80",
        elevated: "shadow-elevated hover:shadow-glow hover:-translate-y-1 border-border/50",
        interactive: "hover:border-primary/50 hover:shadow-lg hover:-translate-y-0.5 cursor-pointer active:scale-[0.98]",
        glass: "backdrop-blur-xl bg-white/10 dark:bg-slate-800/40 border-white/20 dark:border-slate-700/50 hover:bg-white/20 dark:hover:bg-slate-800/60 shadow-glass hover:shadow-glow",
        gradient: "bg-gradient-vibrant text-white border-transparent shadow-lg hover:shadow-glow-purple hover:scale-[1.02]",
        modern: "bg-card border-border/50 shadow-sm hover:-translate-y-1 hover:shadow-glow-purple transition-all duration-500 ease-out"
      },
      size: {
        default: "p-6 [&>*:last-child]:pb-4 [&>*:first-child]:pt-4",
        sm: "p-4 [&>*:last-child]:pb-2 [&>*:first-child]:pt-2",
        lg: "p-8 [&>*:last-child]:pb-6 [&>*:first-child]:pt-6"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
);