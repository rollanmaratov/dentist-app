import type { Session as SupabaseSession } from '@supabase/supabase-js';
import { createContext, use, useEffect, useState, type PropsWithChildren } from 'react';

import { supabase } from '@/lib/supabase';

/** Supabase SMS codes are always 6 digits (not configurable). */
export const OTP_LENGTH = 6;

type AuthResult = { ok: true } | { ok: false; message: string };

type Session = {
  /** False until the stored session has been restored on launch. */
  isReady: boolean;
  isSignedIn: boolean;
  userId: string | null;
  /** E.164 digits without "+", e.g. "77021234567". */
  phone: string | null;
  /** Local 10-digit number entered on the sign-in screen, waiting for its code. */
  pendingPhone: string | null;
  requestCode: (localDigits: string) => Promise<AuthResult>;
  resendCode: () => Promise<AuthResult>;
  verifyCode: (code: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<Session | null>(null);

/** Kazakhstan numbers: +7 followed by the 10 local digits. */
const toE164 = (localDigits: string) => `+7${localDigits}`;

function authError(error: { message: string; code?: string }, phone?: string): AuthResult {
  // Supabase messages are developer-facing; map the ones patients can hit.
  const { code = '', message } = error;
  if (code === 'sms_send_failed') {
    return {
      ok: false,
      message: `We couldn't send an SMS to ${phone ? formatPhone(phone) : 'this number'}. Check the number and try again.`,
    };
  }
  if (code.startsWith('over_') || /rate limit|security purposes|too many/i.test(message)) {
    return { ok: false, message: 'Too many attempts. Please wait a minute and try again.' };
  }
  if (code === 'otp_expired' || /expired|invalid/i.test(message)) {
    return { ok: false, message: 'Code incorrect. Try again' };
  }
  if (/network|fetch/i.test(message)) {
    return { ok: false, message: 'No connection. Check your internet and try again.' };
  }
  return { ok: false, message: __DEV__ ? `Something went wrong: ${message}` : 'Something went wrong. Please try again.' };
}

/**
 * Accepts what people actually type or autofill: "702 123 45 67", "+7 702 123 45 67",
 * "8 702 123 45 67", "77021234567" → "7021234567" (the 10 local digits after +7).
 */
export function toLocalDigits(text: string): string {
  let digits = text.replace(/\D/g, '');
  if (digits.length > 10 && (digits.startsWith('7') || digits.startsWith('8'))) digits = digits.slice(1);
  return digits.slice(0, 10);
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<SupabaseSession | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);

  useEffect(() => {
    // Restores the persisted session, then follows sign-in / sign-out / token refresh.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setIsReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const sendCode = async (localDigits: string): Promise<AuthResult> => {
    const { error } = await supabase.auth.signInWithOtp({ phone: toE164(localDigits) });
    return error ? authError(error, localDigits) : { ok: true };
  };

  const value: Session = {
    isReady,
    isSignedIn: session !== null,
    userId: session?.user.id ?? null,
    phone: session?.user.phone ?? null,
    pendingPhone,

    requestCode: async (localDigits) => {
      const result = await sendCode(localDigits);
      if (result.ok) setPendingPhone(localDigits);
      return result;
    },

    resendCode: async () => (pendingPhone ? sendCode(pendingPhone) : { ok: false, message: 'Enter your phone number again.' }),

    verifyCode: async (code) => {
      if (!pendingPhone) return { ok: false, message: 'Enter your phone number again.' };
      const { error } = await supabase.auth.verifyOtp({ phone: toE164(pendingPhone), token: code, type: 'sms' });
      if (error) return authError(error);
      setPendingPhone(null);
      return { ok: true };
    },

    signOut: async () => {
      await supabase.auth.signOut();
    },
  };

  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession(): Session {
  const ctx = use(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}

/** "77021234567" or "7021234567" → "+7 702 123 45 67" */
export function formatPhone(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(-10);
  const parts = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 8), d.slice(8, 10)].filter(Boolean);
  return `+7 ${parts.join(' ')}`;
}
