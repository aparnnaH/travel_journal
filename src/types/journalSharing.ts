import type { JournalEntry } from '@/types';

export type JournalSharePermission = 'view' | 'comment';

export type JournalShareRecipient = {
  id: string;
  email: string;
  displayName?: string;
  avatar?: string;
  permission: JournalSharePermission;
  sharedAt: string;
};

export type SharedJournalEntry = JournalEntry & {
  country_id?: string;
  created_at?: string;
  sharedBy: {
    id: string;
    email: string;
    displayName?: string;
    avatar?: string;
  };
  sharedAt: string;
  permission: JournalSharePermission;
};
