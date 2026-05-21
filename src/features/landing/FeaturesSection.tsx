'use client';

import { motion } from 'framer-motion';
import { Card } from '@/components/ui';

interface Feature {
  icon: string;
  title: string;
  description: string;
}

const features: Feature[] = [
  {
    icon: '🗺️',
    title: 'Interactive Scratch Map',
    description:
      'Watch the world light up as you visit countries. Like a vintage scratch-off poster with real-time updates.',
  },
  {
    icon: '📔',
    title: 'Scrapbook Journals',
    description:
      'Document your travels with polaroid-style photos, mood tags, and handwritten notes for each destination.',
  },
  {
    icon: '🎫',
    title: 'Passport Stamps',
    description:
      'Collect digital passport stamps for every country you visit. Build your complete travel collection.',
  },
  {
    icon: '👥',
    title: 'Friend Collaboration',
    description:
      'Share your adventures with friends in real-time. See where they are and what memories they are creating.',
  },
  {
    icon: '📱',
    title: 'Offline-First',
    description:
      'Your travels never stop. Access your journal and map even without internet. Everything syncs when you reconnect.',
  },
  {
    icon: '🔐',
    title: 'Privacy First',
    description:
      'Your memories are yours alone. Complete control over who sees what. Enterprise-grade security.',
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 },
  },
};

export function FeaturesSection() {
  return (
    <section
      id="features"
      className="py-20 px-4 sm:px-6 lg:px-8 bg-white/50 backdrop-blur-sm"
    >
      <div className="container mx-auto max-w-6xl">
        {/* Section Header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl sm:text-5xl font-serif font-bold text-ink mb-4">
            Everything You Need to Travel Smart
          </h2>
          <p className="text-lg text-ink/70 max-w-2xl mx-auto">
            From capturing memories to sharing adventures, Travel Journal has all the tools to make your trips unforgettable.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {features.map((feature, index) => (
            <motion.div key={index} variants={itemVariants}>
              <Card variant="subtle" className="h-full hover:shadow-md-soft transition-shadow">
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-serif font-bold text-ink mb-2">
                  {feature.title}
                </h3>
                <p className="text-ink/70">{feature.description}</p>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
