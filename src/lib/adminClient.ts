// Client-side admin-mode state. The PIN is held in sessionStorage only so it
// clears when the tab closes; real authority lives on the server, which
// re-checks the PIN on every write. Components subscribe via the custom event.

const KEY = "tcl_admin_pin";
const EVENT = "tcl-admin-change";

export function getAdminPin(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function isAdmin(): boolean {
  return !!getAdminPin();
}

export function setAdminPin(pin: string) {
  try {
    sessionStorage.setItem(KEY, pin);
  } catch {}
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function clearAdmin() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function onAdminChange(cb: () => void): () => void {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
