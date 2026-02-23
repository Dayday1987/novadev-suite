// ide.auth.js

let supabase = null;

/* ==============================
   Init Supabase
============================== */

export function initAuth() {

  const SUPABASE_URL = "https://zyispsfejdfyfluahnr.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5aXNwc2ZlamRmeWZscHVhaG5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MTIyNTQsImV4cCI6MjA4Njk4ODI1NH0.awxFlFo54MwGFYpgcHrRtrqEHjIFqJH5qmx5_Gp_Ju0";

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
