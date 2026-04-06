"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import LoggedInHeader from "../../components/logged-in-header";
import { getExpertDashboardAnalytics } from "../../actions";

type DashboardSeriesPoint = {
  dayKey: string;
  dayLabel: string;
  profileViews: number;
  adViews: number;
  postViews: number;
  linkRedirects: number;
};

type RangePreset = "today" | "3days" | "1week" | "1month" | "3months" | "6months" | "1year" | "since_join";

type AggregatedPoint = {
  key: string;
  label: string;
  profileViews: number;
  postViews: number;
  adViews: number;
  linkRedirects: number;
};

type DashboardAnalyticsData = {
  role: "experte";
  planKey: string;
  planLabel: string;
  adAnalyticsEnabled: boolean;
  joinedAt: string;
  profile: {
    viewsTotal: number;
    views30d: number;
    uniqueVisitors30d: number;
    chatsTotal: number;
    uniqueChatPartners: number;
    outgoingMessagesTotal: number;
    incomingMessagesTotal: number;
    outgoingMessages30d: number;
    incomingMessages30d: number;
    wishlistTotal: number;
    linkRedirectsTotal: number;
    postsTotal: number;
  };
  posts: {
    total: number;
    profileTotal: number;
    groupTotal: number;
    viewsTotal: number;
    views30d: number;
    commentsTotal: number;
    repliesTotal: number;
    likesTotal: number;
    sharesTotal: number;
    linkRedirectsTotal: number;
  };
  ads: {
    bookingsTotal: number;
    viewsTotal: number;
    views30d: number;
    wishlistTotal: number;
    linkRedirectsTotal: number;
    ratingsTotal: number;
    ratingCommentsTotal: number;
    incomingMessagesTotal: number;
  };
  chart: DashboardSeriesPoint[];
};

const EMPTY_ANALYTICS: DashboardAnalyticsData = {
  role: "experte",
  planKey: "",
  planLabel: "",
  adAnalyticsEnabled: false,
  joinedAt: new Date().toISOString(),
  profile: {
    viewsTotal: 0,
    views30d: 0,
    uniqueVisitors30d: 0,
    chatsTotal: 0,
    uniqueChatPartners: 0,
    outgoingMessagesTotal: 0,
    incomingMessagesTotal: 0,
    outgoingMessages30d: 0,
    incomingMessages30d: 0,
    wishlistTotal: 0,
    linkRedirectsTotal: 0,
    postsTotal: 0,
  },
  posts: {
    total: 0,
    profileTotal: 0,
    groupTotal: 0,
    viewsTotal: 0,
    views30d: 0,
    commentsTotal: 0,
    repliesTotal: 0,
    likesTotal: 0,
    sharesTotal: 0,
    linkRedirectsTotal: 0,
  },
  ads: {
    bookingsTotal: 0,
    viewsTotal: 0,
    views30d: 0,
    wishlistTotal: 0,
    linkRedirectsTotal: 0,
    ratingsTotal: 0,
    ratingCommentsTotal: 0,
    incomingMessagesTotal: 0,
  },
  chart: [],
};

