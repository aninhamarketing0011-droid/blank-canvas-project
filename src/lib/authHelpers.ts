export function usernameToEmail(username: string): string {
  const clean = username.trim().toLowerCase().replace(/[^a-z0-9]+/g, ".");
  const safe = clean.replace(/^\.+|\.+$/g, "") || "user";
  // FIX: Uso de domínio interno seguro
  return `${safe}@darktech.sys`;
}

