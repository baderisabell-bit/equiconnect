import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import GlobalConsentNewsletterBanners from "./components/global-consent-newsletter-banners";

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
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <GlobalConsentNewsletterBanners />
      </body>
    </html>
  );
}
