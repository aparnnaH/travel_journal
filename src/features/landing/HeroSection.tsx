// Landing-page hero section.
// Presents the primary product promise and routes users toward the map-first
// experience.
'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { LandingWorldMap } from './LandingWorldMap';

// Renders the first viewport of the public home page.
export function HeroSection() {
  const user = useAuthStore((state) => state.user);
  const ctaHref = user ? '/dashboard' : '/map';
  const ctaLabel = user ? 'Continue Your Journey' : 'Start Your Journey';

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
        delayChildren: 0.3,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.8 },
    },
  };

  return (
    <section className="relative pt-16 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      <motion.div
        className="container mx-auto max-w-6xl relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={itemVariants} className="text-center mb-6">
          <span className="inline-block px-4 py-2 bg-gold/20 border border-gold/50 rounded-full text-sm font-medium text-gold-deep">
            Document Your Journey
          </span>
        </motion.div>

        <motion.h1
          variants={itemVariants}
          className="text-5xl sm:text-6xl lg:text-7xl font-serif font-bold text-ink mb-6 text-center leading-tight"
        >
          Collect Moments,
          <span className="block text-gold-deep">Not Things</span>
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="text-lg sm:text-xl text-ink/70 text-center mb-8 max-w-2xl mx-auto"
        >
          Travel Journal is your personal scrapbook for the world. Scratch off countries as you visit them, collect passport stamps, and share your adventures with friends in real-time.
        </motion.p>

        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
        >
          <Link href={ctaHref}>
            <Button variant="primary" size="lg" className="w-full sm:w-auto">
              {ctaLabel}
            </Button>
          </Link>
        </motion.div>

        <motion.div variants={itemVariants}>
          <LandingWorldMap />
        </motion.div>

        <motion.div variants={itemVariants} className="mt-12 text-center">
          <p className="text-sm text-ink/60 mb-4">A personal place to keep the trips that matter</p>
          <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4">
            <div className="text-center">
              <div className="text-2xl font-serif font-bold text-gold-deep">Map</div>
              <p className="text-xs text-ink/60">Places you have been</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-serif font-bold text-gold-deep">Journal</div>
              <p className="text-xs text-ink/60">Stories worth saving</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-serif font-bold text-gold-deep">Passport</div>
              <p className="text-xs text-ink/60">Stamps you collect</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
