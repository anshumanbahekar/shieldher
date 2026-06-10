import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/layout/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShieldHer — Your Personal Safety Guardian",
  description: "Real-time women's safety platform. SOS alerts, live location sharing, trusted circle, and AI companion — all in one tap.",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "ShieldHer" },
  openGraph: { title: "ShieldHer", description: "Your personal safety guardian", type: "website" },
};

export const viewport: Viewport = {
  themeColor: "#E5294E",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        {/* Novus.ai — required for hackathon */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(n,o,v,u,s){n[s]=n[s]||function(){(n[s].q=n[s].q||[]).push(arguments)};var t=o.createElement('script');t.async=1;t.src='https://cdn.novus.ai/analytics.js';var f=o.getElementsByTagName('script')[0];f.parentNode.insertBefore(t,f);})(window,document,'novus','https://cdn.novus.ai','novus');novus('init','${process.env.NEXT_PUBLIC_NOVUS_PROJECT_ID}');`,
          }}
        />
      </head>
      <body className="bg-night-950 text-night-50 antialiased overflow-x-hidden">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