export default function ExpertDashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState("Experte");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [analytics, setAnalytics] = useState<DashboardAnalyticsData>(EMPTY_ANALYTICS);
  const [rangePreset, setRangePreset] = useState<RangePreset>("6months");

  useEffect(() => {
    const init = async () => {
      const userIdRaw = sessionStorage.getItem("userId");
      const roleRaw = sessionStorage.getItem("userRole");
      const name = sessionStorage.getItem("userName") || "Experte";

      const parsedUserId = userIdRaw ? parseInt(userIdRaw, 10) : NaN;
      setRole(roleRaw);
      setUserName(name);

      if (Number.isNaN(parsedUserId) || parsedUserId <= 0) {
        window.location.href = "/login";
        return;
      }

      if (String(roleRaw || "").trim().toLowerCase() !== "experte") {
        window.location.href = "/dashboard/nutzer";
        return;
      }

      setUserId(parsedUserId);

      const res = await getExpertDashboardAnalytics(parsedUserId);
      if (!res.success || !res.data) {
        setError(res.error || "Dashboard konnte nicht geladen werden.");
        setLoading(false);
        return;
      }

      setAnalytics({ ...EMPTY_ANALYTICS, ...res.data });
      setLoading(false);
    };

    init();
  }, []);

  const openProfile = () => {
    const userIdRaw = sessionStorage.getItem("userId");
    const parsedUserId = userIdRaw ? parseInt(userIdRaw, 10) : NaN;
    if (!Number.isNaN(parsedUserId) && parsedUserId > 0) {
      window.location.href = `/profil/${parsedUserId}`;
      return;
    }
    window.location.href = "/login";
  };

  const handleLogout = () => {
    sessionStorage.clear();
    window.location.href = "/";
  };

  const isExpertRole = String(role || "").trim().toLowerCase() === "experte";

  const groupedMetrics = useMemo(() => {
    const profile = analytics.profile;
    const posts = analytics.posts;
    const ads = analytics.ads;
    const adEnabled = analytics.adAnalyticsEnabled;
    return {
      profil: [
        { label: "Profilaufrufe", value: profile.viewsTotal, hint: `${profile.views30d} in 30 Tagen` },
        { label: "Eindeutige Besucher", value: profile.uniqueVisitors30d, hint: "letzte 30 Tage" },
        { label: "Merkliste", value: profile.wishlistTotal, hint: "gespeicherte Profile" },
        { label: "Link-Weiterleitungen", value: profile.linkRedirectsTotal, hint: "vom Profil" },
      ],
      beitraege: [
        { label: "Aktive Beiträge", value: posts.total, hint: `${posts.profileTotal} Profil, ${posts.groupTotal} Gruppe` },
        { label: "Beitragsaufrufe", value: posts.viewsTotal, hint: `${posts.views30d} in 30 Tagen` },
        { label: "Kommentare", value: posts.commentsTotal, hint: "Kommentare auf Beiträgen" },
        { label: "Antworten auf Posts", value: posts.repliesTotal, hint: "Antworten in Gruppen" },
        { label: "Likes", value: posts.likesTotal, hint: "Likes auf Beiträge" },
        { label: "Geteilt", value: posts.sharesTotal, hint: "Reposts / Shares" },
      ],
      anzeigen: [
        { label: "Bewertungen", value: ads.ratingsTotal, hint: adEnabled ? "für Anzeigen" : "Nur mit aktivem Experten Pro" },
        { label: "Antworten auf Anzeigen", value: ads.ratingCommentsTotal, hint: adEnabled ? "Bewertungen mit Kommentar" : "Nur mit aktivem Experten Pro" },
        { label: "Nachrichten", value: ads.incomingMessagesTotal, hint: adEnabled ? "eingehende Chats" : "Nur mit aktivem Experten Pro" },
      ],
      werbung: [
        { label: "Anzeigenaufrufe", value: ads.viewsTotal, hint: `${ads.views30d} in 30 Tagen` },
        { label: "Buchungen", value: ads.bookingsTotal, hint: "freigegebene Anzeigen" },
        { label: "Merkliste Anzeigen", value: ads.wishlistTotal, hint: "gespeicherte Anzeigen" },
        { label: "Link-Weiterleitungen", value: ads.linkRedirectsTotal, hint: "von Anzeigen" },
      ],
    };
  }, [analytics]);

  const peakReach = useMemo(() => {
    return Math.max(
      1,
      ...analytics.chart.flatMap((point) => [point.profileViews, point.adViews, point.postViews])
    );
  }, [analytics.chart]);

  const rangeOptions: Array<{ key: RangePreset; label: string }> = [
    { key: "today", label: "Heute" },
    { key: "3days", label: "3 Tage" },
    { key: "1week", label: "1 Woche" },
    { key: "1month", label: "1 Monat" },
    { key: "3months", label: "3 Monate" },
    { key: "6months", label: "6 Monate" },
    { key: "1year", label: "1 Jahr" },
    { key: "since_join", label: "Seit Beitritt" },
  ];

  const aggregatedTimeline = useMemo<AggregatedPoint[]>(() => {
    const points = analytics.chart
      .map((point) => {
        const date = new Date(`${point.dayKey}T00:00:00`);
        return {
          ...point,
          date,
          ts: date.getTime(),
        };
      })
      .filter((point) => !Number.isNaN(point.ts))
      .sort((a, b) => a.ts - b.ts);

    if (points.length === 0) return [];

    const end = points[points.length - 1].date;
    const joinedDateRaw = new Date(analytics.joinedAt);
    const joinedDate = Number.isNaN(joinedDateRaw.getTime()) ? points[0].date : joinedDateRaw;
    const start = new Date(end);

    if (rangePreset === "today") {
      start.setHours(0, 0, 0, 0);
    } else if (rangePreset === "3days") {
      start.setDate(start.getDate() - 2);
      start.setHours(0, 0, 0, 0);
    } else if (rangePreset === "1week") {
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
    } else if (rangePreset === "1month") {
      start.setMonth(start.getMonth() - 1);
      start.setDate(start.getDate() + 1);
      start.setHours(0, 0, 0, 0);
    } else if (rangePreset === "3months") {
      start.setMonth(start.getMonth() - 3);
      start.setDate(start.getDate() + 1);
      start.setHours(0, 0, 0, 0);
    } else if (rangePreset === "6months") {
      start.setMonth(start.getMonth() - 6);
      start.setDate(start.getDate() + 1);
      start.setHours(0, 0, 0, 0);
    } else if (rangePreset === "1year") {
      start.setFullYear(start.getFullYear() - 1);
      start.setDate(start.getDate() + 1);
      start.setHours(0, 0, 0, 0);
    } else {
      start.setTime(joinedDate.getTime());
      start.setHours(0, 0, 0, 0);
    }

    const filtered = points.filter((point) => point.date >= start);
    if (filtered.length === 0) return [];

    const pickBucket = () => {
      if (rangePreset === "today" || rangePreset === "3days" || rangePreset === "1week" || rangePreset === "1month") return "day";
      if (rangePreset === "3months") return "week";
      return "month";
    };

    const bucketMode = pickBucket();
    const map = new Map<string, AggregatedPoint>();

    for (const point of filtered) {
      let key = point.dayKey;
      let label = point.dayLabel;

      if (bucketMode === "week") {
        const d = new Date(point.date);
        const day = d.getDay();
        const mondayOffset = day === 0 ? -6 : 1 - day;
        d.setDate(d.getDate() + mondayOffset);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const da = String(d.getDate()).padStart(2, "0");
        key = `${y}-${m}-${da}`;
        label = `KW ${d.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}`;
      }

      if (bucketMode === "month") {
        const y = point.date.getFullYear();
        const m = String(point.date.getMonth() + 1).padStart(2, "0");
        key = `${y}-${m}`;
        label = point.date.toLocaleDateString("de-DE", { month: "short", year: "2-digit" });
      }

      const existing = map.get(key) || {
        key,
        label,
        profileViews: 0,
        postViews: 0,
        adViews: 0,
        linkRedirects: 0,
      };

      existing.profileViews += Number(point.profileViews || 0);
      existing.postViews += Number(point.postViews || 0);
      existing.adViews += Number(point.adViews || 0);
      existing.linkRedirects += Number(point.linkRedirects || 0);

      map.set(key, existing);
    }

    return Array.from(map.values());
  }, [analytics.chart, analytics.joinedAt, rangePreset]);

  const graphPeak = useMemo(() => {
    const maxValue = Math.max(
      1,
      ...aggregatedTimeline.flatMap((point) => [point.profileViews, point.postViews, point.linkRedirects, point.adViews])
    );
    return maxValue;
  }, [aggregatedTimeline]);

  const totalReach = analytics.profile.viewsTotal + analytics.posts.viewsTotal + analytics.ads.viewsTotal;
  const totalMessages = analytics.ads.incomingMessagesTotal;

  if (loading) {
    return <div className="min-h-screen bg-slate-50 p-8 text-slate-500">Lade Experten-Dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.14),_transparent_40%),linear-gradient(180deg,_#f8fafc_0%,_#f8fafc_55%,_#f1f5f9_100%)] text-slate-900">
      <div
        className={`fixed inset-0 bg-slate-900/35 backdrop-blur-sm z-[60] transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setSidebarOpen(false)}
      />
      <aside className={`fixed left-0 top-0 h-full w-80 bg-white z-[70] shadow-2xl transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} p-8 flex flex-col`}>
        <div className="flex justify-between items-center mb-10 text-emerald-600 font-black italic tracking-tighter">MENÜ <button onClick={() => setSidebarOpen(false)} className="text-slate-300">×</button></div>
        <nav className="space-y-6 flex-grow">
          <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/'; }} className="block text-left text-xl font-black italic uppercase text-slate-800 hover:text-emerald-600">Startseite</button>
          {isExpertRole && <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/dashboard/experte'; }} className="block text-left text-xl font-black italic uppercase text-emerald-600">Dashboard</button>}
          <button type="button" onClick={() => { setSidebarOpen(false); openProfile(); }} className="block text-left text-xl font-black italic uppercase text-slate-800 hover:text-emerald-600">Mein Profil</button>
          <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/dashboard/rechnungen'; }} className="block text-left text-xl font-black italic uppercase text-slate-800 hover:text-emerald-600">Rechnungen</button>

          <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/netzwerk'; }} className="block text-left text-xl font-black italic uppercase text-slate-800 hover:text-emerald-600">Netzwerk</button>
          <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/merkliste'; }} className="block text-left text-xl font-black italic uppercase text-slate-800 hover:text-emerald-600">Merkliste</button>
          <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/nachrichten'; }} className="block text-left text-xl font-black italic uppercase text-slate-800 hover:text-emerald-600">Nachrichten</button>
          <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/einstellungen'; }} className="block text-left text-xl font-black italic uppercase text-slate-800 hover:text-emerald-600">Einstellungen</button>
          <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = '/kontakt'; }} className="block text-left text-xl font-black italic uppercase text-slate-800 hover:text-emerald-600">Kontakt & FAQ</button>
        </nav>
        <button onClick={handleLogout} className="mt-auto p-4 bg-slate-100 rounded-2xl font-black text-[10px] uppercase text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all">Abmelden</button>
      </aside>

      <LoggedInHeader
        userId={userId}
        role={role === "experte" ? "experte" : "nutzer"}
        userName={userName}
        onOpenSidebar={() => setSidebarOpen(true)}
        onOpenProfile={openProfile}
        brandText="Experten-Dashboard"
      />

      <main className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 xl:grid-cols-[280px_1fr] gap-8">
        <aside className="bg-white/90 backdrop-blur border border-slate-200 rounded-[2rem] p-6 shadow-sm h-fit xl:sticky xl:top-8 space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Navigation</p>
          <div className="px-4 py-3 rounded-xl border border-emerald-200 bg-emerald-50 text-[10px] font-black uppercase tracking-widest text-emerald-700">Dashboard</div>

          <div className="mt-4 rounded-2xl bg-slate-900 text-white p-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Plan</p>
            <p className="mt-2 text-lg font-black uppercase italic tracking-tight">{analytics.planLabel || 'Experte'}</p>
            <p className="mt-2 text-xs text-slate-300">{analytics.planKey || 'kein Plan-Key'} · {analytics.role === 'experte' ? 'Expertenkonto' : 'Konto'}</p>
          </div>
        </aside>

        <section className="space-y-8">
          <section className="relative overflow-hidden rounded-[2.25rem] border border-emerald-200 bg-white shadow-[0_24px_80px_rgba(15,23,42,0.08)] p-8 md:p-10">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.14),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(251,191,36,0.12),_transparent_30%)]" />
            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl space-y-4">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-700">Experten-Dashboard</p>
                <h1 className="text-4xl md:text-6xl font-black italic uppercase tracking-tight text-slate-950">Zahlen, die deine Reichweite greifbar machen</h1>
                <p className="max-w-2xl text-sm md:text-base text-slate-600 leading-7">
                  {userName} sieht hier auf einen Blick, wie Profile, Beiträge und Anzeigen performen. Die Übersicht bündelt Reichweite, Interaktionen und Buchungen in einem Arbeitsbereich.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 min-w-[260px]">
                <div className="rounded-2xl bg-slate-950 text-white p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">Gesamt-Reichweite</p>
                  <p className="mt-2 text-3xl font-black italic">{totalReach.toLocaleString('de-DE')}</p>
                </div>
                <div className="rounded-2xl bg-white border border-slate-200 p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Nachrichten</p>
                  <p className="mt-2 text-3xl font-black italic text-slate-900">{totalMessages.toLocaleString('de-DE')}</p>
                  {!analytics.adAnalyticsEnabled && (
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Anzeigen-Nachrichten nur mit Experten Pro</p>
                  )}
                </div>
                <button type="button" onClick={() => router.push('/dashboard/experte/schueler')} className="col-span-2 rounded-2xl bg-emerald-600 px-4 py-3 text-[10px] font-black uppercase tracking-[0.24em] text-white hover:bg-emerald-700 transition-colors">
                  Zu Schülern und Kunden
                </button>
              </div>
            </div>
          </section>

          {error ? (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</section>
          ) : (
            <>
              <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                  { label: 'Profilaufrufe', value: analytics.profile.viewsTotal, hint: `${analytics.profile.views30d} in 30 Tagen` },
                  { label: 'Anzeigenaufrufe', value: analytics.ads.viewsTotal, hint: analytics.adAnalyticsEnabled ? `${analytics.ads.views30d} in 30 Tagen` : 'Nur mit aktivem Experten Pro' },
                  { label: 'Beitragsaufrufe', value: analytics.posts.viewsTotal, hint: `${analytics.posts.views30d} in 30 Tagen` },
                  { label: 'Link-Weiterleitungen', value: analytics.profile.linkRedirectsTotal + analytics.posts.linkRedirectsTotal + analytics.ads.linkRedirectsTotal, hint: 'Profil, Beiträge, Anzeigen' },
                ].map((item) => (
                  <MetricCard key={item.label} label={item.label} value={item.value} hint={item.hint} />
                ))}
              </section>

              {!analytics.adAnalyticsEnabled && (
                <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-6 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-700">Pro-Funktion</p>
                  <h2 className="mt-2 text-2xl font-black italic uppercase tracking-tight text-slate-900">Werbungs-Analytics ist nur im Experten-Pro-Abo verfügbar</h2>
                  <p className="mt-2 text-sm text-slate-700">
                    Für detaillierte Kennzahlen zu Anzeigen (Aufrufe, Buchungen, Bewertungen, Antworten und Nachrichten) brauchst du ein aktives <span className="font-black text-amber-700">Experten Pro</span>.
                  </p>
                  <button
                    type="button"
                    onClick={() => router.push('/abo?role=experte')}
                    className="mt-4 rounded-2xl bg-amber-500 px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-amber-600 transition-colors"
                  >
                    Auf Experten Pro upgraden
                  </button>
                </section>
              )}
              <section className="grid grid-cols-1 lg:grid-cols-[1fr] gap-6">
                <div className="space-y-4">
                  <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Interaktionen</p>
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <StatTile label="Kommentare" value={analytics.posts.commentsTotal} sublabel="auf Beiträgen" />
                      <StatTile label="Antworten auf Posts" value={analytics.posts.repliesTotal} sublabel="in Gruppen" />
                      <StatTile label="Bewertungen" value={analytics.ads.ratingsTotal} sublabel={analytics.adAnalyticsEnabled ? "für Anzeigen" : "nur mit Pro"} />
                      <StatTile label="Antworten auf Anzeigen" value={analytics.ads.ratingCommentsTotal} sublabel={analytics.adAnalyticsEnabled ? "mit Kommentar" : "nur mit Pro"} />
                    </div>
                  </section>

                  <section className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-300">Aktivität</p>
                    <div className="mt-4 space-y-4">
                      <ActivityRow label="Posts insgesamt" value={analytics.posts.total} detail={`${analytics.posts.profileTotal} Profil · ${analytics.posts.groupTotal} Gruppe`} />
                      <ActivityRow label="Freigegebene Anzeigen" value={analytics.ads.bookingsTotal} detail={analytics.adAnalyticsEnabled ? "entspricht aktiven Buchungen" : "nur mit Pro"} />
                      <ActivityRow label="Merkliste" value={analytics.profile.wishlistTotal + analytics.ads.wishlistTotal} detail={analytics.adAnalyticsEnabled ? "Profil und Anzeigen" : "Profil + Anzeigen nur mit Pro"} />
                      <ActivityRow label="Nachrichten" value={totalMessages} detail={analytics.adAnalyticsEnabled ? "eingehende Chats" : "Anzeigen-Nachrichten nur mit Pro"} />
                    </div>
                  </section>

                  <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6 shadow-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-700">Direkte Wege</p>
                    <div className="mt-4 grid grid-cols-1 gap-3">
                      <button type="button" onClick={() => router.push('/dashboard/experte/schueler')} className="rounded-2xl bg-white border border-emerald-200 px-4 py-3 text-left text-sm font-black uppercase tracking-widest text-emerald-700 hover:bg-emerald-50 transition-colors">
                        Schüler und Kunden öffnen
                      </button>
                      <button type="button" onClick={() => router.push('/inserieren')} className="rounded-2xl bg-white border border-emerald-200 px-4 py-3 text-left text-sm font-black uppercase tracking-widest text-emerald-700 hover:bg-emerald-50 transition-colors">
                        Eigene Werbung verwalten
                      </button>
                    </div>
                  </section>
                </div>
              </section>

              <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Alle Kennzahlen</p>
                <div className="mt-4 space-y-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-700">Profil</p>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                      {groupedMetrics.profil.map((item) => (
                        <MetricCard key={`profil-${item.label}`} label={item.label} value={item.value} hint={item.hint} />
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-700">Beiträge</p>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {groupedMetrics.beitraege.map((item) => (
                        <MetricCard key={`beitraege-${item.label}`} label={item.label} value={item.value} hint={item.hint} />
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-sky-700">Anzeigen</p>
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {groupedMetrics.anzeigen.map((item) => (
                        <MetricCard key={`anzeigen-${item.label}`} label={item.label} value={item.value} hint={item.hint} />
                      ))}
                    </div>
                  </div>

                  {analytics.adAnalyticsEnabled && (
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-fuchsia-700">Werbung</p>
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                        {groupedMetrics.werbung.map((item) => (
                          <MetricCard key={`werbung-${item.label}`} label={item.label} value={item.value} hint={item.hint} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Reichweiten-Analyse</p>
                    <h2 className="mt-2 text-2xl font-black italic uppercase tracking-tight text-slate-950">Reichweite der letzten 6 Monate</h2>
                    <p className="mt-1 text-xs text-slate-500">Zeitbereich frei wählbar: heute bis seit Beitritt</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {rangeOptions.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => setRangePreset(option.key)}
                      className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors ${rangePreset === option.key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <div className="mt-6">
                  <CombinedReachGraphCard
                    points={aggregatedTimeline}
                    peak={graphPeak}
                    showAds={analytics.adAnalyticsEnabled}
                  />
                </div>
              </section>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-black italic text-slate-950">{Number(value || 0).toLocaleString('de-DE')}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{hint}</p>
    </article>
  );
}

function StatTile({ label, value, sublabel }: { label: string; value: number; sublabel: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-black italic text-slate-950">{Number(value || 0).toLocaleString('de-DE')}</p>
      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">{sublabel}</p>
    </div>
  );
}

function ActivityRow({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="flex items-end justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-300">{label}</p>
        <p className="mt-1 text-xs text-slate-400">{detail}</p>
      </div>
      <p className="text-3xl font-black italic text-white">{Number(value || 0).toLocaleString('de-DE')}</p>
    </div>
  );
}

function RangeGraphCard({
  title,
  subtitle,
  color,
  tone,
  points,
  valueKey,
  peak,
}: {
  title: string;
  subtitle?: string;
  color: string;
  tone: string;
  points: AggregatedPoint[];
  valueKey: "profileViews" | "postViews" | "adViews" | "linkRedirects";
  peak: number;
}) {
  const total = points.reduce((sum, point) => sum + Number(point[valueKey] || 0), 0);

  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className={`text-[10px] font-black uppercase tracking-[0.24em] ${tone}`}>{title}</p>
          {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        <p className="text-2xl font-black italic text-slate-900">{total.toLocaleString("de-DE")}</p>
      </div>

      <div className="mt-4 flex items-end gap-1 h-28 overflow-x-auto pb-1">
        {points.map((point) => {
          const value = Number(point[valueKey] || 0);
          const height = Math.max(6, Math.round((value / Math.max(1, peak)) * 100));
          return (
            <div key={`${title}-${point.key}`} className="min-w-[14px] flex-1 flex flex-col items-center justify-end">
              <div className="w-full rounded-sm bg-white border border-slate-200 h-full flex items-end">
                <div className={`w-full ${color}`} style={{ height: `${height}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {points.length > 0 && (
        <div className="mt-2 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
          <span>{points[0].label}</span>
          <span>{points[points.length - 1].label}</span>
        </div>
      )}
    </article>
  );
}

