export const JOURNAL_FAVORITE_TAG = 'favorite';

const favoriteJournalTags = new Set(['favorite', 'favourite', 'highlight', 'highlights']);

export const isJournalFavoriteTag = (tag: string) => favoriteJournalTags.has(tag.trim().toLowerCase());

export const hasJournalFavoriteTag = (tags?: string[] | null) =>
  Array.isArray(tags) && tags.some((tag) => isJournalFavoriteTag(tag));

export const removeJournalFavoriteTags = (tags?: string[] | null) =>
  (tags ?? []).filter((tag) => !isJournalFavoriteTag(tag));

export const addJournalFavoriteTag = (tags?: string[] | null) => {
  const cleanTags = removeJournalFavoriteTags(tags);
  return [JOURNAL_FAVORITE_TAG, ...cleanTags];
};
