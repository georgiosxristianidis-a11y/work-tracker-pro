import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';

const isValidUrl = supabaseUrl && supabaseUrl.startsWith('https://') && !supabaseUrl.includes('your-project');
const isValidKey = supabaseAnonKey && supabaseAnonKey.length > 20 && !supabaseAnonKey.includes('your-anon');

export const supabase = isValidUrl && isValidKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// RLS policies key on auth.uid(); an anonymous session gives each install a
// stable user id without any signup flow. Session persists in localStorage.
export async function ensureAuth(): Promise<string | null> {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return session.user.id;
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) {
    console.warn('Anonymous sign-in failed:', error?.message);
    return null;
  }
  return data.user.id;
}
