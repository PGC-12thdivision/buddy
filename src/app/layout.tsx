import type { Metadata } from "next";
import { Archivo, Atkinson_Hyperlegible_Next, Silkscreen } from "next/font/google";
import "./globals.css";

// Tipografía de DESIGN.md §3.
const display = Archivo({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  axes: ["wdth"],
});

const body = Atkinson_Hyperlegible_Next({
  variable: "--font-body",
  subsets: ["latin", "latin-ext"],
  fallback: ["Arial", "sans-serif"],
  adjustFontFallback: false,
});

// Silkscreen en lugar de Press Start 2P (D58): Press Start dibuja Í, Ó, Á, É, Ú y Ñ a altura de
// minúscula ("SESIóN", "DíAS"); Silkscreen mantiene el bloque arcade con las tildes bien.
const pixel = Silkscreen({
  variable: "--font-pixel",
  weight: ["400", "700"],
  subsets: ["latin", "latin-ext"],
  preload: false,
});

export const metadata: Metadata = {
  title: "BUDDY",
  description: "Tu plan de gimnasio, hecho para ti y para tu gimnasio, con el peso que toca cada día.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${display.variable} ${body.variable} ${pixel.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
