import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { DevToolsGuard } from "@/components/security/DevToolsGuard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  title: "EXAM MIND AI | Created by CoralGenz Global",
  description:
    "ExamMind AI is an advanced autonomous multimodal AI reasoning and educational platform engineered by CoralGenz Global. Features real-time Google search synthesis, deterministic mathematics verification, full-stack programming, and optical vision.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
  keywords: [
    "ExamMind AI",
    "CoralGenz Global",
    "ExamMind Neural Engine",
    "Educational AI",
    "Academic Intelligence",
    "Deterministic Math Solver",
    "Google Web Search",
    "LaTeX Math Solver",
    "Textbook RAG",
    "Exam Preparation",
  ],
  authors: [{ name: "CoralGenz Global" }],
  creator: "CoralGenz Global",
  publisher: "CoralGenz Global",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-zinc-900 font-sans selection:bg-[#10a37f] selection:text-white">
        <DevToolsGuard />
        {children}
      </body>
    </html>
  );
}
