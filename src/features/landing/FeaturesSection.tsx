// Landing-page feature preview section.
// Summarizes the product areas without requiring the user to sign in first.
'use client';

import { motion } from 'framer-motion';
import { GradientCard, type GradientCardProps } from '@/components/ui';

type FeatureCard = Pick<
  GradientCardProps,
  'badgeText' | 'badgeColor' | 'title' | 'description' | 'ctaText' | 'ctaHref' | 'imageUrl' | 'gradient'
>;

const features: FeatureCard[] = [
  {
    badgeText: 'Map',
    badgeColor: '#4ECFFF',
    title: 'Interactive Scratch Map',
    description:
      'Watch the world light up as you mark countries visited, zoom around the atlas, and track your travel progress.',
    ctaText: 'Open map',
    ctaHref: '/map',
    imageUrl: '/images/features/map.png',
    gradient: 'green',
  },
  {
    badgeText: 'Journal',
    badgeColor: '#FF9F6B',
    title: 'Scrapbook Journals',
    description:
      'Document trips with flexible scrapbook pages, photos, stickers, notes, imported memories, Instagram embeds, and saved entries.',
    ctaText: 'Open journal',
    ctaHref: '/journal',
    imageUrl: '/images/features/journal.png',
    gradient: 'orange',
  },
  {
    badgeText: 'Canva',
    badgeColor: '#00C4CC',
    title: 'Canva Journal Studio',
    description:
      'Connect Canva to create new travel pages, import finished designs, save page previews, and keep designs organized in a Travel Journal folder.',
    ctaText: 'Design in Canva',
    ctaHref: '/journal',
    imageUrl: '/images/features/canva.png',
    gradient: 'gray',
  },
  {
    badgeText: 'Passport',
    badgeColor: '#9B8CFF',
    title: 'Passport Stamps',
    description: 'Collect digital country stamps, browse regional stamp books, and revisit stamps revealed from the map.',
    ctaText: 'View passport',
    ctaHref: '/passport',
    imageUrl: '/images/features/passport.png',
    gradient: 'purple',
  },
  {
    badgeText: 'Planner',
    badgeColor: '#59D98E',
    title: 'Country Explorer',
    description:
      'Open a focused country view with city planning, saved places, notes, and a passport stamp shortcut.',
    ctaText: 'Explore countries',
    ctaHref: '/map',
    imageUrl: '/images/features/explorer.png',
    gradient: 'green',
  },
  {
    badgeText: 'Import',
    badgeColor: '#FFD166',
    title: 'Trip Import',
    description: 'Turn itinerary text and trip files into organized drafts, timeline cards, and scrapbook material.',
    ctaText: 'Import a trip',
    ctaHref: '/journal',
    imageUrl: '/images/features/import.png',
    gradient: 'orange',
  },
  {
    badgeText: 'Sharing',
    badgeColor: '#E86AA8',
    title: 'Travel Circle',
    description:
      'Manage accepted friends, share journal entries privately, keep comments with shared memories, and continue friend-specific compare context.',
    ctaText: 'Open friends',
    ctaHref: '/friends',
    imageUrl: '/images/features/travel_circle.png',
    gradient: 'purple',
  },
  {
    badgeText: 'Audit',
    badgeColor: '#6E9EF6',
    title: 'Travel Audit',
    description:
      'Compare map and passport coverage, review country gaps, and send the selected friend into Travel Circle for more detail.',
    ctaText: 'Run audit',
    ctaHref: '/compare',
    imageUrl: '/images/features/travel_audit.png',
    gradient: 'green',
  },
  {
    badgeText: 'Companion',
    badgeColor: '#4CD7D0',
    title: 'AI Travel Companion',
    description: 'Use your journal, imported trips, scrapbook pages, map progress, and stamps as context for travel-memory drafts.',
    ctaText: 'Open companion',
    ctaHref: '/companion',
    imageUrl: '/images/features/companion.png',
    gradient: 'gray',
  },
  {
    badgeText: 'Home Base',
    badgeColor: '#C99A38',
    title: 'Dashboard & Profile',
    description:
      'See recent entries, map progress, travel stats, friend requests, profile details, and quick actions from one signed-in home base.',
    ctaText: 'Open dashboard',
    ctaHref: '/dashboard',
    imageUrl: '/images/features/profile.png',
    gradient: 'orange',
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
      className="bg-white/50 px-4 py-20 backdrop-blur-sm sm:px-6 lg:px-8"
    >
      <div className="container mx-auto max-w-6xl">
        <motion.div
          className="mx-auto mb-12 max-w-3xl text-center"
          initial={{ opacity: 0, y: -20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <h2 className="mb-4 font-serif text-4xl font-bold text-ink sm:text-5xl">
            Everything You Need to Travel Smart
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-ink/70">
            From mapping visited countries to designing Canva-backed journal pages, Travel Journal keeps every part of your trip archive organized and beautiful.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:gap-10"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {features.map((feature) => (
            <motion.div key={feature.title} variants={itemVariants}>
              <GradientCard {...feature} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
