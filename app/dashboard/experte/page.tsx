"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LoggedInHeader from "../../components/logged-in-header";
import { getExpertDashboardAnalytics } from "../../actions";

export default function ExpertDashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState("Experte");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Standardmäßig sind alle Filter aktiv (leeres Array = alle anzeigen)
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

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
          if (res.success) setAnalytics(res.data);
        } catch (error) {
          console.error("Fehler beim Laden:", error);
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  const toggleFilter = (f: string) => {
    setActiveFilters(prev => 
      prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
    );
  };

  // Bestimme, welche Sektionen angezeigt werden sollen
  const showAds = activeFilters.length === 0 || activeFilters.includes('Anzeigen');
  const showPosts = activeFilters.length === 0 || activeFilters.includes('Beiträge');
  const showWerbung = activeFilters.length === 0 || activeFilters.includes('Werbung');

  // Berechne die Anzahl der sichtbaren Spalten für das Grid
  const visibleCount = [showAds, showPosts, showWerbung].filter(Boolean).length;

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#fbfcfd]">Lade...</div>;

  return (
    <div className="min-h-screen bg-[#fbfcfd] text-slate-900">
      <LoggedInHeader 
        userId={userId} 
        role={role === "experte" ? "experte" : "nutzer"} 
        userName={userName} 
        onOpenSidebar={() => setSidebarOpen(true)} 
        brandText="Expert Intelligence"
      />

      <main className="max-w-[1400px] mx-auto px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Top Stats */}
          <div className="lg:col-span-4 bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100 ring-1 ring-slate-50">
            <p className="text-[11px] font-black uppercase text-emerald-600 tracking-[0.2em] mb-4">Profil-Sichtbarkeit</p>
            <div className="flex items-baseline gap-2">
              <span className="text-7xl font-black italic tracking-tighter">{analytics?.profile?.viewsTotal || 0}</span>
              <span className="text-emerald-500 font-bold text-lg">↑</span>
            </div>
          </div>

          <div className="lg:col-span-8 bg-slate-950 rounded-[3rem] p-10 text-white flex flex-col justify-between">
            <div className="flex justify-between items-start">
              <div>
                <span className="px-4 py-1.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase rounded-full border border-emerald-500/30">Active Plan</span>
                <h3 className="text-4xl font-black italic uppercase mt-6 tracking-tight">{analytics?.planLabel || "Premium Experte"}</h3>
              </div>
              <button onClick={() => router.push('/abo')} className="bg-white/5 hover:bg-white/10 p-4 rounded-2xl border border-white/10 transition-colors">
                <span className="text-[10px] font-black uppercase tracking-widest">Upgrade</span>
              </button>
            </div>
          </div>

          {/* Dynamischer Aktivitätsverlauf */}
          <div className="lg:col-span-12 bg-white rounded-[3.5rem] p-10 shadow-xl shadow-slate-200/40 border border-slate-100">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-6">
              <div>
                <h2 className="text-3xl font-black italic uppercase tracking-tight">Performance Hub</h2>
                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-2">Echtzeit-Analyse Ihrer Inhalte</p>
              </div>
              
              <div className="flex gap-3 bg-slate-50 p-2 rounded-3xl border border-slate-100">
                {['Anzeigen', 'Beiträge', 'Werbung'].map((f) => (
                  <button
                    key={f}
                    onClick={() => toggleFilter(f)}
                    className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${
                      activeFilters.includes(f) || activeFilters.length === 0 ? 'bg-white shadow-md text-slate-900' : 'text-slate-400'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamisches Grid-System */}
            <div className={`grid gap-12 transition-all duration-500`} style={{ gridTemplateColumns: `repeat(${visibleCount}, 1fr)` }}>
              
              {showAds && (
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-4 min-h-[300px] justify-end">
                    {analytics?.ads?.list?.map((ad: any) => (
                      <div key={ad.id} className="w-full">
                        <div className="bg-emerald-500 rounded-2xl transition-all hover:scale-[1.02]" style={{ height: `${Math.max(ad.views * 3, 20)}px`, minHeight: '12px' }} />
                        <div className="mt-3 flex justify-between items-center px-1">
                          <p className="text-[9px] font-black uppercase truncate max-w-[70%]">{ad.title}</p>
                          <span className="text-[10px] font-bold text-emerald-600">{ad.views}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="h-px bg-slate-100 w-full" />
                  <p className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Anzeigen</p>
                </div>
              )}

              {showPosts && (
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-4 min-h-[300px] justify-end">
                    {analytics?.posts?.list?.map((post: any) => (
                      <div key={post.id} className="w-full">
                        <div className="bg-sky-500 rounded-2xl transition-all hover:scale-[1.02]" style={{ height: `${Math.max(post.views * 3, 20)}px`, minHeight: '12px' }} />
                        <div className="mt-3 flex justify-between items-center px-1">
                          <p className="text-[9px] font-black uppercase truncate max-w-[70%]">{post.title}</p>
                          <span className="text-[10px] font-bold text-sky-600">{post.views}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="h-px bg-slate-100 w-full" />
                  <p className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Beiträge</p>
                </div>
              )}

              {showWerbung && (
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col gap-4 min-h-[300px] justify-end">
                    {analytics?.werbung?.list?.map((w: any) => (
                      <div key={w.id} className="w-full">
                        <div className="bg-amber-500 rounded-2xl transition-all hover:scale-[1.02]" style={{ height: `${Math.max(w.views * 3, 20)}px`, minHeight: '12px' }} />
                        <div className="mt-3 flex justify-between items-center px-1">
                          <p className="text-[9px] font-black uppercase truncate max-w-[70%]">{w.title}</p>
                          <span className="text-[10px] font-bold text-amber-600">{w.views}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="h-px bg-slate-100 w-full" />
                  <p className="text-center text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">Werbung</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}