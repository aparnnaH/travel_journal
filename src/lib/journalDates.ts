export type JournalDateRangeErrors = {
  startDate?: string;
  endDate?: string;
};

const JOURNAL_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const getTodayJournalDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

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

export const getJournalDateRangeError = (startDate: string, endDate: string) => {
  const errors = getJournalDateRangeErrors(startDate, endDate);
  return errors.startDate || errors.endDate || null;
};

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
