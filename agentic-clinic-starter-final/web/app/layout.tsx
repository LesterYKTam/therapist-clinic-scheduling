import type { Metadata } from "next";
import "./styles.css";
// @ts-expect-error JavaScript helper is covered by the isolated PostgreSQL suite.
import { isPublicDemo, PUBLIC_DEMO_BANNER } from "../lib/public-demo.mjs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Clinic development site",
  description: "Local infrastructure smoke page",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{isPublicDemo() && <div className="public-demo-banner" role="note">{PUBLIC_DEMO_BANNER}</div>}{children}</body></html>;
}
