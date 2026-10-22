import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./tokens.css";
import "./styles.css";
// @ts-expect-error JavaScript helper is covered by the isolated PostgreSQL suite.
import { isPublicDemo, PUBLIC_DEMO_BANNER } from "../lib/public-demo.mjs";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-inter", display: "swap" });

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Therapist Clinic Scheduling",
  description: "Leave-aware therapy clinic scheduling with safe, admin-approved auto-resolve. Built by an AI agent team.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={inter.variable}><body>{isPublicDemo() && <div className="public-demo-banner" role="note">{PUBLIC_DEMO_BANNER}</div>}{children}</body></html>;
}
