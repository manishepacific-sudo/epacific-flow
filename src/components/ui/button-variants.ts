import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 hover:scale-[1.02] active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-glow-blue",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground shadow-sm",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 shadow-sm",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        hero: "bg-gradient-to-r from-primary via-primary-glow to-primary text-primary-foreground hover:opacity-90 shadow-glow hover:shadow-glow-purple animate-gradient bg-[length:200%_auto]",
        success: "bg-success text-success-foreground hover:bg-success/90 hover:shadow-glow",
        warning: "bg-yellow-600 text-white hover:bg-yellow-700 shadow-sm hover:shadow-yellow-500/25",
        premium: "bg-gradient-to-r from-purple-600 via-pink-500 to-blue-600 text-white hover:from-purple-700 hover:via-pink-600 hover:to-blue-700 shadow-xl hover:shadow-glow-purple",
        glass: "backdrop-blur-md bg-white/10 dark:bg-slate-800/20 border border-white/20 dark:border-slate-700/30 hover:bg-white/20 dark:hover:bg-slate-800/30 shadow-lg",
        "gradient-purple": "bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-600 text-white hover:from-purple-700 hover:via-purple-600 hover:to-indigo-700 shadow-lg hover:shadow-glow-purple",
        "gradient-ocean": "bg-gradient-to-r from-blue-600 via-cyan-500 to-teal-600 text-white hover:from-blue-700 hover:via-cyan-600 hover:to-teal-700 shadow-lg hover:shadow-glow-blue",
        modern: "bg-gradient-to-br from-primary to-primary-glow text-primary-foreground hover:opacity-90 shadow-md hover:shadow-glow",
      },
      size: {
        default: "h-10 px-4 py-2 rounded-xl",
        sm: "h-9 rounded-xl px-3",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);