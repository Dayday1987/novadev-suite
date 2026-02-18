// ide.auth.js

let supabase = null;

export function initAuth() {

  const SUPABASE_URL = "PASTE_YOUR_PROJECT_URL_HERE";
  const SUPABASE_ANON_KEY = "PASTE_YOUR_ANON_KEY_HERE";

  supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

  return supabase;
}

export function getSupabase() {
  return supabase;
}

/* ==============================
   Session Handling
============================== */

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signUp(email, password) {
  return await supabase.auth.signUp({ email, password });
}

export async function signIn(email, password) {
  return await supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return await supabase.auth.signOut();
}

/* ==============================
   OAuth
============================== */

export async function signInWithProvider(provider) {
  return await supabase.auth.signInWithOAuth({
    provider
  });
}
