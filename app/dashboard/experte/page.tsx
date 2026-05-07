"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LoggedInHeader from "../../components/logged-in-header";
import { getExpertDashboardAnalytics } from "../../actions";

export default function ExpertDashboardPage() {
  const router = useRouter();
  
  // State für Nutzerdaten
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState("Experte");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // State für Analytics & UI
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [chartFilters, setChartFilters] = useState<string[]>([]); // Leer = Alles anzeigen

  // Initialisierung & Fetching
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
        try {
          const res = await getExpertDashboardAnalytics(parsedUserId);
          if (res.success) {
            setAnalytics(res.data);
          }
        } catch (error) {
          console.error("Fehler beim Laden der Analytics:", error);
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  // Hilfsfunktion für Filter
  const isFilterActive = (filter: string) => 
    chartFilters.length === 0 || chartFilters.includes(filter);

  const toggleFilter = (filter: string) => {
    setChartFilters(prev => 
      prev.includes(filter) ? prev.filter(f => f !== filter) : [filter]
    );
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
      <p className="font-black italic uppercase text-slate-400 animate-pulse">Lade Experten-Daten...</p>
    </div>
  );

  const totalReach = (analytics?.profile?.viewsTotal || 0) + 
                     (analytics?.posts?.viewsTotal || 0) + 
                     (analytics?.ads?.viewsTotal || 0);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans">
      <LoggedInHeader 
        userId={userId} 
        role={role === "experte" ? "experte" : "nutzer"} 
        userName={userName} 
        onOpenSidebar={() => setSidebarOpen(true)} 
        brandText="Experten-Dashboard"
      />

      <main className="max-w-[1600px] mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-6 auto-rows-auto">
          
          {/* 1. PROFIL-ZAHLEN (Allgemein) */}
          <div className="md:col-span-2 bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Profil-Sichtbarkeit</p>
              <p className="text-5xl font-black italic mt-2 text-emerald-600">{analytics?.profile?.viewsTotal || 0}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Direkte Aufrufe Ihres Profils</p>
            </div>
            <div className="w-16 h-16 bg-emerald-50 rounded-3xl flex items-center justify-center text-3xl">👤</div>
          </div>

          {/* 2. GESAMT-REICHWEITE */}
          <div className="md:col-span-2 bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Gesamt-Reichweite</p>
              <p className="text-5xl font-black italic mt-2 text-slate-900">{totalReach.toLocaleString('de-DE')}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-2">Kombinierte Views aller Inhalte</p>
            </div>
            <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center text-3xl">📈</div>
          </div>

          {/* 3. PLAN VERWALTEN (Schwarz) */}
          <div className="md:col-span-2 bg-slate-950 rounded-[2.5rem] p-8 text-white flex flex-col justify-between overflow-hidden relative">
            <div className="relative z-10">
              <span className="px-3 py-1 bg-emerald-500 text-[9px] font-black uppercase rounded-full">Status</span>
              <h3 className="text-2xl font-black italic uppercase mt-4">{analytics?.planLabel || "Experte"}</h3>
            </div>
            <button 
              onClick={() => router.push('/abo')}
              className="relative z-10 mt-8 w-full py-4 bg-white/10 hover:bg-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border border-white/10"
            >
              Plan verwalten
            </button>
          </div>

          {/* 4. AKTIVITÄTSVERLAUF (Strikte Kategorietrennung) */}
          <div className="md:col-span-4 md:row-span-2 bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
              <div>
                <h3 className="font-black italic uppercase text-xl">Aktivitätsverlauf</h3>
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-1">Aufrufe pro einzelnem Inhalt</p>
              </div>
              
              <div className="flex gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                {[
                  { id: 'Anzeigen', label: 'Anzeigen', color: 'bg-emerald-500' },
                  { id: 'Beitraege', label: 'Beiträge', color: 'bg-sky-500' },
                  { id: 'Werbung', label: 'Werbung', color: 'bg-amber-500' }
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => toggleFilter(f.id)}
                    className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${
                      chartFilters.includes(f.id) || chartFilters.length === 0 
                      ? 'bg-white shadow-sm text-slate-900' 
                      : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <span className={`inline-block w-2 h-2 rounded-full mr-2 ${f.color}`}></span>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-8 min-h-[300px] items-end px-4">
              {/* BLOCK LINKS: ANZEIGEN */}
              <div className="flex flex-col gap-3 items-center h-full justify-end border-r border-slate-50 pr-4">
                {isFilterActive('Anzeigen') && analytics?.ads?.list?.map((ad: any) => (
                  <div key={ad.id} className="w-full group">
                    <div className="bg-emerald-500 text-white text-[10px] font-black flex items-center justify-center rounded-t-xl transition-all hover:brightness-110" 
                         style={{ height: `${Math.max(ad.views * 2, 40)}px` }}>
                      {ad.views}
                    </div>
                    <div className="bg-slate-50 p-2 rounded-b-xl">
                      <p className="text-[8px] font-black uppercase truncate text-center text-slate-600">{ad.title}</p>
                    </div>
                  </div>
                ))}
                <span className="text-[10px] font-black uppercase text-slate-300 mt-4 tracking-widest">Anzeigen</span>
              </div>

              {/* BLOCK MITTE: BEITRÄGE */}
              <div className="flex flex-col gap-3 items-center h-full justify-end border-r border-slate-50 px-4">
                {isFilterActive('Beitraege') && analytics?.posts?.list?.map((post: any) => (
                  <div key={post.id} className="w-full group">
                    <div className="bg-sky-500 text-white text-[10px] font-black flex items-center justify-center rounded-t-xl transition-all hover:brightness-110" 
                         style={{ height: `${Math.max(post.views * 2, 40)}px` }}>
                      {post.views}
                    </div>
                    <div className="bg-slate-50 p-2 rounded-b-xl">
                      <p className="text-[8px] font-black uppercase truncate text-center text-slate-600">{post.title}</p>
                    </div>
                  </div>
                ))}
                <span className="text-[10px] font-black uppercase text-slate-300 mt-4 tracking-widest">Beiträge</span>
              </div>

              {/* BLOCK RECHTS: WERBUNG */}
              <div className="flex flex-col gap-3 items-center h-full justify-end pl-4">
                {isFilterActive('Werbung') && analytics?.werbung?.list?.map((w: any) => (
                  <div key={w.id} className="w-full group">
                    <div className="bg-amber-500 text-white text-[10px] font-black flex items-center justify-center rounded-t-xl transition-all hover:brightness-110" 
                         style={{ height: `${Math.max(w.views * 2, 40)}px` }}>
                      {w.views}
                    </div>
                    <div className="bg-slate-50 p-2 rounded-b-xl">
                      <p className="text-[8px] font-black uppercase truncate text-center text-slate-600">{w.title}</p>
                    </div>
                  </div>
                ))}
                <span className="text-[10px] font-black uppercase text-slate-300 mt-4 tracking-widest">Werbung</span>
              </div>
            </div>
          </div>

          {/* 5. QUICK ACTIONS */}
          <div className="md:col-span-2 md:row-span-2 bg-emerald-50 rounded-[2.5rem] p-8 border border-emerald-100 flex flex-col">
            <p className="text-[10px] font-black uppercase text-emerald-700 tracking-widest mb-6">Quick Actions</p>
            <div className="space-y-3 flex-grow">
               <button 
                onClick={() => router.push('/werbung-buchen')} 
                className="w-full p-5 bg-white rounded-2xl text-left text-[11px] font-black uppercase tracking-tight flex justify-between items-center hover:shadow-md transition-all group"
               >
                 Werbung auf der Startseite <span className="text-emerald-500 group-hover:translate-x-1 transition-transform">→</span>
               </button>
               
               <button 
                onClick={() => router.push('/inserieren')} 
                className="w-full p-5 bg-white rounded-2xl text-left text-[11px] font-black uppercase tracking-tight flex justify-between items-center hover:shadow-md transition-all group"
               >
                 Anzeige schalten <span className="text-emerald-500 group-hover:translate-x-1 transition-transform">→</span>
               </button>

               <button 
                onClick={() => router.push('/beitrag-erstellen')} 
                className="w-full p-5 bg-white rounded-2xl text-left text-[11px] font-black uppercase tracking-tight flex justify-between items-center hover:shadow-md transition-all group"
               >
                 Beitrag erstellen <span className="text-emerald-500 group-hover:translate-x-1 transition-transform">→</span>
               </button>
            </div>

            <button 
              onClick={() => router.push('/dashboard/experte/schueler')} 
              className="w-full p-5 bg-emerald-600 text-white rounded-2xl text-left text-[11px] font-black uppercase mt-6 flex justify-between items-center hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
            >
              Meine Schüler & Kunden <span>→</span>
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}