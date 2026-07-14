// Loading shell for the passport route.
// Used while the dynamic flipbook UI loads so the page does not feel blank.
export default function PassportLoadingShell() {
  return (
    <main className="min-h-screen bg-cream py-16 pb-[72px] text-ink">
      <div className="mx-auto grid w-full max-w-[1536px] gap-6 px-4">
        <section className="grid gap-8 pb-10">
          <div className="grid gap-[13px]">
            <div className="h-10 w-full max-w-xl rounded-md bg-ink/10" />
            <div className="h-4 w-full max-w-lg rounded-full bg-ink/10" />
            <div className="flex flex-wrap gap-2 pt-2">
              <div className="h-8 w-28 rounded-md bg-white/70" />
              <div className="h-8 w-36 rounded-md bg-white/70" />
              <div className="h-8 w-32 rounded-md bg-white/70" />
            </div>
          </div>
        </section>

        <section className="mt-1 grid gap-4 rounded-lg border border-[#315f43]/20 bg-[radial-gradient(circle_at_right_top,rgba(49,95,67,0.12),transparent_34%),linear-gradient(135deg,rgba(255,252,244,0.88),rgba(238,225,203,0.78))] p-[22px] shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="grid gap-2">
              <div className="h-3 w-32 rounded-full bg-[#315f43]/20" />
              <div className="h-7 w-44 rounded-md bg-ink/10" />
            </div>
            <div className="h-9 w-16 rounded-md bg-[#315f43]/20" />
          </div>
          <div className="h-3 rounded-full bg-[#315f43]/10" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-20 rounded-lg border border-[#315f43]/15 bg-white/55" />
            ))}
          </div>
        </section>

        <section className="grid gap-4 pt-3" aria-label="Loading passport region filters">
          <div className="flex items-center justify-between gap-4">
            <div className="grid gap-2">
              <div className="h-3 w-24 rounded-full bg-[#7d3654]/20" />
              <div className="h-7 w-36 rounded-md bg-ink/10" />
            </div>
            <div className="h-8 w-28 rounded-md border border-ink/10 bg-white/60" />
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 7 }).map((_, index) => (
              <div
                key={index}
                className={`h-10 rounded-md border border-ink/10 ${
                  index === 0 ? 'w-16 bg-[#1f6677]/25' : index % 2 === 0 ? 'w-28 bg-white/60' : 'w-24 bg-white/60'
                }`}
              />
            ))}
          </div>
        </section>

        <section className="grid gap-6 pt-2" aria-label="Loading passport stamp collection">
          {Array.from({ length: 2 }).map((_, regionIndex) => (
            <div key={regionIndex} className="rounded-lg border border-ink/12 bg-white/45 p-4 shadow-lg">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <div className="h-3 w-28 rounded-full bg-[#7d3654]/20" />
                  <div className="mt-3 h-8 w-44 rounded-md bg-ink/10" />
                </div>
                <div className="h-8 w-24 rounded-md border border-ink/10 bg-white/70" />
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {[0, 1].map((pageIndex) => (
                  <div
                    key={pageIndex}
                    className="min-h-[360px] rounded-lg border border-[#8a6f48]/22 bg-[linear-gradient(135deg,rgba(255,250,241,0.82),rgba(236,222,197,0.76))] p-5 shadow-inner"
                  >
                    <div className="mb-5 flex items-center justify-between gap-3 border-b border-[#8a6f48]/18 pb-3">
                      <div className="h-4 w-32 rounded-md bg-ink/10" />
                      <div className="h-4 w-16 rounded-md bg-ink/10" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                      {Array.from({ length: 6 }).map((_, stampIndex) => (
                        <div key={stampIndex} className="grid justify-items-center gap-3 rounded-lg border border-[#8a6f48]/14 bg-white/42 p-3">
                          <div
                            className={`h-24 w-24 rounded-full border-2 border-dashed ${
                              stampIndex % 3 === 0 ? 'border-[#315f43]/35 bg-[#315f43]/12' : 'border-[#7d3654]/25 bg-[#7d3654]/10'
                            }`}
                          />
                          <div className="h-3 w-20 rounded-full bg-ink/10" />
                          <div className="h-2 w-14 rounded-full bg-ink/10" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
