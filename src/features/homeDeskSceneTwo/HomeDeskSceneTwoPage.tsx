'use client';

import Link from 'next/link';
import { BookOpen, CalendarDays, MapPin, Plane, Sparkles, Stamp } from 'lucide-react';
import type { ExtendedFeature } from 'd3-geo';
import { motion, useMotionTemplate, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import type { MotionValue } from 'framer-motion';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { useRef } from 'react';

type MemoryPhoto = {
  label: string;
  className: string;
  imageClass: string;
  caption: string;
};

type AtlasGeography = ExtendedFeature & {
  rsmKey: string;
  id?: string | number;
  properties: {
    name?: unknown;
  } | null;
};

const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';
const scratchMapColors = ['#4cd0c7', '#ffd36a', '#54d68d', '#9b8cff', '#f873a9', '#ff9a63', '#49c2ec'];

const photos = [
  {
    label: "Swiss Alps '23",
    className: 'left-[5%] top-[9%] w-36 rotate-[-10deg] xl:w-44',
    imageClass: 'bg-[radial-gradient(circle_at_50%_75%,#f7f4e8_0_18%,transparent_20%),linear-gradient(150deg,#2f3531,#7b8171_48%,#f8f6eb_50%,#b6a079)]',
    caption: "Swiss Alps '23",
  },
  {
    label: 'Black Forest',
    className: 'right-[8%] top-[10%] w-28 rotate-[8deg] xl:w-36',
    imageClass: 'bg-[radial-gradient(circle_at_35%_30%,rgba(255,255,255,0.72),transparent_28%),linear-gradient(145deg,#233126,#5f6d56)]',
    caption: 'Black Forest',
  },
  {
    label: 'Sunset Views',
    className: 'right-[3%] top-[39%] w-32 rotate-[18deg] xl:w-40',
    imageClass: 'bg-[radial-gradient(circle_at_60%_34%,#fff6bf_0_8%,transparent_10%),linear-gradient(170deg,#935f48,#f0a15d_48%,#473f4a_51%,#223443)]',
    caption: 'Sunset Views',
  },
  {
    label: 'Shared Trips',
    className: 'right-[16%] top-[50%] w-28 rotate-[2deg] xl:w-36',
    imageClass: 'bg-[radial-gradient(circle_at_50%_36%,#fff5bf_0_18%,transparent_20%),linear-gradient(180deg,#e5bb83,#533c2e)]',
    caption: 'Shared Trips',
  },
  {
    label: 'Tokyo Nights',
    className: 'right-[10%] bottom-[9%] w-36 rotate-[-11deg] xl:w-44',
    imageClass: 'bg-[linear-gradient(180deg,#00426a,#122f4b_55%,#d86f64_56%,#1f2634)]',
    caption: 'Tokyo Nights',
  },
  {
    label: 'Maui Mornings',
    className: 'left-[17%] bottom-[7%] w-36 rotate-[6deg] xl:w-44',
    imageClass: 'bg-[radial-gradient(circle_at_74%_70%,#6b8c4f_0_8%,transparent_10%),linear-gradient(160deg,#006b78,#9dd2c6_45%,#f8f1df_47%,#b5a06f)]',
    caption: 'Maui Mornings',
  },
] satisfies MemoryPhoto[];

const organizedCards = [
  { label: "Swiss Alps '23", position: 'left-[6%] top-[8%]', width: 'w-36 xl:w-44', imageClass: photos[0].imageClass },
  { label: 'Digital Passport', position: 'left-[8%] top-[41%]', width: 'w-64 xl:w-72' },
  { label: 'Maui Mornings', position: 'left-[16%] bottom-[7%]', width: 'w-40 xl:w-48', imageClass: photos[5].imageClass },
  { label: 'Upcoming Flight', position: 'left-[33%] bottom-[19%]', width: 'w-64 xl:w-72' },
  { label: 'Journal Entry', position: 'right-[20%] top-[12%]', width: 'w-44 xl:w-52' },
  { label: 'Black Forest', position: 'right-[8%] top-[10%]', width: 'w-28 xl:w-36', imageClass: photos[1].imageClass },
  { label: 'Sunset Views', position: 'right-[5%] top-[40%]', width: 'w-32 xl:w-40', imageClass: photos[2].imageClass },
  { label: 'Shared Trips', position: 'right-[15%] top-[48%]', width: 'w-32 xl:w-40', imageClass: photos[3].imageClass },
  { label: 'Tokyo Nights', position: 'right-[10%] bottom-[9%]', width: 'w-40 xl:w-48', imageClass: photos[4].imageClass },
  { label: 'Next year', position: 'right-[35%] bottom-[7%]', width: 'w-48 xl:w-56' },
];

export function HomeDeskSceneTwoPage() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const shouldReduceMotion = Boolean(prefersReducedMotion);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });

  // Scroll-scrubbed transition: every position in the scroll range maps to a
  // visible stage of the messy memories becoming an organized dashboard.
  const messyOpacity = useTransform(scrollYProgress, [0, 0.36, 0.66, 0.76], [1, 0.72, 0.04, 0]);
  const messyScale = useTransform(scrollYProgress, [0, 0.76], [1, 0.97]);
  const messyRotateX = useTransform(scrollYProgress, [0.16, 0.76], [0, -8]);
  const messyRotateZ = useTransform(scrollYProgress, [0.16, 0.76], [0, -1.4]);
  const messyBlur = useTransform(scrollYProgress, [0.36, 0.76], ['0px', '3px']);
  const organizedOpacity = useTransform(scrollYProgress, [0.1, 0.56, 0.74], [0, 0.82, 1]);
  const organizedScale = useTransform(scrollYProgress, [0.1, 0.74], [1.035, 1]);
  const organizedRotateX = useTransform(scrollYProgress, [0.1, 0.74], [9, 0]);
  const organizedRotateZ = useTransform(scrollYProgress, [0.1, 0.74], [1.4, 0]);
  const organizedBlur = useTransform(scrollYProgress, [0.12, 0.55], ['2px', '0px']);
  const mapWarmth = useTransform(scrollYProgress, [0, 0.9], [0.72, 0.08]);
  const coloredMapOpacity = useTransform(scrollYProgress, [0.2, 0.76], [0, 1]);
  const gridOpacity = useTransform(scrollYProgress, [0.24, 0.86], [0, 0.18]);
  const ctaOpacity = useTransform(scrollYProgress, [0.66, 0.78], [0, 1]);
  const ctaY = useTransform(scrollYProgress, [0.66, 0.78], [22, 0]);
  const scrollHintOpacity = useTransform(scrollYProgress, [0, 0.24, 0.48], [1, 1, 0]);
  const progressHeight = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);
  const frameOpacity = useTransform(scrollYProgress, [0, 0.995, 1], [1, 1, 0]);
  const mapOverlay = useMotionTemplate`rgba(116, 88, 46, ${mapWarmth})`;

  const messyStyle = shouldReduceMotion
    ? { opacity: 0, scale: 0.97, rotateX: -8, rotateZ: -1.4, filter: 'blur(2px)' }
    : {
        opacity: messyOpacity,
        scale: messyScale,
        rotateX: messyRotateX,
        rotateZ: messyRotateZ,
        filter: messyBlur,
        transformPerspective: 1200,
      };
  const organizedStyle = shouldReduceMotion
    ? { opacity: 1, scale: 1, rotateX: 0, rotateZ: 0, filter: 'blur(0px)' }
    : {
        opacity: organizedOpacity,
        scale: organizedScale,
        rotateX: organizedRotateX,
        rotateZ: organizedRotateZ,
        filter: organizedBlur,
        transformPerspective: 1200,
      };
  const ctaStyle = shouldReduceMotion ? { opacity: 1, y: 0 } : { opacity: ctaOpacity, y: ctaY };
  const frameStyle = shouldReduceMotion ? { opacity: 1 } : { opacity: frameOpacity };

  return (
    <main className="overflow-x-hidden bg-[#f5efe4] text-ink">
      <section ref={sectionRef} className="relative hidden h-[500vh] bg-[#f5efe4] md:block">
        <motion.div
          className="pointer-events-none fixed left-0 right-0 top-16 z-20 h-[calc(100vh-4rem)] overflow-hidden"
          style={frameStyle}
        >
          <MapBackdrop
            coloredMapOpacity={shouldReduceMotion ? 1 : coloredMapOpacity}
            overlay={shouldReduceMotion ? 'rgba(116, 88, 46, 0.08)' : mapOverlay}
            gridOpacity={shouldReduceMotion ? 0.18 : gridOpacity}
          />

          <motion.div
            className="absolute inset-0 origin-center [transform-style:preserve-3d]"
            style={messyStyle}
            aria-hidden={shouldReduceMotion}
          >
            <MessyScene />
          </motion.div>

          <motion.div
            className="absolute inset-0 origin-center [transform-style:preserve-3d]"
            style={organizedStyle}
            aria-hidden={false}
          >
            <OrganizedScene />
          </motion.div>

          <motion.div
            className="absolute bottom-8 right-8 z-40"
            style={ctaStyle}
          >
            <Link
              href="/map"
              className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-sm font-bold uppercase tracking-[0.14em] text-cream shadow-lg-soft transition hover:bg-gold-deep focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 focus:ring-offset-cream"
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Start Your Journal
            </Link>
          </motion.div>

          <motion.div
            className="absolute bottom-8 left-1/2 z-40 -translate-x-1/2 rounded-full border border-white/42 bg-white/66 px-4 py-2 text-sm font-bold uppercase tracking-[0.16em] text-ink/62 shadow-soft backdrop-blur"
            style={{ opacity: shouldReduceMotion ? 0 : scrollHintOpacity }}
          >
            Scroll to organize
          </motion.div>

          <div className="absolute right-5 top-1/2 z-40 h-44 w-1.5 -translate-y-1/2 overflow-hidden rounded-full bg-white/58 shadow-soft">
            <motion.div
              className="absolute bottom-0 left-0 right-0 rounded-full bg-gold-deep"
              style={{ height: shouldReduceMotion ? '100%' : progressHeight }}
            />
          </div>
        </motion.div>
      </section>

      <section className="hidden border-t border-gold/14 bg-[#fff9ee] px-6 py-10 text-center md:block">
        <Link
          href="/map"
          className="inline-flex items-center gap-2 rounded-lg bg-ink px-6 py-3 text-base font-semibold text-cream shadow-lg-soft transition hover:bg-gold-deep focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 focus:ring-offset-cream"
        >
          Start Your Journal
        </Link>
      </section>

      <section className="px-4 py-10 md:hidden">
        <div className="mx-auto max-w-xl space-y-8">
          <MobileState title="Unorganized" subtitle="Memories scattered across maps, tickets, photos, and notes.">
            <MessyScene compact />
          </MobileState>
          <MobileState title="Organized" subtitle="The same adventures become a calm dashboard, ready to revisit.">
            <OrganizedScene compact />
          </MobileState>
          <Link
            href="/map"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-ink px-6 py-3 text-base font-semibold text-cream shadow-lg-soft transition hover:bg-gold-deep focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 focus:ring-offset-cream"
          >
            Start Your Journal
          </Link>
        </div>
      </section>
    </main>
  );
}

