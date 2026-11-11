// Database tests: `npm run test:db`. No Docker needed.
// Loads every migration + seed into PGlite (Postgres compiled to WASM) with a stand-in for
// Supabase's `auth` schema, then exercises booking rules and RLS as `authenticated` users.
import { PGlite } from '@electric-sql/pglite';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const migrationsDir = join(root, 'migrations');
const migrations = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
const db = new PGlite();

let passed = 0;
let failed = 0;
const ok = (name, cond, detail = '') => {
  if (cond) passed++;
  else failed++;
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
};

// --- Supabase-like environment ------------------------------------------------
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;

  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), phone text);
  create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant usage on schema auth to anon, authenticated;
  grant execute on function auth.uid() to anon, authenticated;

  -- Storage + Realtime stand-ins (the real ones are managed by Supabase).
  create schema storage;
  create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable
    as $$ select (string_to_array(name, '/'))[1:cardinality(string_to_array(name, '/')) - 1] $$;
  grant usage on schema storage to anon, authenticated;
  grant all on storage.objects to anon, authenticated;
  create publication supabase_realtime;
`);

for (const file of migrations) await db.exec(readFileSync(join(migrationsDir, file), 'utf8'));
ok(`migrations apply (${migrations.length})`, true);
await db.exec(readFileSync(join(root, 'seed.sql'), 'utf8'));
const counts = await db.query(
  `select (select count(*) from specialists) s, (select count(*) from reviews) r, (select count(*) from promotions) p`,
);
ok('seed loads', Number(counts.rows[0].s) === 10 && Number(counts.rows[0].r) === 20 && Number(counts.rows[0].p) === 4, JSON.stringify(counts.rows[0]));
const promo = (await db.query(`select headline, cta_label from promotions where sort_order = 1`)).rows[0];
ok('first promotion has its detail page', promo?.headline === 'First time on Doctor Dent?' && promo?.cta_label === 'Book a Session', JSON.stringify(promo));

// Two patients (trigger should create profiles).
const users = await db.query(`insert into auth.users (phone) values ('77021234567'), ('77011112233') returning id`);
const [A, B] = users.rows.map((r) => r.id);
const profiles = await db.query(`select count(*) n from profiles`);
ok('signup trigger creates profiles', Number(profiles.rows[0].n) === 2);

const asUser = async (uid, sql, params) => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${uid ?? ''}', false); set role ${uid ? 'authenticated' : 'anon'};`);
  try {
    return { rows: (await db.query(sql, params)).rows };
  } catch (e) {
    return { error: e.message };
  } finally {
    await db.exec('reset role');
  }
};

const KULBAYEVA = 'a1f0c3e2-0000-4000-8000-000000000001';
const AMANBAYEV = 'a1f0c3e2-0000-4000-8000-000000000002';

// --- Availability --------------------------------------------------------------
const avail = await asUser(A, `select starts_at, free_specialist_ids from get_slot_availability('Therapist')`);
ok('availability returns slots', !avail.error && avail.rows.length > 0, avail.error ?? `${avail.rows.length} slots`);
const local = await db.query(
  `select bool_and(extract(isodow from s at time zone 'Asia/Almaty') between 1 and 5) weekdays,
          bool_and(extract(hour from s at time zone 'Asia/Almaty') between 9 and 19) hours,
          bool_and(s > now()) future,
          min((s at time zone 'Asia/Almaty')::date) - (now() at time zone 'Asia/Almaty')::date min_day,
          max((s at time zone 'Asia/Almaty')::date) - (now() at time zone 'Asia/Almaty')::date max_day
   from unnest($1::timestamptz[]) s`,
  [avail.rows.map((r) => r.starts_at)],
);
const L = local.rows[0];
ok('slots: weekdays, 09–19 local, future, within today..+13', L.weekdays && L.hours && L.future && L.min_day >= 0 && L.max_day <= 13, JSON.stringify(L));
ok('3 therapists free in a fresh slot', avail.rows[0].free_specialist_ids.length === 3);
ok('anon cannot call availability', !!(await asUser(null, `select * from get_slot_availability('Therapist')`)).error);

const slot1 = avail.rows[0].starts_at.toISOString();
const slot2 = avail.rows[1].starts_at.toISOString();

