const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;
const WHITESPACE = /\s+/g;

export function normalizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.replace(CONTROL_CHARS, "").replace(WHITESPACE, " ").trim().slice(0, maxLength);
}

export function normalizeEmail(value: unknown) {
  return normalizeText(value, 254).toLowerCase();
}

export function normalizePhone(value: unknown) {
  return normalizeText(value, 30).replace(/[^\d+()\-\s]/g, "");
}

export function normalizePassword(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(CONTROL_CHARS, "").slice(0, 128);
}

export function normalizeSearch(value: unknown) {
  return normalizeText(value, 80);
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isValidPhone(value: string) {
  return /^[\d+()\-\s]{7,30}$/.test(value);
}

export function isValidPassword(value: string) {
  return value.length >= 8 && value.length <= 128;
}

export function hasOnlyAllowedKeys(data: Record<string, unknown>, allowed: string[]) {
  const allowedSet = new Set(allowed);
  return Object.keys(data).every((key) => allowedSet.has(key));
}
