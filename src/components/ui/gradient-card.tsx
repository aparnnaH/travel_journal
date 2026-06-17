'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/utils/cn';

const cardVariants = cva(
  'relative flex h-full w-full flex-col justify-between overflow-hidden rounded-2xl p-8 shadow-sm transition-shadow duration-300 hover:shadow-lg',
  {
    variants: {
      gradient: {
        orange: 'bg-gradient-to-br from-orange-100 to-amber-200/50',
        gray: 'bg-gradient-to-br from-slate-100 to-slate-200/50',
        purple: 'bg-gradient-to-br from-purple-100 to-indigo-200/50',
        green: 'bg-gradient-to-br from-emerald-100 to-teal-200/50',
      },
    },
    defaultVariants: {
      gradient: 'gray',
    },
  }
);

export interface GradientCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  badgeText: string;
  badgeColor: string;
  title: string;
  description: string;
  ctaText: string;
  ctaHref: string;
  imageUrl: string;
}

const GradientCard = React.forwardRef<HTMLDivElement, GradientCardProps>(
  (
    {
      className,
      gradient,
      badgeText,
      badgeColor,
      title,
      description,
      ctaText,
      ctaHref,
      imageUrl,
      ...props
    },
    ref
  ) => {
    const cardAnimation = {
      rest: { scale: 1, y: 0 },
      hover: { scale: 1.03, y: -4 },
    };

    const imageAnimation = {
      rest: { scale: 1, rotate: 0 },
      hover: { scale: 1.1, rotate: 3 },
    };

    return (
      <motion.div
        variants={cardAnimation}
        initial="rest"
        animate="rest"
        whileHover="hover"
        className="h-full"
        ref={ref}
      >
        <div className={cn(cardVariants({ gradient }), className)} {...props}>
          <motion.img
            src={imageUrl}
            alt={`${title} background graphic`}
            variants={imageAnimation}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className="pointer-events-none absolute bottom-6 right-6 h-28 w-28 object-contain opacity-80 sm:h-36 sm:w-36"
          />

          <div className="z-10 flex h-full flex-col">
            <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full bg-background/50 px-3 py-1 text-sm font-medium text-foreground/80 backdrop-blur-sm">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: badgeColor }} />
              {badgeText}
            </div>

            <div className="max-w-sm flex-grow">
              <h3 className="mb-2 text-2xl font-bold text-foreground">{title}</h3>
              <p className="max-w-xs text-foreground/70">{description}</p>
            </div>

            <a
              href={ctaHref}
              className="group mt-6 inline-flex w-fit items-center gap-2 text-sm font-semibold text-foreground"
            >
              {ctaText}
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </a>
          </div>
        </div>
      </motion.div>
    );
  }
);

GradientCard.displayName = 'GradientCard';

export { GradientCard, cardVariants };
