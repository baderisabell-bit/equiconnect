"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LoggedInHeader from "../../components/logged-in-header";
import { getExpertDashboardAnalytics } from "../../actions";

const StatTile = ({ label, value, sublabel }: { label: string; value: any; sublabel?: string }) => (
  <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-colors">
    <div>
      <p className="text-[10px] font-black uppercase text-slate-500 tracking-tight">{label}</p>
      {sublabel && <p className="text-[8px] font-bold text-slate-400 uppercase">{sublabel}</p>}
    </div>
    <p className="text-xl font-black italic text-slate-900">{value || 0}</p>
  </div>
);

export default function ExpertDashboardPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [userName, setUserName] = useState("Experte");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
          if (res.success) {
            setAnalytics(res.data);
          } else {
            setError("Fehler beim Abrufen der Daten.");
          }
        } catch (err) {
          setError("Server-Verbindung unterbrochen.");
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

  const isFilterActive = (f: string) => activeFilters.length === 0 || activeFilters.includes(f);
  const visibleCount = [isFilterActive('Anzeigen'), isFilterActive('Beiträge'), isFilterActive('Werbung')].filter(Boolean).length;

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#fbfcfd]">
      <p className="font-black italic uppercase text-slate-400 animate-pulse tracking-widest">Lade Daten...</p>
    </div>
  );

  const totalReach = (analytics?.profile?.viewsTotal || 0) + 
                     (analytics?.posts?.viewsTotal || 0) + 
                     (analytics?.ads?.viewsTotal || 0);

  return (
    <div className="min-h-screen bg-[#fbfcfd] text-slate-900 font-sans">
      
      <aside className={`fixed left-0 top-0 h-full w-80 bg-white z-[70] shadow-2xl transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} p-8 flex flex-col`}>
        <div className="flex justify-between items-center mb-10 text-xl font-black italic uppercase">
          <h2>Menü</h2>
          <button onClick={() => setSidebarOpen(false)}>✕</button>
        </div>
        <nav className="space-y-2 flex-grow">
          {['Dashboard', 'Netzwerk', 'Anzeigen', 'Beiträge', 'Einstellungen'].map((item) => (
            <button key={item} className="w-full text-left p-4 rounded-2xl font-black uppercase text-[11px] hover:bg-slate-50">{item}</button>
          ))}
        </nav>
        <button onClick={() => { sessionStorage.clear(); router.push('/login'); }} className="p-4 bg-red-50 text-red-600 rounded-2xl font-black uppercase text-[10px]">Abmelden</button>
      </aside>

      <LoggedInHeader 
        userId={userId} 
        role={role === "experte" ? "experte" : "nutzer"} 
        userName={userName} 
        onOpenSidebar={() => setSidebarOpen(true)} 
        brandText="Expert Intelligence"
      />

      <main className="max-w-[1500px] mx-auto px-6 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-12 gap-6">
          
          <div className="lg:col-span-4 bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 flex flex-col justify-between">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Profil-Sichtbarkeit</p>
            <p className="text-6xl font-black italic text-emerald-600">{analytics?.profile?.viewsTotal || 0}</p>
            <div className="mt-4 border-t pt-4">
               <p className="text-[10px] font-black uppercase text-slate-400">Gesamt-Reach</p>
               <p className="text-2xl font-black italic">{totalReach.toLocaleString('de-DE')}</p>
            </div>
          </div>

          <div className="lg:col-span-4 bg-slate-950 rounded-[2.5rem] p-8 text-white flex flex-col justify-between">
            <h3 className="text-3xl font-black italic uppercase">{analytics?.planLabel || "Premium Experte"}</h3>
            <button onClick={() => router.push('/abo')} className="mt-6 w-full py-4 bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10 hover:bg-white/20 transition-all">Plan verwalten</button>
          </div>

          <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100 flex flex-col justify-center">
             <p className="text-[10px] font-bold text-slate-400 uppercase">Nachrichten</p>
             <p className="text-4xl font-black mt-2 italic">{analytics?.ads?.incomingMessagesTotal || 0}</p>
          </div>
          <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-6 shadow-sm border border-slate-100 flex flex-col justify-center">
             <p className="text-[10px] font-bold text-slate-400 uppercase">Likes</p>
             <p className="text-4xl font-black mt-2 italic">{analytics?.posts?.likesTotal || 0}</p>
          </div>

          <div className="lg:col-span-8 bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-4">
              <h3 className="font-black italic uppercase text-2xl tracking-tight">Performance Hub</h3>
              <div className="flex gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                {['Anzeigen', 'Beiträge', 'Werbung'].map(f => (
                  <button key={f} onClick={() => toggleFilter(f)} className={`px-5 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${activeFilters.includes(f) || activeFilters.length === 0 ? 'bg-white shadow-md text-slate-900' : 'text-slate-400'}`}>{f}</button>
                ))}
              </div>
            </div>

            <div className="grid gap-10 transition-all items-end" style={{ gridTemplateColumns: `repeat(${visibleCount || 1}, 1fr)` }}>
              {isFilterActive('Anzeigen') && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 min-h-[250px] justify-end">
                    {(analytics?.ads?.list || []).map((ad: any) => (
                      <div key={ad.id} className="w-full group">
                        <div className="bg-emerald-500 rounded-xl transition-all" style={{ height: `${Math.max((ad.views || 0) * 2, 12)}px` }} />
                        <div className="flex justify-between mt-2 text-[8px] font-black uppercase px-1">
                          <span className="truncate max-w-[70%]">{ad.title}</span>
                          <span className="text-emerald-600">{ad.views || 0}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-center text-[10px] font-black uppercase text-slate-200 border-t pt-4 tracking-[0.2em]">Anzeigen</p>
                </div>
              )}
              {isFilterActive('Beiträge') && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 min-h-[250px] justify-end">
                    {(analytics?.posts?.list || []).map((p: any) => (
                      <div key={p.id}>
                        <div className="bg-sky-500 rounded-xl" style={{ height: `${Math.max((p.views || 0) * 2, 12)}px` }} />
                        <div className="flex justify-between mt-2 text-[8px] font-black uppercase px-1">
                          <span className="truncate max-w-[70%]">{p.title}</span>
                          <span className="text-sky-600">{p.views || 0}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-center text-[10px] font-black uppercase text-slate-200 border-t pt-4 tracking-[0.2em]">Beiträge</p>
                </div>
              )}
              {isFilterActive('Werbung') && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 min-h-[250px] justify-end">
                    {(analytics?.werbung?.list || []).map((w: any) => (
                      <div key={w.id}>
                        <div className="bg-amber-500 rounded-xl" style={{ height: `${Math.max((w.views || 0) * 2, 12)}px` }} />
                        <div className="flex justify-between mt-2 text-[8px] font-black uppercase px-1">
                          <span className="truncate max-w-[70%]">{w.title}</span>
                          <span className="text-amber-600">{w.views || 0}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-center text-[10px] font-black uppercase text-slate-200 border-t pt-4 tracking-[0.2em]">Werbung</p>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-4 bg-white rounded-[3rem] p-8 shadow-sm border border-slate-100 flex flex-col gap-4">
             <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2">Details Interaktionen</p>
             <StatTile label="Kommentare" value={analytics?.posts?.commentsTotal} />
             <StatTile label="Antworten" value={analytics?.posts?.repliesTotal} />
             <StatTile label="Bewertungen" value={analytics?.ads?.ratingsTotal} />
             <StatTile label="Merkliste" value={(analytics?.profile?.wishlistTotal || 0) + (analytics?.ads?.wishlistTotal || 0)} />
          </div>

          <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
            <button onClick={() => router.push('/werbung-buchen')} className="p-8 bg-white border border-slate-100 rounded-[2.5rem] text-left hover:shadow-xl transition-all">
              <span className="text-[11px] font-black uppercase">Werbung auf der Startseite →</span>
            </button>
            <button onClick={() => router.push('/inserieren')} className="p-8 bg-white border border-slate-100 rounded-[2.5rem] text-left hover:shadow-xl transition-all">
              <span className="text-[11px] font-black uppercase">Anzeige schalten →</span>
            </button>
            <button onClick={() => router.push('/beitrag-erstellen')} className="p-8 bg-white border border-slate-100 rounded-[2.5rem] text-left hover:shadow-xl transition-all">
              <span className="text-[11px] font-black uppercase">Beitrag erstellen →</span>
            </button>
            <button onClick={() => router.push('/dashboard/experte/schueler')} className="p-8 bg-emerald-600 text-white rounded-[2.5rem] text-left shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all">
              <span className="text-[11px] font-black uppercase">Meine Schüler →</span>
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}