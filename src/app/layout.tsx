import type { Metadata } from "next";
import { Bebas_Neue, Poppins } from "next/font/google";
import { Toaster } from "@/components/Toaster";
import { SITE } from "@/data/config";
import "./globals.css";

const display = Bebas_Neue({ weight: "400", subsets: ["latin"], variable: "--font-display" });
const sans = Poppins({ weight: ["400", "600", "700", "800"], subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: { default: `${SITE.marca} | Rifas en línea`, template: `%s | ${SITE.marca}` },
  description: `${SITE.marca}: participa en nuestras rifas con loterías oficiales. Compra tus boletos y gana.`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${sans.variable}`}>
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