// --- Booking -------------------------------------------------------------------
const b1 = await asUser(A, `select * from book_appointment($1, $2)`, [KULBAYEVA, slot1]);
ok('A books Kulbayeva', !b1.error && b1.rows[0].type === 'First appointment', b1.error ?? b1.rows[0].type);
const apptA = b1.rows?.[0]?.id;

const b2 = await asUser(B, `select * from book_appointment($1, $2)`, [KULBAYEVA, slot1]);
ok('B cannot take the same doctor+slot (slot_taken)', b2.error?.includes('slot_taken'), b2.error);

const b3 = await asUser(A, `select * from book_appointment($1, $2)`, [AMANBAYEV, slot1]);
ok('A cannot double-book themselves (patient_busy)', b3.error?.includes('patient_busy'), b3.error);

const after = await asUser(A, `select free_specialist_ids from get_slot_availability('Therapist') where starts_at = $1`, [slot1]);
ok('booked doctor drops out of availability', !after.rows[0].free_specialist_ids.includes(KULBAYEVA) && after.rows[0].free_specialist_ids.length === 2);

const bad = [
  ['past slot', `now() - interval '1 day'`],
  ['8:00 local', `date_trunc('day', now() at time zone 'Asia/Almaty') + interval '2 days 8 hours'`],
  ['20:00 local', `date_trunc('day', now() at time zone 'Asia/Almaty') + interval '2 days 20 hours'`],
  ['half hour', `date_trunc('day', now() at time zone 'Asia/Almaty') + interval '2 days 10 hours 30 minutes'`],
  ['beyond window', `date_trunc('day', now() at time zone 'Asia/Almaty') + interval '20 days 10 hours'`],
];
for (const [name, expr] of bad) {
  const ts = (await db.query(`select (${expr})${name === 'past slot' ? '' : " at time zone 'Asia/Almaty'"} as t`)).rows[0].t.toISOString();
  const r = await asUser(A, `select * from book_appointment($1, $2)`, [AMANBAYEV, ts]);
  ok(`rejects ${name} (slot_unavailable)`, r.error?.includes('slot_unavailable'), r.error ?? 'booked!');
}
const weekend = (await db.query(`
  select (d + interval '10 hours') at time zone 'Asia/Almaty' t
  from generate_series((now() at time zone 'Asia/Almaty')::date + 1, (now() at time zone 'Asia/Almaty')::date + 13, interval '1 day') d
  where extract(isodow from d) = 6 limit 1`)).rows[0].t.toISOString();
const wk = await asUser(A, `select * from book_appointment($1, $2)`, [AMANBAYEV, weekend]);
ok('rejects Saturday (slot_unavailable)', wk.error?.includes('slot_unavailable'), wk.error);

// --- RLS -----------------------------------------------------------------------
const seeA = await asUser(A, `select id from appointments`);
const seeB = await asUser(B, `select id from appointments`);
ok('A sees own appointment', seeA.rows?.length === 1);
ok('B sees none of A’s appointments', seeB.rows?.length === 0);
const directInsert = await asUser(B, `insert into appointments (patient_id, specialist_id, starts_at, type) values ($1, $2, $3, 'First appointment')`, [B, AMANBAYEV, slot2]);
ok('patients cannot insert appointments directly', !!directInsert.error, directInsert.error);
const phoneEdit = await asUser(B, `update profiles set phone = '70000000000' where id = $1`, [B]);
ok('patients cannot change profile phone', !!phoneEdit.error, phoneEdit.error);
const nameEdit = await asUser(B, `update profiles set full_name = 'Dana Sarsenova' where id = $1 returning full_name`, [B]);
ok('patients can change their name', nameEdit.rows?.[0]?.full_name === 'Dana Sarsenova', nameEdit.error);
const otherEdit = await asUser(B, `update profiles set full_name = 'Hacked' where id = $1 returning id`, [A]);
ok('patients cannot edit another profile', otherEdit.rows?.length === 0, otherEdit.error);
const anonSpecialists = await asUser(null, `select count(*) n from specialists`);
ok('anon can read specialists', Number(anonSpecialists.rows?.[0]?.n) === 10, anonSpecialists.error);

