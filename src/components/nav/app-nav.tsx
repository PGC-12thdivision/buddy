"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

// Navegación de la app (DESIGN.md §5; diseño D3 y D24): barra inferior de 4 pestañas hasta 1023 px
// y menú lateral fijo de 240 px desde 1024 px, con el estado de la suscripción abajo.

const SECTIONS: { href: Route; label: string; icon: string }[] = [
  { href: "/hoy", label: "Hoy", icon: "M4 5h16v15H4zM4 10h16M9 3v4M15 3v4" },
  { href: "/plan", label: "Plan", icon: "M5 4h14v16H5zM8 9h8M8 13h8M8 17h5" },
  { href: "/progreso", label: "Progreso", icon: "M4 20h16M6 16l4-5 3 3 5-7" },
  { href: "/ajustes", label: "Ajustes", icon: "M4 7h10M18 7h2M4 17h2M10 17h10M14 5v4M6 15v4" },
];

function Icon({ d }: { d: string }) {
  return (
    <svg className="wz-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

export function AppNav({ subscription }: { subscription: string }) {
  const pathname = usePathname();
  const active = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <nav
        aria-label="Secciones"
        className="fixed inset-x-0 bottom-0 z-20 grid h-14 grid-cols-4 border-t-2 border-foreground bg-background lg:hidden"
      >
        {SECTIONS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            aria-current={active(s.href) ? "page" : undefined}
            className="relative flex min-w-11 flex-col items-center justify-center gap-0.5 text-[12px] font-bold text-muted-foreground aria-[current=page]:text-foreground"
          >
            {active(s.href) ? <span aria-hidden="true" className="absolute inset-x-3 top-0 h-1 bg-primary" /> : null}
            <Icon d={s.icon} />
            {s.label}
          </Link>
        ))}
      </nav>

      <nav aria-label="Secciones" className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col bg-accent px-4 py-6 text-accent-foreground lg:flex">
        <span
          className="mb-8 font-display text-[40px] font-black uppercase italic leading-none text-primary [font-stretch:125%]"
          style={{ textShadow: "3px 3px 0 #ff5fa2" }}
        >
          Buddy
        </span>
        <ul className="m-0 flex list-none flex-col gap-1 p-0">
          {SECTIONS.map((s) => (
            <li key={s.href}>
              <Link
                href={s.href}
                aria-current={active(s.href) ? "page" : undefined}
                className="flex min-h-11 items-center gap-3 rounded-md px-3 font-bold text-band-muted aria-[current=page]:bg-primary aria-[current=page]:text-primary-foreground"
              >
                <Icon d={s.icon} />
                {s.label}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-auto text-[13px] text-band-muted">{subscription}</p>
      </nav>
    </>
  );
}
