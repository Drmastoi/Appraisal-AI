import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { ScrollProgress } from "@/components/Scrolly";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const display = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "AppraisalPortal UK — MAG 2022 Appraisal for GMC Revalidation | FourteenFish Alternative",
  description:
    "UK medical appraisal portal built on the MAG 2022 model form: 360° MSF feedback, CPD portfolios, SMART PDPs that carry forward, and approval-gated AI — with lock-on-sign-off, version history and RO bundle for GMC revalidation.",
  keywords: [
    "UK doctor appraisal",
    "medical appraisal portal",
    "MAG 2022",
    "GMC revalidation",
    "FourteenFish alternative",
    "Clarity appraisal comparison",
    "L2P alternative",
    "360 feedback MSF",
    "NHS England appraisal",
  ],
  openGraph: {
    title: "AppraisalPortal UK — MAG 2022 Appraisal for GMC Revalidation",
    description:
      "Compare AppraisalPortal UK vs FourteenFish, Clarity & L2P. MAG 2022-native, lock-on-sign-off, integrated MSF 360° feedback and RO compliance centre.",
    type: "website",
  },
  alternates: { canonical: "/" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* Flags JS availability so reveal animations only hide content when they can run. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add('js');`,
          }}
        />
      </head>
      <body className="flex min-h-full flex-col">
        <ScrollProgress />
        {children}
      </body>
    </html>
  );
}
