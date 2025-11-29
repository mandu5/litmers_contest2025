/**
 * Badge Component
 * 
 * Small status indicators and labels.
 */
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default:
          'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200',
        secondary:
          'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
        success:
          'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
        warning:
          'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
        destructive:
          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        outline:
          'border border-slate-200 text-slate-900 dark:border-slate-700 dark:text-slate-100',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  color?: string;
}

function Badge({ className, variant, color, style, ...props }: BadgeProps) {
  const customStyle = color
    ? {
        backgroundColor: `${color}20`,
        color: color,
        borderColor: color,
        ...style,
      }
    : style;

  return (
    <div
      className={cn(badgeVariants({ variant }), className)}
      style={customStyle}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
