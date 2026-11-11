/**
 * Supabase data access. Rows are mapped to camelCase app types here so screens never
 * see database column names. Schema: supabase/migrations/ (core_schema, support_chat).
 */
import type { PostgrestError } from '@supabase/supabase-js';
import { randomUUID } from 'expo-crypto';

import { mediaUrl, supabase } from '@/lib/supabase';

import type { Specialty } from './constants';

// ---------------------------------------------------------------------------
// App types
// ---------------------------------------------------------------------------

export type Specialist = {
  id: string;
  name: string;
  specialty: Specialty;
  photoUrl: string | null;
  rating: number;
  reviewCount: number;
  yearsOfExperience: number;
  priceFrom: number;
  clinic: string;
  skills: string[];
  description: string;
};

export type Review = {
  id: string;
  author: string;
  rating: number;
  body: string;
  createdAt: string;
};

export type Promotion = {
  id: string;
  title: string;
  imageUrl: string | null;
  /** Present when the promotion opens a detail page (Figma 4203:2255). */
  detail: { headline: string; body: string; heroImageUrl: string | null; ctaLabel: string | null } | null;
};

type PromotionRow = {
  id: string;
  title: string;
  image_path: string;
  headline: string | null;
  body: string | null;
  hero_image_path: string | null;
  cta_label: string | null;
};

export type AppointmentType = 'First appointment' | 'Follow-up appointment';

export type Appointment = {
  id: string;
  title: string;
  type: AppointmentType;
  startsAt: string;
  specialistId: string;
  /** Embedded so cards don't need a second request. */
  specialist: Specialist;
};

export type Profile = {
  id: string;
  phone: string | null;
  fullName: string | null;
  homeAddress: string | null;
};

/** A bookable slot and the specialists still free in it. */
export type Slot = { startsAt: string; freeSpecialistIds: string[] };

/** Status of the patient's own message. `sending`/`failed` exist only on the device. */
export type MessageStatus = 'sending' | 'failed' | 'sent' | 'delivered' | 'read';

export type ChatImage = {
  /** Storage path, or the local file URI while the message is still sending. */
  key: string;
  url: string | null;
};

export type ChatMessage = {
  id: string;
  sender: 'patient' | 'support';
  body: string | null;
  images: ChatImage[];
  createdAt: string;
  status: MessageStatus;
  /** The support agent who wrote it (support messages only). */
  agent: { name: string; avatarUrl: string | null } | null;
};

/** A photo picked on the device, before upload. */
export type LocalImage = { uri: string; mimeType?: string | null };

// ---------------------------------------------------------------------------
// Row shapes + mappers
// ---------------------------------------------------------------------------

type SpecialistRow = {
  id: string;
  full_name: string;
  specialty: Specialty;
  photo_path: string | null;
  rating: number;
  review_count: number;
  years_of_experience: number;
  price_from: number;
  clinic: string;
  skills: string[];
  description: string;
};

type AppointmentRow = {
  id: string;
  title: string;
  type: AppointmentType;
  starts_at: string;
  specialist_id: string;
  specialist: SpecialistRow;
};

type ChatMessageRow = {
  id: string;
  sender: 'patient' | 'support';
  body: string | null;
  image_paths: string[];
  created_at: string;
  delivered_at: string | null;
  read_at: string | null;
  agent: { name: string; avatar_path: string | null } | null;
};

const SPECIALIST_COLUMNS =
  'id, full_name, specialty, photo_path, rating, review_count, years_of_experience, price_from, clinic, skills, description';

const APPOINTMENT_COLUMNS = `id, title, type, starts_at, specialist_id, specialist:specialists (${SPECIALIST_COLUMNS})`;

function toSpecialist(row: SpecialistRow): Specialist {
  return {
    id: row.id,
    name: row.full_name,
    specialty: row.specialty,
    photoUrl: mediaUrl(row.photo_path),
    rating: Number(row.rating),
    reviewCount: row.review_count,
    yearsOfExperience: row.years_of_experience,
    priceFrom: row.price_from,
    clinic: row.clinic,
    skills: row.skills,
    description: row.description,
  };
}

function toAppointment(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    startsAt: row.starts_at,
    specialistId: row.specialist_id,
    specialist: toSpecialist(row.specialist),
  };
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