function MapBackdrop({
  coloredMapOpacity,
  overlay,
  gridOpacity,
}: {
  coloredMapOpacity: number | MotionValue<number>;
  overlay: string | MotionValue<string>;
  gridOpacity: number | MotionValue<number>;
}) {
  return (
    <div className="absolute inset-0 bg-[#f4e4c8]">
      <ScratchWorldMap variant="uncolored" />
      <motion.div className="absolute inset-0" style={{ opacity: coloredMapOpacity }}>
        <ScratchWorldMap variant="colored" />
      </motion.div>
      <motion.div
        className="absolute inset-0 mix-blend-multiply"
        style={{ backgroundColor: overlay }}
      />
      <motion.div
        className="absolute inset-0 [background-image:linear-gradient(90deg,rgba(61,43,14,0.1)_1px,transparent_1px),linear-gradient(rgba(61,43,14,0.1)_1px,transparent_1px)] [background-size:40px_40px]"
        style={{ opacity: gridOpacity }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(255,255,255,0.18),transparent_52%)]" />
    </div>
  );
}

function ScratchWorldMap({ variant }: { variant: 'colored' | 'uncolored' }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center opacity-95">
      <ComposableMap
        width={1600}
        height={840}
        projection="geoEqualEarth"
        projectionConfig={{ scale: 300, center: [10, 8] }}
        className="h-full w-full"
        aria-hidden="true"
      >
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            (geographies as AtlasGeography[]).map((geo, index) => (
              <Geography
                key={geo.rsmKey}
                geography={geo}
                tabIndex={-1}
                fill={variant === 'colored' ? getScratchMapColor(geo, index) : '#ead8b5'}
                stroke={variant === 'colored' ? '#9f855b' : '#b49361'}
                strokeWidth={variant === 'colored' ? 0.85 : 1}
                style={{
                  default: { outline: 'none' },
                  hover: { outline: 'none' },
                  pressed: { outline: 'none' },
                }}
              />
            ))
          }
        </Geographies>
      </ComposableMap>
    </div>
  );
}

