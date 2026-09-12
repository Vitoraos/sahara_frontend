import { api } from "./api";
import { supabase } from "./supabase";

const KEY = "sahara_token";

export const SIGNUP_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "ha", name: "Hausa" },
  { code: "yo", name: "Yoruba" },
  { code: "ig", name: "Igbo" },
  { code: "pcm", name: "Pidgin" },
  { code: "sw", name: "Swahili" },
] as const;

export function getToken(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function saveToken(token: string | null | undefined): void {
  try {
    if (token) localStorage.setItem(KEY, token);
  } catch {
    /* private mode */
  }
}

export function clearToken(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  try {
    void supabase().auth.signOut();
  } catch {
    /* not configured */
  }
}

export async function signUpPatient(input: {
  name: string;
  phone: string;
  email: string;
  password: string;
  language?: string;
}): Promise<string | null> {
  const { data, error } = await api.POST("/api/auth/patient/signup", {
    body: { name: input.name, phone_number: input.phone, email: input.email, password: input.password, preferred_language: input.language ?? "en" },
  });
  if (error || !data) throw new Error("Signup failed. Check details or confirm email is off in Supabase.");
  saveToken(data.access_token);
  return data.patient_id;
}

export async function signInPatient(email: string, password: string): Promise<void> {
  const { data, error } = await supabase().auth.signInWithPassword({ email, password });
  if (error) throw error;
  saveToken(data.session?.access_token);
}
