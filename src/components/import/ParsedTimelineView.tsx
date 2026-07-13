// Parsed timeline preview.
// Shows itinerary days/stops extracted by the trip parser.
'use client';

import { motion } from 'framer-motion';
import type { ParsedTripDay } from '@/types/trips';

type ParsedTimelineViewProps = {
  timeline: ParsedTripDay[];
};

// Prefers the original human-readable date label when the parser found one.
const getDayDateLabel = (day: ParsedTripDay) => day.originalDateText || day.date || 'Draft day';

// Renders parsed trip days in order.
export default function ParsedTimelineView({ timeline }: ParsedTimelineViewProps) {
  if (!timeline.length) {
    return (
      <div className="rounded-lg border border-dashed border-gold/35 bg-white/70 p-4 text-sm text-ink/60">
        No timeline extracted yet.
      </div>
    );
  }

  return (
    <section className="rounded-lg border border-gold/20 bg-white/85 p-4 shadow-soft">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-gold-deep">Parsed Timeline</p>
          <h3 className="text-xl font-semibold text-ink">{timeline.length} draft page{timeline.length === 1 ? '' : 's'}</h3>
        </div>
      </div>

      <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
        {timeline.map((day, index) => (
          <motion.article
            key={day.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
            className="relative rounded-lg border border-gold/15 bg-cream/55 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-ink/50">{getDayDateLabel(day)}</p>
                <h4 className="font-semibold text-ink">{day.title}</h4>
              </div>
              {day.locations.length ? (
                <span className="rounded-full border border-gold/20 bg-white px-2 py-1 text-xs text-ink/60">
                  {day.locations[0].name}
                </span>
              ) : null}
            </div>

            <div className="mt-3 space-y-2">
              {day.activities.length ? (
                day.activities.map((activity) => (
                  <div key={activity.id} className="rounded border border-white/80 bg-white/70 px-3 py-2 text-sm text-ink/75">
                    {activity.title}
                  </div>
                ))
              ) : (
                <p className="text-sm text-ink/55">Source attached for journaling.</p>
              )}
            </div>
          </motion.article>
        ))}
      </div>
    </section>
  );
}