function getScratchMapColor(geo: AtlasGeography, index: number) {
  const rawName = typeof geo.properties?.name === 'string' ? geo.properties.name : String(geo.id ?? geo.rsmKey);
  const hash = rawName.split('').reduce((total, letter) => total + letter.charCodeAt(0), index);

  return scratchMapColors[hash % scratchMapColors.length];
}

function MessyScene({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="relative min-h-[620px] overflow-hidden rounded-lg border border-gold/18 bg-[#d6c197] shadow-lg-soft">
        <MapBackdrop coloredMapOpacity={0} overlay="rgba(116, 88, 46, 0.42)" gridOpacity={0} />
        <div className="absolute inset-0 scale-[0.82]">
          <MessyContent />
        </div>
      </div>
    );
  }

  return <MessyContent />;
}

function MessyContent() {
  return (
    <div className="absolute inset-0">
      <div className="absolute left-1/2 top-[27%] z-30 w-[28rem] -translate-x-1/2 rounded-lg bg-[#fffdf6]/92 px-14 py-10 text-center shadow-lg-soft">
        <CornerFrame />
        <h1 className="text-5xl font-bold leading-tight text-ink">Your Adventures, Beautifully Kept</h1>
        <p className="mx-auto mt-6 max-w-sm text-lg font-semibold italic leading-7 text-ink/64">
          Chronicle your journeys, map your routes, and relive the magic of the world in one cohesive space.
        </p>
        <p className="mt-8 text-sm font-bold uppercase tracking-[0.18em] text-ink/42">Scroll to organize</p>
      </div>

      {photos.map((photo) => (
        <Polaroid key={photo.label} photo={photo} className={`absolute z-20 ${photo.className}`} />
      ))}

      <Passport className="absolute left-[8%] top-[39%] z-20 w-[22rem] rotate-[11deg] xl:w-[28rem]" />
      <Ticket className="absolute bottom-[4%] left-[30%] z-10 w-64 rotate-[-28deg] xl:w-72" />
      <StickyNote className="absolute right-[20%] top-[12%] z-20 w-52 rotate-[5deg] xl:w-60" text="Don't forget to check the hidden cafe behind the plaza..." />
      <StickyNote className="absolute bottom-[8%] right-[34%] z-20 w-52 rotate-[-8deg] xl:w-60" text="Next year: Patagonia! mountain" />
      <MapPinDot className="absolute left-[15%] top-[30%]" color="red" label="" />
      <MapPinDot className="absolute right-[20%] top-[60%]" color="red" label="" />
      <MapPinDot className="absolute bottom-[13%] right-[31%]" color="blue" label="" />
    </div>
  );
}

