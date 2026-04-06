"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import LoggedInHeader from "../../../components/logged-in-header";
import {
  getExpertHorses,
  addExpertHorse,
  updateExpertHorse,
  removeExpertHorse,
} from "../../../actions";
import { Plus, Edit2, Trash2, Heart } from "lucide-react";

type Horse = {
  id: number;
  name: string;
  breed: string | null;
  age: number | null;
  notes: string | null;
  image_url: string | null;
  created_at: string;
};

export default function ExpertHorsesPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [horses, setHorses] = useState<Horse[]>([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingHorse, setEditingHorse] = useState<Horse | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    breed: "",
    age: "",
    notes: "",
    imageUrl: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const userIdRaw = sessionStorage.getItem("userId");
    const roleRaw = sessionStorage.getItem("userRole");
    if (userIdRaw) {
      setUserId(parseInt(userIdRaw, 10));
      setRole(roleRaw);
    } else {
      router.push("/login");
    }
  }, [router]);

  useEffect(() => {
    if (userId) {
      loadHorses();
    }
  }, [userId]);

  const loadHorses = async () => {
    if (!userId) return;

    try {
      const res = await getExpertHorses(userId);
      if (res.success) {
        setHorses(res.horses || []);
      } else {
        setError(res.error || "Fehler beim Laden der Pferde");
      }
    } catch (err) {
      setError("Netzwerkfehler");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setMessage("");
    setError("");

    try {
      const payload = {
        name: formData.name,
        breed: formData.breed || undefined,
        age: formData.age ? parseInt(formData.age, 10) : undefined,
        notes: formData.notes || undefined,
        imageUrl: formData.imageUrl || undefined,
      };

      let res;
      if (editingHorse) {
        res = await updateExpertHorse(userId, editingHorse.id, payload);
      } else {
        res = await addExpertHorse(userId, payload);
      }

      if (res.success) {
        setMessage(editingHorse ? "Pferd aktualisiert" : "Pferd hinzugefügt");
        setFormData({ name: "", breed: "", age: "", notes: "", imageUrl: "" });
        setShowAddForm(false);
        setEditingHorse(null);
        loadHorses();
      } else {
        setError(res.error || "Fehler beim Speichern");
      }
    } catch (err) {
      setError("Netzwerkfehler");
    }
  };

  const handleEdit = (horse: Horse) => {
    setEditingHorse(horse);
    setFormData({
      name: horse.name,
      breed: horse.breed || "",
      age: horse.age?.toString() || "",
      notes: horse.notes || "",
      imageUrl: horse.image_url || "",
    });
    setShowAddForm(true);
  };

  const handleDelete = async (horseId: number) => {
    if (!userId || !confirm("Pferd wirklich entfernen?")) return;

    try {
      const res = await removeExpertHorse(userId, horseId);
      if (res.success) {
        setMessage("Pferd entfernt");
        loadHorses();
      } else {
        setError(res.error || "Fehler beim Entfernen");
      }
    } catch (err) {
      setError("Netzwerkfehler");
    }
  };

  const resetForm = () => {
    setFormData({ name: "", breed: "", age: "", notes: "", imageUrl: "" });
    setShowAddForm(false);
    setEditingHorse(null);
  };

  const openProfile = () => {
    const userIdRaw = sessionStorage.getItem('userId');
    const parsedUserId = userIdRaw ? parseInt(userIdRaw, 10) : NaN;
    if (!Number.isNaN(parsedUserId) && parsedUserId > 0) {
      window.location.href = `/profil/${parsedUserId}`;
      return;
    }
    window.location.href = '/login';
  };

  const currentRole = (typeof window !== "undefined" ? sessionStorage.getItem("userRole") : null) || role;
  const normalizedRole = String(currentRole || role).trim().toLowerCase();
  const isExpertRole = Boolean(normalizedRole) && !["nutzer", "user", "kunde"].includes(normalizedRole);

  const handleLogout = () => {
    sessionStorage.clear();
    window.location.href = "/";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <LoggedInHeader
          userId={userId}
          role={role}
          userName=""
          onOpenSidebar={() => setSidebarOpen(true)}
        />
        <div className="flex justify-center items-center h-64">
          <div className="text-slate-500">Laden...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <LoggedInHeader
        userId={userId}
        role={role}
        userName=""
        onOpenSidebar={() => setSidebarOpen(true)}
      />

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-black text-slate-800">Meine Pferde</h1>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-emerald-600 text-white px-4 py-2 rounded-2xl font-bold hover:bg-emerald-700 flex items-center gap-2"
          >
            <Plus size={20} />
            Pferd hinzufügen
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-2xl border border-red-200">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 rounded-2xl border border-emerald-200">
            {message}
          </div>
        )}

        {showAddForm && (
          <div className="mb-8 bg-white p-6 rounded-[3rem] shadow-xl border border-slate-100">
            <h2 className="text-xl font-bold text-slate-800 mb-4">
              {editingHorse ? "Pferd bearbeiten" : "Neues Pferd"}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Rasse
                </label>
                <input
                  type="text"
                  value={formData.breed}
                  onChange={(e) => setFormData({ ...formData, breed: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="z.B. Hannoveraner, Quarter Horse, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Alter (Jahre)
                </label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  min="0"
                  placeholder="z.B. 8"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Notizen
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  rows={3}
                  placeholder="Zusätzliche Informationen, Besonderheiten, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Bild-URL
                </label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full p-3 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  placeholder="https://example.com/horse-image.jpg"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="bg-emerald-600 text-white px-6 py-2 rounded-2xl font-bold hover:bg-emerald-700"
                >
                  {editingHorse ? "Aktualisieren" : "Hinzufügen"}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="bg-slate-200 text-slate-700 px-6 py-2 rounded-2xl font-bold hover:bg-slate-300"
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="grid gap-4">
          {horses.length === 0 ? (
            <div className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 text-center">
              <Heart size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-700 mb-2">Noch keine Pferde</h3>
              <p className="text-slate-500">
                Fügen Sie Ihre Pferde hinzu, um sie zu verwalten.
              </p>
            </div>
          ) : (
            horses.map((horse) => (
              <div key={horse.id} className="bg-white p-6 rounded-[3rem] shadow-xl border border-slate-100">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-slate-800">{horse.name}</h3>
                    {horse.breed && (
                      <p className="text-emerald-600 font-bold mt-1">{horse.breed}</p>
                    )}
                    {horse.age && (
                      <p className="text-slate-600 mt-1">{horse.age} Jahre alt</p>
                    )}
                    {horse.notes && (
                      <p className="text-slate-600 mt-2">{horse.notes}</p>
                    )}
                    {horse.image_url && (
                      <div className="mt-3">
                        <img
                          src={horse.image_url}
                          alt={horse.name}
                          className="w-32 h-32 object-cover rounded-2xl border border-slate-200"
                        />
                      </div>
                    )}
                    <p className="text-slate-400 text-xs mt-2">
                      Hinzugefügt am {new Date(horse.created_at).toLocaleDateString('de-DE')}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(horse)}
                      className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl"
                    >
                      <Edit2 size={20} />
                    </button>
                    <button
                      onClick={() => handleDelete(horse.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Sidebar overlay ── */}
      <div
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] transition-opacity ${sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── Slide-in sidebar ── */}
      <aside className={`fixed left-0 top-0 h-full w-72 bg-white z-[70] shadow-2xl transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} p-6 flex flex-col`}>
        <div className="flex justify-between items-center mb-8 text-emerald-600 font-black italic tracking-tighter">
          MENÜ
          <button onClick={() => setSidebarOpen(false)} className="text-slate-300 text-xl leading-none">×</button>
        </div>
        <nav className="space-y-5 flex-grow">
          <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = "/"; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Startseite</button>
          {isExpertRole && (
            <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = "/dashboard/experte"; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Dashboard</button>
          )}
          <button type="button" onClick={() => { setSidebarOpen(false); openProfile(); }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Mein Profil</button>
          {isExpertRole && (
            <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = "/dashboard/rechnungen"; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Rechnungen</button>
          )}
          {!isExpertRole && (
            <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = "/dashboard/rechnungen"; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Rechnungen</button>
          )}
          <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = "/suche"; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Suche</button>
          <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = "/netzwerk"; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Netzwerk</button>
          <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = "/nachrichten"; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Nachrichten</button>
          <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = "/merkliste"; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Merkliste</button>
          <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = "/einstellungen"; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Einstellungen</button>
          <button type="button" onClick={() => { setSidebarOpen(false); window.location.href = "/kontakt"; }} className="block text-left text-lg font-black italic uppercase text-slate-800 hover:text-emerald-600">Kontakt &amp; FAQ</button>
        </nav>
        <button onClick={handleLogout} className="mt-auto p-4 bg-slate-100 rounded-2xl font-black text-[10px] uppercase text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all">Abmelden</button>
      </aside>
    </div>
  );
}