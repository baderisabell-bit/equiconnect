"use client";

import { useEffect, useState } from "react";
import { getUserSubscriptionSettings, submitKontaktForm } from "../actions";

type ContactSource = {
  sourceKey: string;
  sourceLabel: string;
  userId: number | null;
  role: string | null;
  planKey: string | null;
};

export default function PublicContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [website, setWebsite] = useState("");
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [source, setSource] = useState<ContactSource>({ sourceKey: "guest", sourceLabel: "Nicht eingeloggt", userId: null, role: null, planKey: null });

  useEffect(() => {
    const rawUserId = sessionStorage.getItem("userId");
    const parsedUserId = rawUserId ? parseInt(rawUserId, 10) : NaN;
    const roleHint = String(sessionStorage.getItem("userRole") || "").trim().toLowerCase();

    if (Number.isNaN(parsedUserId) || parsedUserId <= 0) {
      setSource({ sourceKey: "guest", sourceLabel: "Nicht eingeloggt", userId: null, role: null, planKey: null });
      return;
    }

    let cancelled = false;

    const loadSource = async () => {
      const res = await getUserSubscriptionSettings(parsedUserId);
      if (cancelled) return;

      if (!res.success || !res.data) {
        const fallbackRole = roleHint === "experte" ? "experte" : roleHint === "nutzer" ? "nutzer" : null;
        setSource({
          sourceKey: fallbackRole || "guest",
          sourceLabel: fallbackRole === "experte" ? "Experte" : fallbackRole === "nutzer" ? "Nutzer" : "Nicht eingeloggt",
          userId: parsedUserId,
          role: fallbackRole,
          planKey: null,
        });
        return;
      }

      const normalizedRole = String(res.data.role || roleHint || "nutzer").trim().toLowerCase();
      const planKey = String(res.data.plan_key || "").trim().toLowerCase();
      const status = String(res.data.status || "").trim().toLowerCase();

      if (normalizedRole === "nutzer") {
        const isAbo = status === "active" && planKey === "nutzer_plus";
        setSource({
          sourceKey: isAbo ? "nutzer_abo" : "nutzer",
          sourceLabel: isAbo ? "Nutzer Abo" : "Nutzer",
          userId: parsedUserId,
          role: "nutzer",
          planKey,
        });
        return;
      }

      if (normalizedRole === "experte") {
        const isPremium = status === "active" && planKey === "experte_pro";
        const isAbo = status === "active" && planKey === "experte_abo";
        setSource({
          sourceKey: isPremium ? "experte_premium_abo" : isAbo ? "experte_abo" : "experte",
          sourceLabel: isPremium ? "Experte Premium Abo" : isAbo ? "Experte Abo" : "Experte",
          userId: parsedUserId,
          role: "experte",
          planKey,
        });
        return;
      }

      setSource({ sourceKey: "guest", sourceLabel: "Nicht eingeloggt", userId: parsedUserId, role: normalizedRole, planKey });
    };

    loadSource();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSending(true);
    setError("");
    setSuccess("");

    const res = await submitKontaktForm({
      name,
      email,
      subject,
      message,
      website,
      sourceUserId: source.userId,
      sourceRole: source.role,
    });

    setSending(false);

    if (!res.success) {
      setError(res.error || "Nachricht konnte nicht gesendet werden.");
      return;
    }

    setSuccess(res.ticketCode ? `Danke, dein Ticket ist ${res.ticketCode}.` : "Danke, deine Nachricht wurde versendet.");
    setName("");
    setEmail("");
    setSubject("");
    setMessage("");
    setWebsite("");
  };

  return (
    <section className="w-full rounded-[2rem] border border-emerald-100 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.08)] overflow-hidden">
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-slate-900 p-6 sm:p-8 text-white">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-100/80">Kontakt</p>
        <h2 className="mt-3 text-2xl sm:text-3xl font-black italic uppercase tracking-tight">Schreib uns direkt</h2>
        <p className="mt-4 text-sm text-emerald-50/90 leading-relaxed max-w-md">
          Du brauchst kein Konto und musst nicht eingeloggt sein. Schick uns einfach eine Nachricht, wir melden uns zurück.
        </p>
        <div className="mt-5 inline-flex items-center rounded-full bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white/90">
          Quelle: {source.sourceLabel}
        </div>
      </div>

      <div className="p-6 sm:p-8 bg-white">
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Dein Name"
                required
                className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold outline-none focus:border-emerald-300"
              />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Deine E-Mail"
                required
                className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold outline-none focus:border-emerald-300"
              />
            </div>

            <input
              type="text"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Betreff"
              required
              className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-bold outline-none focus:border-emerald-300"
            />

            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Deine Nachricht"
              required
              rows={7}
              className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 font-medium outline-none focus:border-emerald-300 resize-none"
            />

            <div className="absolute -left-[9999px] top-auto w-px h-px overflow-hidden" aria-hidden="true">
              <label htmlFor="public-contact-website">Website</label>
              <input
                id="public-contact-website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <button
                type="submit"
                disabled={sending}
                className="px-6 py-4 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-emerald-500 disabled:opacity-60"
              >
                {sending ? "Wird gesendet..." : "Nachricht senden"}
              </button>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Antwort in der Regel innerhalb von 24 Stunden
              </p>
            </div>

            {error && (
              <p className="text-[11px] font-bold uppercase tracking-widest text-red-600">{error}</p>
            )}

          {success && (
            <p className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">{success}</p>
          )}
        </form>
      </div>
    </section>
  );
}