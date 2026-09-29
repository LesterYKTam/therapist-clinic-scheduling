import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Clinic development site",
  description: "Local infrastructure smoke page",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
