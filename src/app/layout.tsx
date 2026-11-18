import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Archivo, Atkinson_Hyperlegible_Next, Silkscreen } from "next/font/google";
import { parseTheme, SYSTEM_THEME_SCRIPT, THEME_COOKIE } from "@/lib/theme";
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

// viewport-fit=cover para que env(safe-area-inset-bottom) funcione en la barra inferior y el pie.
// themeColor: las barras del navegador se tiñen del morado del marcador (auditoría de la dirección B).
export const viewport: Viewport = { viewportFit: "cover", themeColor: "#3d1a5e" };

export const metadata: Metadata = {
  title: "BUDDY",
  description: "Tu plan de gimnasio, hecho para ti y para tu gimnasio, con el peso que toca cada día.",
};

// Tema (Ajustes, U11): la cookie refleja user_settings.theme; claro por defecto (D61). Con "Como el
// sistema", un script mínimo pone .dark antes de pintar, por eso <html> admite esa diferencia.
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html
      lang="es"
      className={`${display.variable} ${body.variable} ${pixel.variable} h-full antialiased${theme === "dark" ? " dark" : ""}`}
      suppressHydrationWarning={theme === "system"}
    >
      {theme === "system" ? (
        <head>
          <script dangerouslySetInnerHTML={{ __html: SYSTEM_THEME_SCRIPT }} />
        </head>
      ) : null}
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
