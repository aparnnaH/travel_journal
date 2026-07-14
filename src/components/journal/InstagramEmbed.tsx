'use client';

import type { InstagramEmbed as InstagramEmbedData } from '@/lib/instagramEmbeds';

type InstagramEmbedProps = {
  embeds: InstagramEmbedData[];
};

const getInstagramEmbedSrc = (url: string) => `${url.replace(/\/?$/, '/')}embed`;

export default function InstagramEmbed({ embeds }: InstagramEmbedProps) {
  if (!embeds.length) {
    return null;
  }

  return (
    <section className="mt-6 rounded-lg border border-gold/18 bg-cream/45 p-4">
      <div className="grid gap-4">
        {embeds.map((embed) => (
          <div
            key={embed.id}
            className="mx-auto w-full min-w-0 max-w-[540px] overflow-hidden rounded-md border border-gold/20 bg-white shadow-sm"
          >
            <iframe
              title="Instagram preview"
              src={getInstagramEmbedSrc(embed.url)}
              className="h-[620px] w-full border-0"
              loading="lazy"
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            />
            <a href={embed.url} target="_blank" rel="noreferrer" className="block border-t border-gold/14 px-4 py-3 text-sm font-semibold text-gold-deep">
              View Instagram post
            </a>
          </div>
        ))}
      </div>
    </section>
  );
}
