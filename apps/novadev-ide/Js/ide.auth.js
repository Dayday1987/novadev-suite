// ide.auth.js

let supabase = null;

/* ==============================
   Init Supabase
============================== */

export function initAuth() {

  const SUPABASE_URL = "https://zyispsfejdfyfluahnr.supabase.co";
  const SUPABASE_ANON_KEY = "YOUR_PUBLIC_ANON_KEY_HERE";

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
    provider,
    options: {
      redirectTo: window.location.href
    }
  });
}
