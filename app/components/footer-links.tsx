import Link from "next/link";

export default function FooterLinks() {
  return (
    <footer className="bg-white border-t px-4 py-6 md:p-10 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
      <div className="mx-auto grid max-w-4xl grid-cols-2 gap-x-6 gap-y-3 text-center md:flex md:flex-row md:justify-center md:gap-10">
        <Link href="/agb">AGB</Link>
        <Link href="/widerrufsbelehrung">Wiederrufsbelehrung</Link>
        <Link href="/zahlung-und-versand">Zahlung und Versand</Link>
        <Link href="/datenschutz">Datenschutz</Link>
        <Link href="/cookies">Cookies</Link>
        <Link href="/impressum">Impressum</Link>
      </div>
    </footer>
  );
}
