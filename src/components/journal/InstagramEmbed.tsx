'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import type { InstagramEmbed as InstagramEmbedData } from '@/lib/instagramEmbeds';

declare global {
  interface Window {
    instgrm?: {
      Embeds?: {
        process: () => void;
      };
    };
  }
}

type InstagramEmbedProps = {
  embeds: InstagramEmbedData[];
};

const processInstagramEmbeds = () => {
  window.instgrm?.Embeds?.process();
};

export default function InstagramEmbed({ embeds }: InstagramEmbedProps) {
  useEffect(() => {
    processInstagramEmbeds();
  }, [embeds]);

  if (!embeds.length) {
    return null;
  }

  return (
    <section className="mt-6 rounded-lg border border-gold/18 bg-cream/45 p-4">
      <div className="grid gap-4">
        {embeds.map((embed) => (
          <blockquote
            key={embed.id}
            className="instagram-media mx-auto w-full min-w-0 max-w-[540px] overflow-hidden rounded-md border border-gold/20 bg-white"
            data-instgrm-permalink={embed.url}
            data-instgrm-version="14"
          >
            <a href={embed.url} target="_blank" rel="noreferrer" className="block px-4 py-5 text-sm font-semibold text-gold-deep">
              View Instagram post
            </a>
          </blockquote>
        ))}
      </div>
      <Script id="instagram-embed-script" src="https://www.instagram.com/embed.js" strategy="lazyOnload" onReady={processInstagramEmbeds} />
    </section>
  );
}
