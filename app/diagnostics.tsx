'use client';

import { useEffect, useState } from 'react';

export default function DiagnosticsPage() {
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    const logs: string[] = [];

    logs.push(`Page loaded at: ${new Date().toISOString()}`);

    if (typeof window !== 'undefined') {
      logs.push(`Window is available`);
      logs.push(`Current URL: ${window.location.href}`);

      const userId = sessionStorage.getItem('userId');
      const userRole = sessionStorage.getItem('userRole');
      const userName = sessionStorage.getItem('userName');

      logs.push(`userId from session: ${userId || '(empty)'}`);
      logs.push(`userRole from session: ${userRole || '(empty)'}`);
      logs.push(`userName from session: ${userName || '(empty)'}`);
    } else {
      logs.push(`Window is NOT available (SSR mode)`);
    }

    setMessages(logs);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-10">
      <h1 className="text-2xl font-bold mb-4">Diagnose-Seite</h1>
      <pre className="bg-white p-4 rounded border border-slate-200 text-sm font-mono whitespace-pre-wrap break-words">
        {messages.map((msg, idx) => (
          <div key={idx}>{msg}</div>
        ))}
      </pre>
      <div className="mt-6 space-y-2">
        <p className="text-sm text-slate-600">Versuche, die Profilseite zu laden:</p>
        <a href="/profil/1" className="inline-block px-4 py-2 bg-blue-600 text-white rounded">
          Profil 1 öffnen
        </a>
      </div>
    </div>
  );
}
