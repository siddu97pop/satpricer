import type { Metadata } from "next";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

export const metadata: Metadata = {
  title: "SatPricer — Stock vs Bitcoin Investment Simulator",
  description:
    "What if you'd bought Bitcoin instead? Compare investing in any stock vs BTC — lump sum or DCA, priced in dollars or sats.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} font-ui bg-bg text-[#f3f4f6] antialiased min-h-dvh`}>
        {children}
      </body>
    </html>
  );
}
