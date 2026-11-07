import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { AppSidebar } from "@/components/dashboard/AppSidebar";

export const metadata: Metadata = {
  title: "API Sentinel — Uptime & Performance Observability",
  description: "Modern developer-first API uptime and performance monitoring platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background font-sans antialiased text-slate-100 flex">
        <Providers>
          <AppSidebar />
          <div className="flex-1 flex flex-col min-h-screen min-w-0 overflow-y-auto">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
