import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "@/components/providers/session-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SplitEase - Split Expenses with Friends",
  description:
    "Easily split expenses with friends, track shared costs, and settle up seamlessly. SplitExpense made simple.",
  keywords: [
    "split expenses",
    "bill splitting",
    "shared costs",
    "group expenses",
    "settle up",
  ],
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    title: "SplitEase - Split Expenses with Friends",
    description:
      "Easily split expenses with friends, track shared costs, and settle up seamlessly.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <SessionProvider>{children}</SessionProvider>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
