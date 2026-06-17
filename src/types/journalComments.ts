export type JournalCommentAuthor = {
  id: string;
  email: string;
  displayName?: string;
  avatar?: string;
};

export type JournalComment = {
  id: string;
  journalEntryId: string;
  authorId: string;
  body: string;
  createdAt: string;
  author: JournalCommentAuthor;
};
