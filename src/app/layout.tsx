import type { Metadata } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { SITE_NAME, SITE_URL, SOCIAL_IMAGE, STRUCTURED_DATA, WEBSITE_DATA } from "@/lib/site";
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
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
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
    // No site-wide `url` here: each page sets its own, so og:url always matches
    // that page's canonical instead of every page claiming to be the homepage.
    siteName: SITE_NAME,
    locale: "en_GB",
    title: "AppraisalPortal UK — MAG 2022 Appraisal for GMC Revalidation",
    description:
      "Compare AppraisalPortal UK vs FourteenFish, Clarity & L2P. MAG 2022-native, lock-on-sign-off, integrated MSF 360° feedback and RO compliance centre.",
    type: "website",
    images: [SOCIAL_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    images: [SOCIAL_IMAGE],
    title: "AppraisalPortal UK — MAG 2022 Appraisal for GMC Revalidation",
    description:
      "MAG 2022-native UK appraisal portal: 360° MSF feedback, CPD, PDP that carries forward, appraiser sign-off and RO oversight.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
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
        {/* Structured data so search engines understand the product (schema.org). */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
        />
        {/* Site-level schema: this origin is the canonical home of the product. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(WEBSITE_DATA) }}
        />
      </head>
      <body className="flex min-h-full flex-col">
        <ScrollProgress />
        {children}
      </body>
    </html>
  );
}
