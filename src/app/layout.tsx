import type { Metadata } from "next";
import { Hanken_Grotesk, Manrope } from "next/font/google";
import "./globals.css";

const fontDisplay = Hanken_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
});

const fontBody = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WIBEX Enterprise CMS",
  description: "WIBEX Enterprise System for Building Division Management",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${fontDisplay.variable} ${fontBody.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