/** Exception names raised by the database functions → copy shown to patients. */
const FRIENDLY_ERRORS: Record<string, string> = {
  not_authenticated: 'Your session has expired. Please sign in again.',
  slot_unavailable: 'This time can no longer be booked. Please choose another slot.',
  slot_taken: 'Someone has just booked this time. Please choose another slot.',
  patient_busy: 'You already have an appointment at this time.',
  specialist_not_found: 'This specialist is no longer available.',
  appointment_not_found: 'This appointment can no longer be changed.',
  already_reviewed: 'You have already reviewed this visit.',
  message_empty: 'Type a message or add a photo.',
  message_too_long: 'This message is too long. Please split it into shorter ones.',
  invalid_attachment: 'This photo could not be attached. Please try again.',
  invalid_message_id: 'This message could not be sent. Please try again.',
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code?: string,
  ) {
    super(message);
  }
}

function fail(error: PostgrestError): never {
  const friendly = FRIENDLY_ERRORS[error.message];
  // In development, show the real cause (e.g. a migration that hasn't been pushed yet).
  const fallback = __DEV__ ? `Something went wrong: ${error.message}` : 'Something went wrong. Please try again.';
  throw new ApiError(friendly ?? fallback, error.message);
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function fetchSpecialists(): Promise<Specialist[]> {
  const { data, error } = await supabase.from('specialists').select(SPECIALIST_COLUMNS).order('rating', { ascending: false });
  if (error) fail(error);
  return (data as SpecialistRow[]).map(toSpecialist);
}

export async function fetchSpecialist(id: string): Promise<Specialist | null> {
  const { data, error } = await supabase.from('specialists').select(SPECIALIST_COLUMNS).eq('id', id).maybeSingle();
  if (error) fail(error);
  return data ? toSpecialist(data as SpecialistRow) : null;
}

export async function fetchReviews(specialistId: string, limit: number): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('id, author_name, rating, body, created_at')
    .eq('specialist_id', specialistId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) fail(error);
  return (data as { id: string; author_name: string; rating: number; body: string; created_at: string }[]).map((r) => ({
    id: r.id,
    author: r.author_name,
    rating: Number(r.rating),
    body: r.body,
    createdAt: r.created_at,
  }));
}

export async function fetchPromotions(): Promise<Promotion[]> {
  const { data, error } = await supabase
    .from('promotions')
    .select('id, title, image_path, headline, body, hero_image_path, cta_label')
    .order('sort_order');
  if (error) fail(error);
  return (data as PromotionRow[]).map((p) => ({
    id: p.id,
    title: p.title,
    imageUrl: mediaUrl(p.image_path),
    detail: p.body
      ? {
          headline: p.headline ?? p.title,
          body: p.body,
          heroImageUrl: mediaUrl(p.hero_image_path ?? p.image_path),
          ctaLabel: p.cta_label,
        }
      : null,
  }));
}

/** The patient's live (not cancelled) appointments, oldest first. RLS limits rows to the caller. */
export async function fetchMyAppointments(): Promise<Appointment[]> {
  const { data, error } = await supabase
    .from('appointments')
    .select(APPOINTMENT_COLUMNS)
    .eq('status', 'scheduled')
    .order('starts_at');
  if (error) fail(error);
  return (data as unknown as AppointmentRow[]).map(toAppointment);
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, phone, full_name, home_address')
    .eq('id', userId)
    .maybeSingle();
  if (error) fail(error);
  if (!data) return null;
  const row = data as { id: string; phone: string | null; full_name: string | null; home_address: string | null };
  return { id: row.id, phone: row.phone, fullName: row.full_name, homeAddress: row.home_address };
}

export async function fetchSlotAvailability(specialty: Specialty): Promise<Slot[]> {
  const { data, error } = await supabase.rpc('get_slot_availability', { p_specialty: specialty });
  if (error) fail(error);
  return (data as { starts_at: string; free_specialist_ids: string[] }[]).map((s) => ({
    startsAt: s.starts_at,
    freeSpecialistIds: s.free_specialist_ids,
  }));
}

// ---------------------------------------------------------------------------
// Support chat
// ---------------------------------------------------------------------------

const CHAT_BUCKET = 'chat';
const CHAT_COLUMNS = 'id, sender, body, image_paths, created_at, delivered_at, read_at, agent:support_agents (name, avatar_path)';
/** Signed image links stay valid for a day; the conversation is refetched long before that. */
const SIGNED_URL_TTL = 60 * 60 * 24;

