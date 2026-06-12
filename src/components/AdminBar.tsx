import { useEffect, useState } from "react";
import { getAdminPin, setAdminPin, clearAdmin, onAdminChange } from "../lib/adminClient";

export default function AdminBar() {
  const [admin, setAdmin] = useState(false);
  const [open, setOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setAdmin(!!getAdminPin());
    sync();
    return onAdminChange(sync);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!pin.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data as { message?: string }).message || "Could not verify.");
        return;
      }
      setAdminPin(pin);
      setOpen(false);
      setPin("");
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => (admin ? clearAdmin() : setOpen(true))}
        className="fixed bottom-5 left-5 z-40 flex items-center gap-2 border border-line bg-cream/90 px-3 py-2 font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted shadow-soft-sm backdrop-blur-sm transition-colors hover:text-ink md:bottom-8 md:left-8"
        aria-label={admin ? "Exit admin mode" : "Enter admin mode"}
      >
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full ${admin ? "bg-accent" : "bg-muted"}`}
        ></span>
        {admin ? "Admin · exit" : "Admin"}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setOpen(false);
              setError(null);
            }
          }}
        >
          <form
            onSubmit={submit}
            className="w-full max-w-[320px] border border-line bg-cream p-5 shadow-soft"
          >
            <div className="font-mono text-[10.5px] font-medium uppercase tracking-[0.16em] text-muted">
              Admin access
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              Enter your PIN to manage screenshots.
            </p>
            <input
              type="password"
              inputMode="numeric"
              autoFocus
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN"
              className="mt-4 w-full border border-line bg-cream px-3 py-2 text-[14px] outline-none transition-colors focus:border-ink"
            />
            {error && (
              <div className="mt-2 text-[12px] text-accent">{error}</div>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setError(null);
                }}
                className="px-3 py-2 text-[12px] font-medium text-muted transition-colors hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || !pin.trim()}
                className="bg-ink px-4 py-2 text-[12px] font-semibold tracking-[0.04em] text-cream transition-colors hover:bg-accent disabled:opacity-40"
              >
                {busy ? "…" : "Unlock"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
