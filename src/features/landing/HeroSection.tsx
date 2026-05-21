'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Button } from '@/components/ui';

export function HeroSection() {
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
    <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8 overflow-hidden">
      {/* Background gradient decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 right-10 w-72 h-72 bg-gold/10 rounded-full blur-3xl opacity-40" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-gold/5 rounded-full blur-3xl opacity-30" />
      </div>

      <motion.div
        className="container mx-auto max-w-4xl relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Badge */}
        <motion.div variants={itemVariants} className="text-center mb-6">
          <span className="inline-block px-4 py-2 bg-gold/20 border border-gold/50 rounded-full text-sm font-medium text-gold-deep">
            ✨ Document Your Journey
          </span>
        </motion.div>

        {/* Main Heading */}
        <motion.h1
          variants={itemVariants}
          className="text-5xl sm:text-6xl lg:text-7xl font-serif font-bold text-ink mb-6 text-center leading-tight"
        >
          Collect Moments,
          <span className="block text-gold-deep">Not Things</span>
        </motion.h1>

        {/* Subheading */}
        <motion.p
          variants={itemVariants}
          className="text-lg sm:text-xl text-ink/70 text-center mb-8 max-w-2xl mx-auto"
        >
          Travel Journal is your personal scrapbook for the world. Scratch off countries as you visit them, collect passport stamps, and share your adventures with friends in real-time.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
        >
          <Link href="/signup">
            <Button variant="primary" size="lg" className="w-full sm:w-auto">
              Start Your Journey →
            </Button>
          </Link>
          <Link href="#showcase">
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              See It In Action
            </Button>
          </Link>
        </motion.div>

        {/* Hero Visual */}
        <motion.div
          variants={itemVariants}
          className="bg-white rounded-3xl shadow-lg-soft border border-gold/20 p-8 sm:p-12"
        >
          <div className="aspect-video bg-gradient-to-br from-gold/20 to-cream rounded-2xl flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">🌍</div>
              <p className="text-ink/60">Interactive World Map Coming Soon</p>
            </div>
          </div>
        </motion.div>

        {/* Trust indicators */}
        <motion.div variants={itemVariants} className="mt-12 text-center">
          <p className="text-sm text-ink/60 mb-4">Trusted by travelers worldwide</p>
          <div className="flex justify-center items-center space-x-8">
            <div className="text-center">
              <div className="text-2xl font-serif font-bold text-gold-deep">10K+</div>
              <p className="text-xs text-ink/60">Active Travelers</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-serif font-bold text-gold-deep">50+</div>
              <p className="text-xs text-ink/60">Countries</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-serif font-bold text-gold-deep">1M+</div>
              <p className="text-xs text-ink/60">Memories Shared</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
