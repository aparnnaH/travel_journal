import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const DEMO_EMAIL = 'demo@traveljournal.app';
const DEMO_NAME = 'Demo Traveler';
const SHARE_WITH_EMAIL = 'aparnna2001@gmail.com';

const demoEntries = [
  {
    country_id: 'JP',
    title: 'Imported Trip: Japan Spring Route',
    content:
      'This entry shows the trip import flow after a route has been parsed into a journal draft. Tokyo food notes, the Kyoto temple walk, and a quick Nara afternoon were pulled into one saved story.',
    mood: 'excited',
    tags: ['trip import', 'instagram', 'japan', 'spring'],
    trip_start_date: '2026-05-03',
    trip_end_date: '2026-05-10',
    created_at: '2026-05-10T22:20:00.000Z',
    updated_at: '2026-05-10T22:20:00.000Z',
  },
  {
    country_id: 'JP',
    title: 'Canva Pages: Kyoto Lantern Walk',
    content:
      'This entry shows how a finished Canva journal page can stay attached to the story. The cover page holds the lantern walk, and the second page keeps the quieter bamboo-path notes for the scrapbook archive.',
    mood: 'reflective',
    tags: ['canva', 'kyoto', 'scrapbook'],
    canva_design_id: 'demo-canva-kyoto',
    canva_design_title: 'Kyoto Lantern Walk',
    canva_design_edit_url: 'https://www.canva.com/design/demo-kyoto-lantern-walk',
    canva_page_count: 2,
    trip_start_date: '2026-05-03',
    trip_end_date: '2026-05-10',
    created_at: '2026-05-11T15:10:00.000Z',
    updated_at: '2026-05-11T15:10:00.000Z',
  },
  {
    country_id: 'FR',
    title: 'Paris in Soft Rain',
    content:
      'Morning started with a slow walk along the Seine, a paper cup of coffee, and museum plans that happily turned into wandering. The best memory was finding a tiny bookshop near the river and writing postcards before dinner.',
    mood: 'nostalgic',
    tags: ['favorite', 'paris', 'museum', 'postcards'],
    trip_start_date: '2026-04-08',
    trip_end_date: '2026-04-12',
    created_at: '2026-04-12T18:20:00.000Z',
    updated_at: '2026-04-12T18:20:00.000Z',
  },
  {
    country_id: 'JP',
    title: 'Lanterns After Dinner',
    content:
      'Kyoto felt quiet and bright at the same time. We followed lantern-lit streets after dinner, saved a few temple notes for the scrapbook, and marked Kyoto and Tokyo on the map before calling it a night.',
    mood: 'peaceful',
    tags: ['kyoto', 'temples', 'night walk'],
    trip_start_date: '2026-05-03',
    trip_end_date: '2026-05-10',
    created_at: '2026-05-10T21:15:00.000Z',
    updated_at: '2026-05-10T21:15:00.000Z',
  },
  {
    country_id: 'IT',
    title: 'Rome, One Long Golden Hour',
    content:
      'The whole afternoon felt like golden hour: espresso, old stone streets, and a last-minute pasta reservation that became the highlight of the trip. I saved this as the trip cover memory.',
    mood: 'happy',
    tags: ['rome', 'food', 'golden hour'],
    trip_start_date: '2026-03-16',
    trip_end_date: '2026-03-20',
    created_at: '2026-03-20T19:45:00.000Z',
    updated_at: '2026-03-20T19:45:00.000Z',
  },
];

function loadEnvFile(path) {
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, '');

    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing ${name}. Add it to .env.local before running this seed.`);
  }

  return value;
}

async function findAuthUserByEmail(supabase, email) {
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;

    const user = data.users.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
    if (user) return user;

    if (data.users.length < 1000) return null;
    page += 1;
  }
}

async function ensureAuthUser(supabase) {
  const existingUser = await findAuthUserByEmail(supabase, DEMO_EMAIL);
  if (existingUser) return existingUser;

  const { data, error } = await supabase.auth.admin.createUser({
    email: DEMO_EMAIL,
    password: randomBytes(24).toString('base64url'),
    email_confirm: true,
    user_metadata: {
      full_name: DEMO_NAME,
    },
  });

  if (error) throw error;
  if (!data.user) throw new Error('Supabase did not return the created demo user.');

  return data.user;
}

async function ensureProfile(supabase, user) {
  const timestamp = user.created_at || new Date().toISOString();
  const { error } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      email: DEMO_EMAIL,
      display_name: DEMO_NAME,
      avatar_url: null,
      created_at: timestamp,
    },
    { onConflict: 'id' }
  );

  if (error) throw error;
}

async function resetDefaultEntries(supabase, userId) {
  const { error: deleteError } = await supabase.from('journal_entries').delete().eq('user_id', userId);
  if (deleteError) throw deleteError;

  const rows = demoEntries.map((entry) => ({
    ...entry,
    user_id: userId,
  }));
  const { data, error } = await supabase.from('journal_entries').insert(rows).select('id,title');
  if (error) throw error;

  return data ?? [];
}

async function removeDemoCanvaConnection(supabase, userId) {
  const { error } = await supabase.from('canva_connections').delete().eq('user_id', userId);

  if (error) throw error;
}

async function findProfileByEmail(supabase, email) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id,email')
    .ilike('email', email)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function ensureAcceptedFriendship(supabase, demoUserId, recipientId) {
  const { data: existing, error: lookupError } = await supabase
    .from('friendships')
    .select('id')
    .or(`and(requester_id.eq.${demoUserId},addressee_id.eq.${recipientId}),and(requester_id.eq.${recipientId},addressee_id.eq.${demoUserId})`)
    .maybeSingle();

  if (lookupError) throw lookupError;

  const payload = {
    requester_id: demoUserId,
    addressee_id: recipientId,
    status: 'accepted',
    blocked_by: null,
    responded_at: new Date().toISOString(),
  };

  if (existing?.id) {
    const { error } = await supabase.from('friendships').update(payload).eq('id', existing.id);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from('friendships').insert(payload);
  if (error) throw error;
}

async function shareEntries(supabase, entries, demoUserId, recipientId) {
  if (entries.length === 0) return;

  const rows = entries.map((entry) => ({
    journal_entry_id: entry.id,
    shared_by: demoUserId,
    shared_with: recipientId,
    permission: 'view',
  }));
  const { error } = await supabase.from('journal_shares').upsert(rows, {
    onConflict: 'journal_entry_id,shared_with',
  });

  if (error) throw error;
}

async function main() {
  loadEnvFile('.env.local');

  const supabase = createClient(requireEnv('NEXT_PUBLIC_SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });

  const demoUser = await ensureAuthUser(supabase);
  await ensureProfile(supabase, demoUser);
  await removeDemoCanvaConnection(supabase, demoUser.id);
  const entries = await resetDefaultEntries(supabase, demoUser.id);
  const recipient = await findProfileByEmail(supabase, SHARE_WITH_EMAIL);

  if (recipient?.id) {
    await ensureAcceptedFriendship(supabase, demoUser.id, recipient.id);
    await shareEntries(supabase, entries, demoUser.id, recipient.id);
  }

  console.log(`Demo traveler ready: ${DEMO_EMAIL}`);
  console.log(`Seeded default entries: ${entries.length}`);
  console.log(
    recipient?.id
      ? `Accepted friendship and shared entries with: ${SHARE_WITH_EMAIL}`
      : `No profile found for ${SHARE_WITH_EMAIL}; create/sign in once, then rerun this seed to share entries.`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
