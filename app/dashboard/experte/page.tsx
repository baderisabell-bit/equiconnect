"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  const [userName, setUserName] = useState("Experte");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [analytics, setAnalytics] = useState<any>(EMPTY_ANALYTICS);
  const [loading, setLoading] = useState(true);
  
  // FILTER-STATE für den Graphen
  // [] bedeutet: alles anzeigen. Sonst: "Anzeigen", "Beitraege", "Werbung"
  const [chartFilters, setChartFilters] = useState<string[]>([]);

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

  useEffect(() => {
    const init = async () => {
      const role = sessionStorage.getItem("role") || sessionStorage.getItem("userRole");
      const userIdRaw = sessionStorage.getItem("userId");
      const parsedUserId = userIdRaw ? parseInt(userIdRaw, 10) : NaN;

      if (role !== "experte" || Number.isNaN(parsedUserId) || parsedUserId <= 0) {
        router.push("/");
        return;
      }

      setUserId(parsedUserId);
      setUserName(sessionStorage.getItem("userName") || "Experte");

      const res = await getExpertDashboardAnalytics(parsedUserId);
      if (res?.success && res?.data) {
        setAnalytics(res.data);
      }
      setLoading(false);
    };

    void init();
  }, []);

  // Filter-Logik
  const toggleFilter = (filter: string) => {
    setChartFilters(prev => 
      prev.includes(filter) ? prev.filter(f => f !== filter) : [...prev, filter]
    );
  };

  const isFilterActive = (filter: string) => chartFilters.length === 0 || chartFilters.includes(filter);

  if (loading) return <div className="p-8">Lade Dashboard...</div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      {sidebarOpen && (
        <>
          <button type="button" aria-label="Menü schließen" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm" />
          <aside className="fixed left-0 top-0 z-[70] h-full w-72 bg-white shadow-2xl transition-transform duration-300 p-6 flex flex-col">
            <div className="flex justify-between items-center mb-8 text-emerald-600 font-black italic tracking-tighter">
              MENÜ
              <button onClick={() => setSidebarOpen(false)} className="text-slate-300 text-xl leading-none">×</button>
            </div>
            <nav className="space-y-5 flex-grow">
              <Link href="/" className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Startseite</Link>
              <Link href="/dashboard/experte" className="block text-left text-lg font-black italic uppercase text-emerald-600">Dashboard</Link>
              <button type="button" onClick={openProfile} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Mein Profil</button>
              <Link href="/dashboard/experte/schueler" className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Schüler &amp; Kunden</Link>
              <Link href="/suche" className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Suche</Link>
              <Link href="/netzwerk" className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Netzwerk</Link>
              <Link href="/nachrichten" className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Nachrichten</Link>
              <Link href="/merkliste" className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Merkliste</Link>
              <Link href="/einstellungen" className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Einstellungen</Link>
              <Link href="/kontakt" className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Kontakt &amp; FAQ</Link>
            </nav>
            <button onClick={handleLogout} className="mt-auto p-4 bg-slate-100 rounded-2xl font-black text-[10px] uppercase text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all">Abmelden</button>
          </aside>
        </>
      )}

      <LoggedInHeader
        userId={userId}
        role="experte"
        userName={userName}
        onOpenSidebar={() => setSidebarOpen(true)}
        onOpenProfile={openProfile}
      />

      <main className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 auto-rows-[minmax(180px,auto)]">
          
          {/* REICHWEITE (Groß) */}
          <div className="md:col-span-2 md:row-span-2 bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex flex-col justify-between">
             {/* Content ... */}
          </div>

          {/* PLAN VERWALTEN (Schwarz) */}
          <div className="md:col-span-2 md:row-span-2 bg-slate-950 rounded-[2.5rem] p-8 text-white flex flex-col justify-between">
            <div>
              <span className="px-3 py-1 bg-emerald-500 text-[10px] font-black uppercase rounded-full">Mein Status</span>
              <h3 className="text-2xl font-black italic uppercase mt-4">{analytics?.planLabel || "Experte"}</h3>
            </div>
            {/* LINK ZUR ABO SEITE */}
            <button 
              onClick={() => router.push('/abo')}
              className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Plan verwalten
            </button>
          </div>

          {/* AKTIVITÄTSVERLAUF (Groß, 4 Spalten breit) */}
          <div className="md:col-span-4 md:row-span-2 bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
              <div>
                <h3 className="font-black italic uppercase tracking-tight">Aktivitätsverlauf</h3>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-1">Anzahl der Aufrufe</p>
              </div>
              
              {/* FILTER BUTTONS */}
              <div className="flex gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                {[
                  { id: 'Anzeigen', color: 'bg-emerald-500' },
                  { id: 'Beitraege', color: 'bg-sky-500' },
                  { id: 'Werbung', color: 'bg-amber-500' }
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => toggleFilter(f.id)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${
                      chartFilters.includes(f.id) || chartFilters.length === 0 
                      ? 'bg-white shadow-sm text-slate-900' 
                      : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${f.color}`}></span>
                    {f.id === 'Beitraege' ? 'Beiträge' : f.id}
                  </button>
                ))}
              </div>
            </div>

            {/* GRAPH MIT 3 BALKEN PRO TAG */}
            <div className="h-48 w-full flex items-end justify-between px-2 gap-4">
              {/* Beispiel-Loop für die Datenpunkte */}
              {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                <div key={day} className="flex-1 flex items-end justify-center gap-1 h-full">
                  {/* ANZEIGEN BALKEN */}
                  {isFilterActive('Anzeigen') && (
                    <div className="w-full bg-emerald-500 rounded-t-lg transition-all hover:opacity-80" style={{ height: `${Math.random() * 80 + 10}%` }}></div>
                  )}
                  {/* BEITRÄGE BALKEN */}
                  {isFilterActive('Beitraege') && (
                    <div className="w-full bg-sky-500 rounded-t-lg transition-all hover:opacity-80" style={{ height: `${Math.random() * 60 + 5}%` }}></div>
                  )}
                  {/* WERBUNG BALKEN */}
                  {isFilterActive('Werbung') && (
                    <div className="w-full bg-amber-500 rounded-t-lg transition-all hover:opacity-80" style={{ height: `${Math.random() * 40 + 5}%` }}></div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-4 text-[9px] font-black uppercase text-slate-300 tracking-tighter">
              <span>Vor 7 Tagen</span>
              <span>Heute</span>
            </div>
          </div>

          {/* QUICK ACTIONS (Erweitert) */}
          <div className="md:col-span-2 md:row-span-2 bg-emerald-50 rounded-[2.5rem] p-8 border border-emerald-100">
            <p className="text-[10px] font-black uppercase text-emerald-700 tracking-widest mb-6">Quick Actions</p>
            <div className="space-y-3">
               {/* 1. Werbung auf der Startseite */}
               <button 
                onClick={() => router.push('/werbung-buchen')} 
                className="w-full p-5 bg-white rounded-2xl text-left text-xs font-black uppercase tracking-tight flex justify-between items-center hover:shadow-md transition-all group"
               >
                 Werbung auf der Startseite <span className="text-emerald-500 group-hover:translate-x-1 transition-transform">→</span>
               </button>
               
               {/* 2. Anzeige schalten */}
               <button 
                onClick={() => router.push('/inserieren')} 
                className="w-full p-5 bg-white rounded-2xl text-left text-xs font-black uppercase tracking-tight flex justify-between items-center hover:shadow-md transition-all group"
               >
                 Anzeige schalten <span className="text-emerald-500 group-hover:translate-x-1 transition-transform">→</span>
               </button>

               {/* 3. Beitrag erstellen */}
               <button 
                onClick={() => router.push('/beitrag-erstellen')} 
                className="w-full p-5 bg-white rounded-2xl text-left text-xs font-black uppercase tracking-tight flex justify-between items-center hover:shadow-md transition-all group"
               >
                 Beitrag erstellen <span className="text-emerald-500 group-hover:translate-x-1 transition-transform">→</span>
               </button>

               {/* 4. Schüler/Kunden */}
               <button 
                onClick={() => router.push('/dashboard/experte/schueler')} 
                className="w-full p-5 bg-emerald-600 text-white rounded-2xl text-left text-xs font-black uppercase tracking-tight flex justify-between items-center hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
               >
                 Meine Schüler & Kunden <span>→</span>
               </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}