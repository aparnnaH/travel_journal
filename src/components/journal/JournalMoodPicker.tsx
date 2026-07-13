import { JOURNAL_MOOD_OPTIONS } from '@/lib/journalMoods';

type JournalMoodPickerProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
};

export default function JournalMoodPicker({ id, value, onChange, required = false }: JournalMoodPickerProps) {
  const normalizedValue = value.trim().toLowerCase();
  const selectedPreset = JOURNAL_MOOD_OPTIONS.some((option) => option.value === normalizedValue);

  return (
    <fieldset className="rounded-lg border-2 border-gold/30 bg-cream/35 p-3">
      <legend className="px-1 text-sm font-medium text-ink">Mood</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {JOURNAL_MOOD_OPTIONS.map((option) => {
          const selected = option.value === normalizedValue;

          return (
            <button
              key={option.value}
              type="button"
              className={[
                'rounded-full border px-3 py-1.5 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-gold/35',
                selected
                  ? 'border-gold bg-gold text-cream shadow-soft'
                  : 'border-gold/22 bg-white text-ink/68 hover:border-gold/55 hover:bg-gold/10',
              ].join(' ')}
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <label className="mt-3 block text-xs font-semibold uppercase tracking-[0.12em] text-ink/48" htmlFor={id}>
        Custom mood
      </label>
      <input
        id={id}
        value={selectedPreset ? '' : value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Add another mood"
        required={required && !value.trim()}
        className="mt-1 w-full rounded-lg border border-gold/25 bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-ink/40 focus:border-gold focus:ring-2 focus:ring-gold/25"
      />
    </fieldset>
  );
}
