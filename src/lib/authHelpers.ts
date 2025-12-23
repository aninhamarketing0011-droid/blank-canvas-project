export function usernameToEmail(username: string): string {
  const clean = username
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".");

  const safe = clean.replace(/^\.+|\.+$/g, "") || "user";

  // Usa um domínio público com formato 100% válido; é apenas interno para o Supabase.
  return `user+${safe}@gmail.com`;
}