/** The latest messages of the patient's conversation, newest first. */
export async function fetchChatMessages(limit = 200): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select(CHAT_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) fail(error);
  const rows = data as unknown as ChatMessageRow[];

  // Images are private: one request signs every path in the conversation.
  const paths = rows.flatMap((r) => r.image_paths);
  const signed = new Map<string, string>();
  if (paths.length > 0) {
    const { data: urls } = await supabase.storage.from(CHAT_BUCKET).createSignedUrls(paths, SIGNED_URL_TTL);
    for (const u of urls ?? []) if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl);
  }

  return rows.map((r) => ({
    id: r.id,
    sender: r.sender,
    body: r.body,
    images: r.image_paths.map((path) => ({ key: path, url: signed.get(path) ?? null })),
    createdAt: r.created_at,
    status: r.read_at ? 'read' : r.delivered_at ? 'delivered' : 'sent',
    agent: r.agent ? { name: r.agent.name, avatarUrl: mediaUrl(r.agent.avatar_path) } : null,
  }));
}

export async function fetchUnreadChatCount(): Promise<number> {
  const { count, error } = await supabase
    .from('chat_messages')
    .select('id', { count: 'exact', head: true })
    .eq('sender', 'support')
    .is('read_at', null);
  if (error) fail(error);
  return count ?? 0;
}

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/webp': 'webp',
};

/** Uploads a picked photo to `chat/<patient id>/<uuid>.<ext>` and returns its path. */
async function uploadChatImage(userId: string, image: LocalImage): Promise<string> {
  const contentType = image.mimeType && EXTENSIONS[image.mimeType] ? image.mimeType : 'image/jpeg';
  const path = `${userId}/${randomUUID()}.${EXTENSIONS[contentType]}`;
  const bytes = await fetch(image.uri).then((r) => r.arrayBuffer());
  const { error } = await supabase.storage.from(CHAT_BUCKET).upload(path, bytes, { contentType });
  if (error) throw new ApiError('This photo could not be uploaded. Please try again.', 'upload_failed');
  return path;
}

/** Sends a message. `id` is generated on the device, so retrying the same send is safe. */
export async function sendChatMessage(input: {
  userId: string;
  id: string;
  body: string | null;
  images: LocalImage[];
}): Promise<void> {
  const imagePaths = await Promise.all(input.images.map((image) => uploadChatImage(input.userId, image)));
  const { error } = await supabase.rpc('send_chat_message', {
    p_id: input.id,
    p_body: input.body,
    p_image_paths: imagePaths,
  });
  if (error) fail(error);
}

export async function markChatRead(): Promise<void> {
  const { error } = await supabase.rpc('mark_chat_read');
  if (error) fail(error);
}

/** Calls `onChange` whenever a message in the patient's conversation is added or updated. */
export function subscribeToChat(userId: string, onChange: () => void): () => void {
  const channel = supabase
    .channel(`chat:${userId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'chat_messages', filter: `patient_id=eq.${userId}` },
      onChange,
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function bookAppointment(input: {
  specialistId: string;
  startsAt: Date;
  rescheduleId?: string | null;
}): Promise<{ id: string }> {
  const { data, error } = await supabase.rpc('book_appointment', {
    p_specialist_id: input.specialistId,
    p_starts_at: input.startsAt.toISOString(),
    p_reschedule_id: input.rescheduleId ?? null,
  });
  if (error) fail(error);
  return { id: (data as { id: string }).id };
}

export async function cancelAppointment(id: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_appointment', { p_appointment_id: id });
  if (error) fail(error);
}

export async function leaveReview(input: { appointmentId: string; rating: number; body: string }): Promise<void> {
  const { error } = await supabase.rpc('leave_review', {
    p_appointment_id: input.appointmentId,
    p_rating: input.rating,
    p_body: input.body,
  });
  if (error) fail(error);
}

export async function updateProfile(
  userId: string,
  changes: Partial<Pick<Profile, 'fullName' | 'homeAddress'>>,
): Promise<void> {
  const row: Record<string, string | null> = {};
  if ('fullName' in changes) row.full_name = changes.fullName ?? null;
  if ('homeAddress' in changes) row.home_address = changes.homeAddress ?? null;
  const { error } = await supabase.from('profiles').update(row).eq('id', userId);
  if (error) fail(error);
}

export async function deleteMyAccount(userId: string): Promise<void> {
  // Storage files don't cascade with the account; remove the patient's chat photos first.
  // Best effort — a leftover photo must not block deleting the account.
  const { data: files } = await supabase.storage.from(CHAT_BUCKET).list(userId, { limit: 1000 });
  if (files?.length) {
    await supabase.storage.from(CHAT_BUCKET).remove(files.map((f) => `${userId}/${f.name}`));
  }
  const { error } = await supabase.rpc('delete_my_account');
  if (error) fail(error);
}
