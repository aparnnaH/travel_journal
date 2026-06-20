// Loading shell for the passport route.
// Used while the dynamic flipbook UI loads so the page does not feel blank.
export default function PassportLoadingShell() {
  return (
    <main className="min-h-screen bg-cream px-4 py-10 text-ink">
      <div className="mx-auto grid w-full max-w-6xl gap-6">
        <section className="grid gap-6 border-b-4 border-double border-ink/20 pb-8 lg:grid-cols-[1fr_20rem] lg:items-end">
          <div className="grid gap-4">
            <div className="h-3 w-36 rounded-full bg-maroon/20" />
            <div className="h-14 w-full max-w-xl rounded-md bg-ink/10" />
            <div className="h-4 w-full max-w-lg rounded-full bg-ink/10" />
            <div className="flex flex-wrap gap-2 pt-2">
              <div className="h-8 w-28 rounded-md bg-white/70" />
              <div className="h-8 w-36 rounded-md bg-white/70" />
              <div className="h-8 w-32 rounded-md bg-white/70" />
            </div>
          </div>
          <div className="min-h-56 rounded-lg border border-gold/40 bg-gradient-to-br from-teal to-ink shadow-xl" />
        </section>

        <section className="grid gap-4 rounded-lg border border-ink/15 bg-white/50 p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="grid gap-2">
              <div className="h-3 w-32 rounded-full bg-maroon/20" />
              <div className="h-7 w-44 rounded-md bg-ink/10" />
            </div>
            <div className="h-9 w-16 rounded-md bg-teal/15" />
          </div>
          <div className="h-3 rounded-full bg-ink/10" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-20 rounded-lg border border-ink/10 bg-cream/70" />
            ))}
          </div>
        </section>

        <section className="grid gap-4 pt-3">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-10 w-24 rounded-md border border-ink/10 bg-white/60" />
            ))}
          </div>
          <div className="h-96 rounded-lg border border-ink/15 bg-white/45 shadow-lg" />
        </section>
      </div>
    </main>
  );
}
