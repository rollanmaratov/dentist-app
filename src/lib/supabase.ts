import 'expo-sqlite/localStorage/install';

import { createClient } from '@supabase/supabase-js';
import { AppState } from 'react-native';

// Tolerate copy-paste slips: whitespace, quotes, a trailing slash or a trailing dot
// ("…supabase.co." breaks TLS on iOS and surfaces as a network error).
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim()
  .replace(/^["']|["']$/g, '')
  .replace(/[./]+$/, '');
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim().replace(/^["']|["']$/g, '');

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Supabase is not configured. Copy .env.example to .env.local, fill in EXPO_PUBLIC_SUPABASE_URL and ' +
      'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, then restart `npx expo start`.',
  );
}

/**
 * Supabase client, set up as in the Expo guide (docs.expo.dev/guides/using-supabase):
 * the session persists in expo-sqlite's localStorage; there's no URL to read sessions from.
 * Only the publishable key ships in the app — never the database password or a secret key.
 */
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refresh tokens only while the app is in the foreground.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh();
  } else {
    supabase.auth.stopAutoRefresh();
  }
});

/** Public URL of an image in the `media` bucket (specialist photos, promotion banners). */
export function mediaUrl(path: string | null): string | null {
  return path ? supabase.storage.from('media').getPublicUrl(path).data.publicUrl : null;
}
