import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import 'leaflet/dist/leaflet.css';
import LeafletClient from './components/leaflet-client';
import FoundingMembersInfoBanner from "./components/founding-members-info-banner";
import FooterLinks from './components/footer-links';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Equily",
  description: "Equily - Plattform für Pferde, Training, Dienstleistungen und Netzwerke",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        <Script
          id="Cookiebot"
          src="https://consent.cookiebot.com/uc.js"
          data-cbid="68b67086-23b2-4262-87f9-f376088ce5fe"
          data-blockingmode="auto"
          strategy="beforeInteractive"
        />
        <div className="flex-grow">{children}</div>
        <FooterLinks />
        <FoundingMembersInfoBanner />
        <LeafletClient />
      </body>
    </html>
  );
}
