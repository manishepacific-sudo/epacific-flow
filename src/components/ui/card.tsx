import * as React from "react";
<<<<<<< HEAD

import { cn } from "@/lib/utils";

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("rounded-lg border bg-card text-card-foreground shadow-sm", className)} {...props} />
=======
import { type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { cardVariants } from "./card-variants";

interface CardProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, variant, size, ...props }, ref) => (
  <div ref={ref} className={cn(cardVariants({ variant, size, className }))} {...props} />
>>>>>>> feature/settings-management
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
<<<<<<< HEAD
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
=======
    <div ref={ref} className={cn("flex flex-col gap-1.5 mb-2", className)} {...props} />
>>>>>>> feature/settings-management
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
<<<<<<< HEAD
    <h3 ref={ref} className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />
=======
    <h3 ref={ref} className={cn("text-xl font-display font-semibold leading-tight tracking-tight", className)} {...props} />
>>>>>>> feature/settings-management
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
<<<<<<< HEAD
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
=======
    <p ref={ref} className={cn("text-sm text-muted-foreground leading-relaxed tracking-wide", className)} {...props} />
>>>>>>> feature/settings-management
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
<<<<<<< HEAD
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />,
=======
  ({ className, ...props }, ref) => <div ref={ref} className={cn("flex-1", className)} {...props} />,
>>>>>>> feature/settings-management
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
<<<<<<< HEAD
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
=======
    <div ref={ref} className={cn("flex items-center gap-4 mt-4 border-t pt-4", className)} {...props} />
>>>>>>> feature/settings-management
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