function OrganizedScene({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <div className="relative min-h-[680px] overflow-hidden rounded-lg border border-gold/18 bg-[#faf7f0] shadow-lg-soft">
        <MapBackdrop coloredMapOpacity={1} overlay="rgba(255,255,255,0.2)" gridOpacity={0.16} />
        <div className="absolute inset-0 scale-[0.74]">
          <OrganizedContent />
        </div>
      </div>
    );
  }

  return <OrganizedContent />;
}

function OrganizedContent() {
  return (
    <div className="absolute inset-0">
      <svg className="absolute inset-0 z-10 h-full w-full" viewBox="0 0 1440 820" preserveAspectRatio="none" aria-hidden="true">
        <path d="M215 262 C 425 120, 620 185, 772 398 S 1025 560, 1160 510" fill="none" stroke="#d95d45" strokeDasharray="3 5" strokeOpacity="0.45" />
        <path d="M1015 650 C 1102 610, 1182 568, 1160 510" fill="none" stroke="#5a9ac8" strokeDasharray="3 5" strokeOpacity="0.45" />
      </svg>

      <div className="absolute left-1/2 top-[37%] z-30 w-[29rem] -translate-x-1/2 rounded-lg bg-white px-14 py-14 text-center shadow-lg-soft">
        <h1 className="text-5xl font-bold leading-tight text-ink">Dashboard</h1>
        <p className="mx-auto mt-7 max-w-sm text-lg font-semibold leading-7 text-ink/58">
          Your journey is safely stored. Review your flights, journal entries, and tracking map.
        </p>
      </div>

      {organizedCards.map((card) => (
        <OrganizedCard key={card.label} card={card} />
      ))}

      <MapPinDot className="absolute left-[15%] top-[30%] z-20" color="red" label="Switzerland" />
      <MapPinDot className="absolute right-[20%] top-[61%] z-20" color="red" label="Paris" />
      <MapPinDot className="absolute bottom-[13%] right-[31%] z-20" color="blue" label="Tokyo" />
    </div>
  );
}

