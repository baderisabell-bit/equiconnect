export type StorageConsentChoice = 'accepted' | 'necessary';

export const STORAGE_CONSENT_KEY = 'equiconnect-storage-consent';
const OPTIONAL_STORAGE_KEYS = ['messageTarget'];
const OPTIONAL_STORAGE_PREFIXES = ['chatMeta-'];

export function getStorageConsentChoice(): StorageConsentChoice | null {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(STORAGE_CONSENT_KEY);
  return value === 'accepted' || value === 'necessary' ? value : null;
}

export function hasStorageConsentChoice() {
  return getStorageConsentChoice() !== null;
}

export function setStorageConsentChoice(choice: StorageConsentChoice) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_CONSENT_KEY, choice);
}

export function canUseOptionalStorage() {
  return getStorageConsentChoice() === 'accepted';
}

export function clearOptionalStorageData() {
  if (typeof window === 'undefined') return;

  for (const key of OPTIONAL_STORAGE_KEYS) {
    window.localStorage.removeItem(key);
  }

  const keysToRemove: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key) continue;
    if (OPTIONAL_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      keysToRemove.push(key);
    }
  }

  for (const key of keysToRemove) {
    window.localStorage.removeItem(key);
  }
}