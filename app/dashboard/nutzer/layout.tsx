"use client";

import React from 'react';

export default function NutzerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <main className="overflow-y-auto">
        {children}
      </main>
    </div>
  );
}