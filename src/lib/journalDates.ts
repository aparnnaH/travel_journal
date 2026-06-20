// Journal date helpers.
// Forms store dates as `YYYY-MM-DD` strings so comparisons, Supabase payloads,
// and native date inputs all speak the same format.
export type JournalDateRangeErrors = {
  startDate?: string;
  endDate?: string;
};

const JOURNAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Returns today's local calendar date in the format expected by date inputs.
export const getTodayJournalDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

// Accepts a saved or user-provided date value and normalizes it to the journal
// storage format, falling back when parsing fails.
export const normalizeJournalDate = (value?: string | null, fallback = getTodayJournalDate()) => {
  if (!value) {
    return fallback;
  }

  const trimmedValue = value.trim();

  if (JOURNAL_DATE_PATTERN.test(trimmedValue)) {
    return trimmedValue;
  }

  const parsedDate = new Date(trimmedValue);

  if (Number.isNaN(parsedDate.getTime())) {
    return fallback;
  }

  return parsedDate.toISOString().slice(0, 10);
};

// Validates that a trip start/end range is chronologically possible. String
// comparison works because normalized dates are stored as YYYY-MM-DD.
export const getJournalDateRangeErrors = (startDate: string, endDate: string): JournalDateRangeErrors => {
  if (!startDate || !endDate) {
    return {};
  }

  if (startDate > endDate) {
    return {
      startDate: 'Start date cannot be after end date.',
      endDate: 'End date cannot be before start date.',
    };
  }

  return {};
};

// Convenience helper for callers that only need one message to show inline.
export const getJournalDateRangeError = (startDate: string, endDate: string) => {
  const errors = getJournalDateRangeErrors(startDate, endDate);
  return errors.startDate || errors.endDate || null;
};

// Converts a storage date into a readable label while preserving bad legacy
// values instead of hiding them.
export const formatJournalDate = (value?: string | null) => {
  if (!value) {
    return '';
  }

  const parsedDate = new Date(`${normalizeJournalDate(value)}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

// Formats a single-day or multi-day journal range for cards and previews.
export const formatJournalDateRange = (startDate?: string | null, endDate?: string | null) => {
  const cleanStartDate = startDate ? normalizeJournalDate(startDate) : '';
  const cleanEndDate = endDate ? normalizeJournalDate(endDate, cleanStartDate || getTodayJournalDate()) : '';

  if (!cleanStartDate && !cleanEndDate) {
    return '';
  }

  if (!cleanEndDate || cleanStartDate === cleanEndDate) {
    return formatJournalDate(cleanStartDate);
  }

  return `${formatJournalDate(cleanStartDate)} - ${formatJournalDate(cleanEndDate)}`;
};