// --- Reschedule + cancel ---------------------------------------------------------
const rs = await asUser(A, `select * from book_appointment($1, $2, $3)`, [AMANBAYEV, slot2, apptA]);
ok('A reschedules to another doctor/slot', !rs.error && rs.rows[0].id === apptA, rs.error);
const rsB = await asUser(B, `select * from book_appointment($1, $2, $3)`, [KULBAYEVA, slot1, apptA]);
ok('B cannot reschedule A’s appointment', rsB.error?.includes('appointment_not_found'), rsB.error);
const freed = await asUser(A, `select free_specialist_ids from get_slot_availability('Therapist') where starts_at = $1`, [slot1]);
ok('old slot frees up after reschedule', freed.rows[0].free_specialist_ids.includes(KULBAYEVA));
const cB = await asUser(B, `select cancel_appointment($1)`, [apptA]);
ok('B cannot cancel A’s appointment', cB.error?.includes('appointment_not_found'), cB.error);
const cA = await asUser(A, `select cancel_appointment($1)`, [apptA]);
ok('A cancels', !cA.error, cA.error);
const rebook = await asUser(B, `select * from book_appointment($1, $2)`, [AMANBAYEV, slot2]);
ok('cancelled slot can be booked again', !rebook.error, rebook.error);

// --- Reviews -------------------------------------------------------------------
const futureReview = await asUser(B, `select * from leave_review($1, 5, 'Great')`, [rebook.rows[0].id]);
ok('cannot review a future visit', futureReview.error?.includes('appointment_not_found'), futureReview.error);
const past = await db.query(
  `insert into appointments (patient_id, specialist_id, starts_at, type) values ($1, $2, now() - interval '3 days', 'First appointment') returning id`,
  [B, KULBAYEVA],
);
const before = (await db.query(`select rating, review_count from specialists where id = $1`, [KULBAYEVA])).rows[0];
const rv = await asUser(B, `select * from leave_review($1, 3, 'It was fine')`, [past.rows[0].id]);
ok('can review a completed visit', !rv.error && rv.rows[0].author_name === 'Dana S.', rv.error ?? rv.rows[0].author_name);
const afterR = (await db.query(`select rating, review_count from specialists where id = $1`, [KULBAYEVA])).rows[0];
ok('review updates count and rating', afterR.review_count === before.review_count + 1, `${before.rating}/${before.review_count} → ${afterR.rating}/${afterR.review_count}`);
const rv2 = await asUser(B, `select * from leave_review($1, 5, 'Again')`, [past.rows[0].id]);
ok('one review per visit (already_reviewed)', rv2.error?.includes('already_reviewed'), rv2.error);
const followUp = await asUser(B, `select * from book_appointment($1, $2)`, [KULBAYEVA, avail.rows[3].starts_at.toISOString()]);
ok('second visit to same doctor is a follow-up', followUp.rows?.[0]?.type === 'Follow-up appointment', followUp.error ?? followUp.rows?.[0]?.type);

// --- Support chat ---------------------------------------------------------------
const welcome = await asUser(A, `select sender, body, read_at from chat_messages`);
ok('new patients get a welcome message from support', welcome.rows?.length === 1 && welcome.rows[0].sender === 'support', welcome.error);
const unread = async (uid) => Number((await asUser(uid, `select count(*) n from chat_messages where sender = 'support' and read_at is null`)).rows[0].n);
ok('welcome message counts as unread', (await unread(A)) === 1);
const markRead = await asUser(A, `select mark_chat_read() n`);
ok('mark_chat_read clears unread', markRead.rows?.[0]?.n === 1 && (await unread(A)) === 0, markRead.error);

