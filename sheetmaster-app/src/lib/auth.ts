import { Session, User } from "@/types";

const TOKEN_KEY = "sm_token";
const USER_KEY = "sm_user";

export function saveSession(token: string, user: User): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getSession(): Session | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(TOKEN_KEY);
  const userStr = localStorage.getItem(USER_KEY);
  if (!token || !userStr) return null;
  try {
    return { token, user: JSON.parse(userStr) };
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  return !!getSession();
}

export function getStoredUser(): User | null {
  return getSession()?.user ?? null;
}
