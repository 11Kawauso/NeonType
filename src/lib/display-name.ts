export const DEFAULT_DISPLAY_NAME = "ゲスト";
export const DISPLAY_NAME_MAX = 12;

const STORAGE_KEY = "neontype.displayName";

export function parseDisplayName(
  raw: unknown,
): { ok: true; name: string } | { ok: false; error: "too_long" } {
  const trimmed = typeof raw === "string" ? raw.trim() : "";
  if (trimmed.length === 0) return { ok: true, name: DEFAULT_DISPLAY_NAME };
  if ([...trimmed].length > DISPLAY_NAME_MAX) return { ok: false, error: "too_long" };
  return { ok: true, name: trimmed };
}

export function getStoredDisplayName(): string {
  return localStorage.getItem(STORAGE_KEY) ?? "";
}

export function setStoredDisplayName(name: string): void {
  localStorage.setItem(STORAGE_KEY, name);
}

export function getDisplayName(): string {
  const parsed = parseDisplayName(getStoredDisplayName());
  return parsed.ok ? parsed.name : DEFAULT_DISPLAY_NAME;
}
