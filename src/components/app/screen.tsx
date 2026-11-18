import type { ReactNode } from "react";

export type Hero = { label: string; value: string; unit?: string };

// Pantalla de la app con el marcador (DESIGN.md §6) y la franja. Las etiquetas pixeladas se
// escriben en minúsculas en el HTML y van en mayúsculas por CSS (diseño D25).
// Dirección B (D59): con `heroes`, el marcador es "portada", con una o dos cifras enormes que
// cuentan el estado de la pantalla; sin ellas, es "interior" y compacto.
export function AppScreen({
  title,
  subtitle,
  kicker,
  tags,
  heroes,
  heroesHiddenOnDesktop,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  kicker?: string;
  tags?: ReactNode;
  heroes?: Hero[];
  // En escritorio las cifras pueden ir en la columna lateral en vez de en el marcador (D62).
  heroesHiddenOnDesktop?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const cover = heroes !== undefined && heroes.length > 0;
  return (
    <>
      <header className="wz-band wz-pad" data-cover={cover ? "" : undefined} aria-label="Marcador">
        {kicker || tags ? (
          <div className="flex min-h-11 flex-wrap items-center justify-between gap-2">
            {kicker ? <span className="wz-kicker">{kicker}</span> : <span />}
            {tags ? <span className="flex flex-wrap items-center gap-2">{tags}</span> : null}
          </div>
        ) : null}
        <h1 className="wz-title">{title}</h1>
        {subtitle ? <p className="wz-subtitle">{subtitle}</p> : null}
        {cover ? (
          <Heroes heroes={heroes} className={heroesHiddenOnDesktop ? "lg:hidden" : undefined} />
        ) : null}
      </header>
      <div className="wz-stripes" aria-hidden="true" />
      {/* En escritorio el pie va en el flujo, justo bajo el contenido, y no pegado al fondo (D62). */}
      <main className="wz-pad flex flex-1 flex-col gap-4 py-4 lg:flex-none" aria-label={title}>
        {children}
      </main>
      {footer ? (
        // Encima de la barra de pestañas, que ya respeta la zona segura de iOS: sin sumarla otra vez.
        <div className="wz-foot wz-pad bottom-[calc(3.5rem+env(safe-area-inset-bottom))] pb-[18px] lg:static lg:pb-8">
          {/* En escritorio el CTA conserva su forma de botón de recreativa (auditoría 18/11). */}
          <div className="flex w-full flex-col gap-2.5 lg:max-w-[420px]">{footer}</div>
        </div>
      ) : null}
    </>
  );
}

export function Heroes({ heroes, className, tone = "band" }: { heroes: Hero[]; className?: string; tone?: "band" | "paper" }) {
  return (
    <div className={`wz-heroes ${className ?? ""}`} data-tone={tone}>
      {heroes.map((h) => (
        <div key={h.label}>
          <p className="wz-hero-label">{h.label}</p>
          <p className="wz-hero-num" data-numeric="">
            {h.value}
            {h.unit ? <small>{h.unit}</small> : null}
          </p>
        </div>
      ))}
    </div>
  );
}

export function Tag({ children, premium }: { children: ReactNode; premium?: boolean }) {
  return (
    <span className="wz-tag" data-premium={premium ? "" : undefined}>
      {children}
    </span>
  );
}

export function Disclaimer() {
  return (
    <p className="m-0 text-[13px] text-muted-foreground">
      BUDDY no es consejo médico ni sustituye a un entrenador certificado. Si algo duele, para.
    </p>
  );
}

// Tira de la semana (DESIGN.md §4): una casilla por sesión de la semana; hechas en verde, la
// siguiente en limón. No hay días de la semana fijos en el plan, así que se numeran (D67).
export function WeekStrip({ days, done }: { days: number; done: number }) {
  const made = Math.min(done, days);
  return (
    <section aria-label={`Tu semana: ${made} de ${days} sesiones hechas`} className="flex flex-col gap-2">
      <div className="flex justify-between text-[12px] font-bold uppercase tracking-[0.06em] text-muted-foreground" aria-hidden="true">
        <span>Tu semana</span>
        <span>{`${made} de ${days} hechas`}</span>
      </div>
      <div className="wz-week" style={{ ["--days" as string]: days }} aria-hidden="true">
        {Array.from({ length: days }, (_, i) => (
          <span key={i} className="wz-week-day" data-state={i < made ? "done" : i === made ? "next" : "todo"}>
            {i + 1}
          </span>
        ))}
      </div>
    </section>
  );
}