function OrganizedCard({ card }: { card: (typeof organizedCards)[number] }) {
  if (card.label === 'Digital Passport') {
    return (
      <div className={`absolute z-20 ${card.position} ${card.width} rounded-lg bg-white p-4 shadow-lg-soft`}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.08em] text-ink">
            <Stamp className="h-4 w-4 text-[#d95d45]" aria-hidden="true" />
            Digital Passport
          </div>
          <span className="rounded-md bg-[#f4f1ed] px-2 py-1 text-xs font-bold text-ink/50">12 stamps</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {['CDG', 'JFK', 'HND'].map((stamp) => (
            <div key={stamp} className="flex h-20 flex-col items-center justify-center rounded-lg bg-[#f7f6f3] text-xs font-bold text-ink/48">
              <Plane className="mb-2 h-5 w-5 text-gold-deep" aria-hidden="true" />
              {stamp}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (card.label === 'Upcoming Flight') {
    return (
      <div className={`absolute z-20 ${card.position} ${card.width} rounded-lg bg-white p-4 shadow-lg-soft`}>
        <div className="mb-4 flex items-center justify-between">
          <span className="rounded-md bg-[#fbf1e2] px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-[#d95d45]">Upcoming Flight</span>
          <Plane className="h-4 w-4 text-ink/30" aria-hidden="true" />
        </div>
        <div className="flex items-end justify-between gap-3">
          <div>
            <div className="text-2xl font-bold">JFK</div>
            <div className="text-xs font-bold uppercase text-ink/42">New York</div>
          </div>
          <div className="mb-4 h-px flex-1 border-t border-dashed border-ink/16" />
          <div className="text-right">
            <div className="text-2xl font-bold">CDG</div>
            <div className="text-xs font-bold uppercase text-ink/42">Paris</div>
          </div>
        </div>
        <div className="mt-5 flex justify-between text-xs font-semibold text-ink/46">
          <span className="inline-flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> Oct 14</span>
          <span>18:30</span>
        </div>
      </div>
    );
  }

  if (card.label === 'Journal Entry' || card.label === 'Next year') {
    return (
      <div className={`absolute z-20 ${card.position} ${card.width} rounded-lg bg-white p-5 shadow-lg-soft`}>
        <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.1em] text-ink/56">
          <BookOpen className="h-4 w-4 text-[#d95d45]" aria-hidden="true" />
          Journal Entry
        </div>
        <p className="text-sm font-semibold leading-6 text-ink/64">
          {card.label === 'Next year' ? 'Next year: Patagonia! mountain' : "Don't forget to check the hidden cafe behind the plaza..."}
        </p>
      </div>
    );
  }

  return (
    <div className={`absolute z-20 ${card.position} ${card.width} rounded-lg bg-white p-2 shadow-lg-soft`}>
      <div className={`h-28 rounded-md ${card.imageClass}`} />
      <div className="mt-2 rounded-md bg-white px-2 py-1.5 text-xs font-bold text-ink/64">
        <MapPin className="mr-1 inline h-3 w-3 text-[#d95d45]" aria-hidden="true" />
        {card.label}
      </div>
    </div>
  );
}

function Polaroid({ photo, className }: { photo: MemoryPhoto; className: string }) {
  return (
    <div className={`${className} rounded-sm bg-white p-3 pb-5 shadow-lg-soft`}>
      <div className={`aspect-[4/3] rounded-sm ${photo.imageClass}`} />
      <p className="mt-2 text-center font-script text-2xl leading-none text-ink/72">{photo.caption}</p>
    </div>
  );
}

function Passport({ className }: { className: string }) {
  return (
    <div className={`${className} grid grid-cols-2 overflow-hidden rounded-md border-[6px] border-[#1d2933] bg-[#fff8dd] shadow-lg-soft`}>
      <div className="relative min-h-44 border-r-[6px] border-[#1d2933] p-5">
        <div className="absolute left-8 top-8 flex h-16 w-16 rotate-[10deg] items-center justify-center rounded-full border-2 border-[#d95d45]/46 text-[10px] font-bold uppercase tracking-[0.12em] text-[#d95d45]/66">
          Entry Granted
        </div>
        <div className="absolute bottom-8 right-8 flex h-10 w-10 items-center justify-center border border-dashed border-[#7f9c8a] text-[10px] font-bold text-[#7f9c8a]">
          CDG
        </div>
      </div>
      <div className="relative min-h-44 p-5">
        <div className="absolute right-8 top-10 rotate-[16deg] border border-[#6d7f88]/60 px-4 py-2 text-xs font-bold uppercase text-[#6d7f88]">
          Visas
        </div>
        <div className="absolute bottom-8 left-8 flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#c98c6c]/70 text-[#c98c6c]">
          <Stamp className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

function Ticket({ className }: { className: string }) {
  return (
    <div className={`${className} rounded-md bg-[#ead49f] p-4 shadow-lg-soft`}>
      <div className="text-xs font-bold uppercase tracking-[0.18em] text-ink/48">Boarding Pass 849</div>
      <div className="mt-4 flex items-center justify-between font-serif text-3xl font-bold">
        <span>JFK</span>
        <span className="text-ink/36">to</span>
        <span>CDG</span>
      </div>
      <div className="mt-2 flex justify-between text-xs font-bold uppercase text-ink/48">
        <span>New York</span>
        <span>Paris</span>
      </div>
    </div>
  );
}

function StickyNote({ className, text }: { className: string; text: string }) {
  return (
    <div className={`${className} bg-white p-6 shadow-lg-soft`}>
      <div className="absolute left-1/2 top-[-10px] h-5 w-20 -translate-x-1/2 bg-[#d9cdb5]/60" />
      <p className="font-script text-3xl leading-8 text-[#334155]/78">{text}</p>
    </div>
  );
}

function MapPinDot({ className, color, label }: { className: string; color: 'red' | 'blue'; label: string }) {
  return (
    <div className={className}>
      <span
        className={[
          'block h-4 w-4 rounded-full border-2 border-white shadow-soft',
          color === 'red' ? 'bg-[#d95d45]' : 'bg-[#3f8fc5]',
        ].join(' ')}
      />
      {label ? (
        <span className="absolute left-1/2 top-6 -translate-x-1/2 rounded-md bg-white px-2 py-1 text-xs font-bold text-ink/62 shadow-soft">
          {label}
        </span>
      ) : null}
    </div>
  );
}

function CornerFrame() {
  return (
    <>
      <span className="absolute left-5 top-5 h-3 w-3 border-l border-t border-gold/38" />
      <span className="absolute right-5 top-5 h-3 w-3 border-r border-t border-gold/38" />
      <span className="absolute bottom-5 left-5 h-3 w-3 border-b border-l border-gold/38" />
      <span className="absolute bottom-5 right-5 h-3 w-3 border-b border-r border-gold/38" />
    </>
  );
}

function MobileState({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p className="text-sm font-bold uppercase tracking-[0.18em] text-gold-deep">{title}</p>
      <h1 className="mt-2 text-4xl font-bold leading-tight text-ink">
        {title === 'Unorganized' ? 'Your Adventures, Beautifully Kept' : 'Dashboard'}
      </h1>
      <p className="mt-3 text-base leading-7 text-ink/64">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}