const MSG = '11111111-1111-4111-8111-111111111111';
const send = await asUser(A, `select * from send_chat_message($1, $2)`, [MSG, '  Hello. How do I prepare?  ']);
ok('patient sends a text message', !send.error && send.rows[0].body === 'Hello. How do I prepare?' && send.rows[0].sender === 'patient', send.error);
const retry = await asUser(A, `select * from send_chat_message($1, $2)`, [MSG, 'Hello. How do I prepare?']);
const countA = Number((await asUser(A, `select count(*) n from chat_messages where sender = 'patient'`)).rows[0].n);
ok('retrying a send does not duplicate it', !retry.error && countA === 1, retry.error ?? `${countA} rows`);
const steal = await asUser(B, `select * from send_chat_message($1, 'hi')`, [MSG]);
ok('cannot reuse another patient’s message id', steal.error?.includes('invalid_message_id'), steal.error);
const empty = await asUser(A, `select * from send_chat_message(gen_random_uuid(), '   ')`);
ok('rejects an empty message (message_empty)', empty.error?.includes('message_empty'), empty.error);
const img = await asUser(A, `select * from send_chat_message(gen_random_uuid(), null, $1)`, [[`${A}/photo-1.jpg`]]);
ok('patient sends an image from their folder', !img.error && img.rows[0].image_paths.length === 1, img.error);
const foreignImg = await asUser(A, `select * from send_chat_message(gen_random_uuid(), null, $1)`, [[`${B}/photo.jpg`]]);
ok('rejects images from another patient’s folder', foreignImg.error?.includes('invalid_attachment'), foreignImg.error);
const traversal = await asUser(A, `select * from send_chat_message(gen_random_uuid(), null, $1)`, [[`${A}/../${B}/x.jpg`]]);
ok('rejects path traversal in image paths', traversal.error?.includes('invalid_attachment'), traversal.error);
const seeChatB = await asUser(B, `select count(*) n from chat_messages where patient_id = $1`, [A]);
ok('B cannot read A’s conversation', Number(seeChatB.rows?.[0]?.n) === 0, seeChatB.error);
const directChat = await asUser(A, `insert into chat_messages (patient_id, sender, agent_id, body) values ($1, 'support', 'b2f0c3e2-0000-4000-8000-000000000001', 'fake') returning id`, [A]);
ok('patients cannot insert messages directly (no fake support replies)', !!directChat.error, directChat.error);
const fakeRead = await asUser(A, `update chat_messages set read_at = now() where sender = 'patient' returning id`);
ok('patients cannot mark their own messages read', !!fakeRead.error || fakeRead.rows.length === 0, fakeRead.error);
const replyAsPatient = await asUser(A, `select support_reply('77021234567', 'hi')`);
ok('patients cannot call support_reply', !!replyAsPatient.error, replyAsPatient.error);

const delivered = await db.query(`select support_mark_delivered('+7 702 123 45 67') n`);
ok('desk marks messages delivered (phone in any format)', delivered.rows[0].n === 2);
await db.query(`select support_reply('77021234567', 'Just do not eat 2 hours before the appointment', 'Jessica')`);
const statuses = (await asUser(A, `select sender, delivered_at is not null d, read_at is not null r from chat_messages order by created_at`)).rows;
ok('support reply marks patient messages read', statuses.filter((s) => s.sender === 'patient').every((s) => s.d && s.r), JSON.stringify(statuses));
ok('support reply is unread for the patient', (await unread(A)) === 1);
const agent = await asUser(A, `select a.name from chat_messages m join support_agents a on a.id = m.agent_id where m.read_at is null`);
ok('patients can see the agent’s name', agent.rows?.[0]?.name === 'Jessica', agent.error);
const badAgent = await db.query(`select support_reply('77021234567', 'x', 'Nobody')`).catch((e) => ({ error: e.message }));
ok('support_reply rejects unknown agents', badAgent.error?.includes('agent_not_found'), badAgent.error);

const upload = await asUser(A, `insert into storage.objects (bucket_id, name) values ('chat', $1) returning id`, [`${A}/a.jpg`]);
ok('patients upload to their own chat folder', !upload.error, upload.error);
const uploadOther = await asUser(A, `insert into storage.objects (bucket_id, name) values ('chat', $1) returning id`, [`${B}/a.jpg`]);
ok('patients cannot upload into another folder', !!uploadOther.error, uploadOther.error ?? 'allowed!');
const readOther = await asUser(B, `select count(*) n from storage.objects where bucket_id = 'chat'`);
ok('patients cannot read another patient’s images', Number(readOther.rows?.[0]?.n) === 0, readOther.error);

// --- Delete account ---------------------------------------------------------------
const del = await asUser(B, `select delete_my_account()`);
const left = (await db.query(`select (select count(*) from auth.users where id = $1) u, (select count(*) from appointments where patient_id = $1) a, (select count(*) from chat_messages where patient_id = $1) c, (select count(*) from reviews where author_id is null and body = 'It was fine') r`, [B])).rows[0];
ok('delete account removes user, appointments and chat, keeps review anonymised', !del.error && Number(left.u) === 0 && Number(left.a) === 0 && Number(left.c) === 0 && Number(left.r) === 1, del.error ?? JSON.stringify(left));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
