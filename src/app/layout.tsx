import type { Metadata } from "next";
// @ts-expect-error Next.js processes this stylesheet import at build time.
import "./globals.css";
export const metadata: Metadata = { title: "DM Command Center", description: "A workspace for preparing and running D&D campaigns." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="id"><body>{children}</body></html>; }
