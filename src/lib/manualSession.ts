export type ManualUser = {
  id: string;
  username: string;
  role: string;
};

export type ManualSession = {
  token: string;
  user: ManualUser;
};

const STORAGE_KEY = "darktech_manual_session";

export function saveManualSession(session: ManualSession) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function getManualSession(): ManualSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ManualSession;
  } catch {
    return null;
  }
}

export function clearManualSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
