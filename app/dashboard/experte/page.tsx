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
  const [analytics, setAnalytics] = useState<any>(null); // Vereinfacht für das Beispiel

  // Initialisierung (Logik aus deinem Original übernommen)
  useEffect(() => {
    const init = async () => {
      const userIdRaw = sessionStorage.getItem("userId");
      const roleRaw = sessionStorage.getItem("userRole");
      const name = sessionStorage.getItem("userName") || "Experte";
      setRole(roleRaw);
      setUserName(name);
      const parsedUserId = userIdRaw ? parseInt(userIdRaw, 10) : 0;
      if (parsedUserId > 0) {
        setUserId(parsedUserId);
        const res = await getExpertDashboardAnalytics(parsedUserId);
        if (res.success) setAnalytics(res.data);
      }
      setLoading(false);
    };
    init();
  }, []);

  if (loading) return <div className="p-8">Lade Dashboard...</div>;

  const totalReach = (analytics?.profile?.viewsTotal || 0) + (analytics?.posts?.viewsTotal || 0) + (analytics?.ads?.viewsTotal || 0);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      {/* Sidebar & Header bleiben identisch wie von dir gewünscht */}
      <LoggedInHeader 
        userId={userId} 
        role={role === "experte" ? "experte" : "nutzer"} 
        userName={userName} 
        onOpenSidebar={() => setSidebarOpen(true)} 
        brandText="Experten-Dashboard"
      />

      <main className="max-w-[1600px] mx-auto px-6 py-8">
        {/* BENTO GRID LAYOUT */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4 auto-rows-[minmax(180px,auto)]">
          
          {/* 1. Große Fokus-Karte: Gesamt-Reichweite (2x2) */}
          <div className="md:col-span-2 md:row-span-2 bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden group">
            <div className="relative z-10">
              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">Performance</p>
              <h2 className="text-4xl font-black mt-2 italic uppercase">Reichweite</h2>
              <p className="text-5xl font-black text-slate-950 mt-6">{totalReach.toLocaleString('de-DE')}</p>
              <p className="text-sm text-slate-400 mt-2">Gesamte Sichtbarkeit über alle Kanäle</p>
            </div>
            {/* Dekoratives Element im Hintergrund (ähnlich wie im Bild) */}
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-emerald-50 rounded-tl-full -mr-8 -mb-8 transition-all group-hover:scale-110" />
          </div>

          {/* 2. Profil-Analytics (2x1) */}
          <div className="md:col-span-2 bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-widest">Profilaufrufe</p>
              <p className="text-3xl font-black italic mt-1">{analytics?.profile?.viewsTotal || 0}</p>
            </div>
            <div className="h-12 w-24 bg-emerald-50 rounded-lg flex items-end p-1 gap-1">
              {/* Mini-Graph Placeholder */}
              <div className="bg-emerald-400 w-full h-[40%] rounded-sm"></div>
              <div className="bg-emerald-500 w-full h-[70%] rounded-sm"></div>
              <div className="bg-emerald-300 w-full h-[50%] rounded-sm"></div>
            </div>
          </div>

          {/* 3. Status-Karte: Abo & Plan (2x2) */}
          <div className="md:col-span-2 md:row-span-2 bg-slate-950 rounded-[2rem] p-8 text-white flex flex-col justify-between">
            <div>
              <span className="px-3 py-1 bg-emerald-500 text-[10px] font-black uppercase rounded-full">Active Plan</span>
              <h3 className="text-2xl font-black italic uppercase mt-4">{analytics?.planLabel || "Experte"}</h3>
              <p className="text-slate-400 text-sm mt-1">Status: Verifiziert</p>
            </div>
            <button className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
              Plan verwalten
            </button>
          </div>

          {/* 4. Mini-Stats (1x1) */}
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
            <p className="text-[10px] font-bold uppercase text-slate-400">Nachrichten</p>
            <p className="text-3xl font-black italic mt-2 text-emerald-600">{analytics?.ads?.incomingMessagesTotal || 0}</p>
          </div>

          {/* 5. Mini-Stats (1x1) */}
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100">
            <p className="text-[10px] font-bold uppercase text-slate-400">Interaktionen</p>
            <p className="text-3xl font-black italic mt-2 text-slate-900">{analytics?.posts?.commentsTotal || 0}</p>
          </div>

          {/* 6. Große Timeline/Analytics (4x2) */}
          <div className="md:col-span-4 md:row-span-2 bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-black italic uppercase tracking-tight">Aktivitätsverlauf</h3>
              <div className="flex gap-2">
                 <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                 <div className="w-3 h-3 bg-slate-200 rounded-full"></div>
              </div>
            </div>
            {/* Hier würde dein CombinedReachGraphCard hinkommen */}
            <div className="h-48 w-full bg-slate-50 rounded-2xl flex items-end justify-between p-4 gap-2">
              {[40, 70, 45, 90, 65, 80, 30, 50, 85, 45].map((h, i) => (
                <div key={i} style={{ height: `${h}%` }} className="w-full bg-emerald-500/20 hover:bg-emerald-500 rounded-t-md transition-all cursor-pointer"></div>
              ))}
            </div>
          </div>

          {/* 7. Quick Actions (2x2) */}
          <div className="md:col-span-2 md:row-span-2 bg-emerald-50 rounded-[2rem] p-8 border border-emerald-100">
            <p className="text-[10px] font-black uppercase text-emerald-700 tracking-widest mb-6">Quick Actions</p>
            <div className="space-y-3">
               <button onClick={() => router.push('/inserieren')} className="w-full p-4 bg-white rounded-2xl text-left text-sm font-bold flex justify-between items-center hover:shadow-md transition-all">
                 Anzeige schalten <span className="text-emerald-500">→</span>
               </button>
               <button onClick={() => router.push('/dashboard/experte/schueler')} className="w-full p-4 bg-white rounded-2xl text-left text-sm font-bold flex justify-between items-center hover:shadow-md transition-all">
                 Meine Schüler <span className="text-emerald-500">→</span>
               </button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}