function CombinedReachGraphCard({
  points,
  peak,
  showAds,
}: {
  points: AggregatedPoint[];
  peak: number;
  showAds: boolean;
}) {
  const width = 980;
  const height = 260;
  const paddingX = 30;
  const paddingY = 24;

  const series = [
    { key: 'profileViews' as const, label: 'Profil', color: '#10b981' },
    { key: 'postViews' as const, label: 'Beiträge', color: '#f59e0b' },
    { key: 'linkRedirects' as const, label: 'Anzeigen', color: '#6366f1' },
    ...(showAds ? [{ key: 'adViews' as const, label: 'Werbung', color: '#0ea5e9' }] : []),
  ];

  const makePath = (key: AggregatedPoint extends infer T ? never : never) => '';

  const makeSeriesPath = (seriesKey: 'profileViews' | 'postViews' | 'adViews' | 'linkRedirects') => {
    if (points.length === 0) return '';
    const usableWidth = width - paddingX * 2;
    const usableHeight = height - paddingY * 2;
    return points
      .map((point, index) => {
        const x = points.length === 1 ? width / 2 : paddingX + (index / (points.length - 1)) * usableWidth;
        const rawValue = Number(point[seriesKey] || 0);
        const y = height - paddingY - Math.max(0, Math.min(usableHeight, (rawValue / Math.max(1, peak)) * usableHeight));
        return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  };

  const gridLines = 4;
  const gridValues = Array.from({ length: gridLines + 1 }, (_, index) => Math.round((peak / gridLines) * (gridLines - index)));

  return (
    <article className="rounded-[2rem] border border-slate-200 bg-slate-50 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-500">Diagramm</p>
          <h3 className="mt-2 text-xl font-black italic uppercase tracking-tight text-slate-950">Reichweite in einem Diagramm</h3>
          <p className="mt-1 text-xs text-slate-500">Profil, Beiträge, Anzeigen und Werbung im gleichen Zeitverlauf.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500">
          {series.map((item) => (
            <span key={item.key} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              {item.label}
            </span>
          ))}
        </div>
      </div>

      {points.length > 0 ? (
        <div className="mt-5 overflow-x-auto">
          <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[760px] w-full h-[320px]">
            {gridValues.map((value, index) => {
              const y = paddingY + (index / gridLines) * (height - paddingY * 2);
              return (
                <g key={`grid-${index}`}>
                  <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#e2e8f0" strokeDasharray={index === gridLines ? '0' : '4 6'} />
                  <text x={4} y={y + 4} className="fill-slate-400" fontSize="10" fontWeight="700">{value.toLocaleString('de-DE')}</text>
                </g>
              );
            })}

            {series.map((item) => {
              const d = makeSeriesPath(item.key);
              return d ? (
                <g key={item.key}>
                  <path d={d} fill="none" stroke={item.color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                  {points.map((point, index) => {
                    const x = points.length === 1 ? width / 2 : paddingX + (index / (points.length - 1)) * (width - paddingX * 2);
                    const value = Number(point[item.key] || 0);
                    const y = height - paddingY - Math.max(0, Math.min(height - paddingY * 2, (value / Math.max(1, peak)) * (height - paddingY * 2)));
                    return <circle key={`${item.key}-${point.key}`} cx={x} cy={y} r="3.5" fill={item.color} stroke="#ffffff" strokeWidth="2" />;
                  })}
                </g>
              ) : null;
            })}
          </svg>
        </div>
      ) : (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
          Noch keine Daten für den ausgewählten Zeitraum.
        </div>
      )}

      {points.length > 0 && (
        <div className="mt-3 flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-slate-400">
          <span>{points[0].label}</span>
          <span>{points[points.length - 1].label}</span>
        </div>
      )}
    </article>
  );
}