/**
 * React Query hooks over src/data/api.ts — screens use these, never `supabase` directly.
 */
import { useMutation, useMutationState, useQuery, useQueryClient, type Mutation } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { useSession } from '@/features/auth/session';

import * as api from './api';
import type { Specialty } from './constants';

export const queryKeys = {
  specialists: ['specialists'] as const,
  specialist: (id: string) => ['specialists', id] as const,
  reviews: (specialistId: string, limit: number) => ['reviews', specialistId, limit] as const,
  promotions: ['promotions'] as const,
  appointments: ['appointments'] as const,
  profile: (userId: string) => ['profile', userId] as const,
  availability: (specialty: Specialty) => ['availability', specialty] as const,
  /** Prefix for everything chat — invalidating it refreshes messages and the unread badge. */
  chat: ['chat'] as const,
  chatMessages: ['chat', 'messages'] as const,
  chatUnread: ['chat', 'unread'] as const,
};

export function useSpecialists() {
  return useQuery({ queryKey: queryKeys.specialists, queryFn: api.fetchSpecialists });
}

export function useSpecialist(id: string) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: queryKeys.specialist(id),
    queryFn: () => api.fetchSpecialist(id),
    // Show the row from the list instantly when we already have it.
    initialData: () => queryClient.getQueryData<api.Specialist[]>(queryKeys.specialists)?.find((s) => s.id === id),
  });
}

export function useReviews(specialistId: string, limit = 2) {
  return useQuery({
    queryKey: queryKeys.reviews(specialistId, limit),
    queryFn: () => api.fetchReviews(specialistId, limit),
  });
}

export function usePromotions() {
  return useQuery({ queryKey: queryKeys.promotions, queryFn: api.fetchPromotions });
}

export function usePromotion(id: string) {
  return useQuery({
    queryKey: queryKeys.promotions,
    queryFn: api.fetchPromotions,
    select: (promotions) => promotions.find((p) => p.id === id) ?? null,
  });
}

/** Upcoming (soonest first) and history (newest first) — a past scheduled visit is "completed". */
export function useAppointments() {
  const query = useQuery({
    queryKey: queryKeys.appointments,
    queryFn: api.fetchMyAppointments,
    select: splitByTime,
  });
  const empty: api.Appointment[] = [];
  return {
    ...query,
    upcoming: query.data?.upcoming ?? empty,
    history: query.data?.history ?? empty,
    getById: (id: string) => query.data?.all.find((a) => a.id === id),
  };
}

function splitByTime(all: api.Appointment[]) {
  const now = Date.now();
  return {
    all,
    upcoming: all.filter((a) => new Date(a.startsAt).getTime() >= now),
    history: all.filter((a) => new Date(a.startsAt).getTime() < now).reverse(),
  };
}

export function useProfile() {
  const { userId } = useSession();
  return useQuery({
    queryKey: queryKeys.profile(userId ?? ''),
    queryFn: () => api.fetchProfile(userId!),
    enabled: !!userId,
  });
}

export function useSlotAvailability(specialty: Specialty | null) {
  return useQuery({
    queryKey: queryKeys.availability(specialty ?? 'Therapist'),
    queryFn: () => api.fetchSlotAvailability(specialty!),
    enabled: specialty !== null,
    // Slots change as other patients book; keep this fresh.
    staleTime: 15_000,
  });
}

export function useBookAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.bookAppointment,
    onSettled: () => {
      // Refetch on failure too: a "slot_taken" error means our availability was stale.
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.cancelAppointment,
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments });
      queryClient.invalidateQueries({ queryKey: ['availability'] });
    },
  });
}

export function useLeaveReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.leaveReview,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.specialists });
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { userId } = useSession();
  return useMutation({
    mutationFn: (changes: Parameters<typeof api.updateProfile>[1]) => api.updateProfile(userId!, changes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.profile(userId ?? '') }),
  });
}

export function useDeleteAccount() {
  const { userId } = useSession();
  return useMutation({ mutationFn: () => api.deleteMyAccount(userId!) });
}

// ---------------------------------------------------------------------------
// Support chat
// ---------------------------------------------------------------------------

const SEND_CHAT_MESSAGE = ['chat', 'send'] as const;

export type SendVariables = { id: string; body: string | null; images: api.LocalImage[] };

/** Sends a message. Pending and failed sends show up in `useChatThread` straight away. */
export function useSendChatMessage() {
  const queryClient = useQueryClient();
  const { userId } = useSession();
  return useMutation({
    mutationKey: SEND_CHAT_MESSAGE,
    mutationFn: (variables: SendVariables) => api.sendChatMessage({ userId: userId!, ...variables }),
    // Stay "pending" until the refetch lands, so the bubble never blinks out in between.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.chatMessages }),
  });
}

/**
 * The conversation, newest first: server messages plus this device's messages that are
 * still sending or failed (optimistic UI from mutation variables).
 */
export function useChatThread() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: queryKeys.chatMessages, queryFn: () => api.fetchChatMessages() });
  const sends = useMutationState({
    filters: { mutationKey: SEND_CHAT_MESSAGE, predicate: (m) => m.state.status === 'pending' || m.state.status === 'error' },
    select: (m) => ({
      mutationId: m.mutationId,
      status: m.state.status,
      submittedAt: m.state.submittedAt,
      variables: m.state.variables as SendVariables,
    }),
  });

  const server = query.data ?? [];
  const onServer = new Set(server.map((m) => m.id));
  // Latest attempt per message id wins (a retry replaces its failed attempt).
  const local = new Map<string, api.ChatMessage>();
  for (const send of [...sends].sort((a, b) => a.submittedAt - b.submittedAt)) {
    const { id, body, images } = send.variables;
    if (onServer.has(id)) continue;
    local.set(id, {
      id,
      sender: 'patient',
      body,
      images: images.map((image) => ({ key: image.uri, url: image.uri })),
      createdAt: new Date(send.submittedAt).toISOString(),
      status: send.status === 'error' ? 'failed' : 'sending',
      agent: null,
    });
  }
  const messages = [...[...local.values()].reverse(), ...server];

  /** Removes a failed send and returns what it tried to send — to retry it, or just to delete it. */
  const takeFailed = (messageId: string): SendVariables | undefined => {
    const cache = queryClient.getMutationCache();
    let variables: SendVariables | undefined;
    for (const m of cache.findAll({ mutationKey: SEND_CHAT_MESSAGE, status: 'error' })) {
      const attempt = (m as Mutation<unknown, unknown, SendVariables>).state.variables;
      if (attempt?.id === messageId) {
        variables = attempt;
        cache.remove(m);
      }
    }
    return variables;
  };

  return { ...query, messages, takeFailed };
}

export function useUnreadChatCount() {
  const { userId } = useSession();
  return useQuery({ queryKey: queryKeys.chatUnread, queryFn: api.fetchUnreadChatCount, enabled: !!userId });
}

export function useMarkChatRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.markChatRead,
    onSuccess: () => queryClient.setQueryData(queryKeys.chatUnread, 0),
  });
}

/**
 * Keeps chat queries live while signed in: refetch on every change to the patient's
 * conversation (new replies, delivered/read receipts) and when the app returns to the
 * foreground, in case the socket missed something while suspended.
 */
export function useChatRealtime() {
  const queryClient = useQueryClient();
  const { userId } = useSession();

  useEffect(() => {
    if (!userId) return;
    const refresh = () => queryClient.invalidateQueries({ queryKey: queryKeys.chat });
    const unsubscribe = api.subscribeToChat(userId, refresh);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      unsubscribe();
      appState.remove();
    };
  }, [queryClient, userId]);
}
