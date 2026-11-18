import type { ReactNode } from "react";

// Pantalla de la app con el marcador (DESIGN.md §6) y la franja. Las etiquetas pixeladas se
// escriben en minúsculas en el HTML y van en mayúsculas por CSS (diseño D25).
export function AppScreen({
  title,
  subtitle,
  tags,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  tags?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <>
      <header className="wz-band wz-pad" aria-label="Marcador">
        {tags ? <div className="flex min-h-11 flex-wrap items-center gap-2">{tags}</div> : null}
        <h1 className="wz-title">{title}</h1>
        {subtitle ? <p className="wz-subtitle">{subtitle}</p> : null}
      </header>
      <div className="wz-stripes" aria-hidden="true" />
      <main className="wz-pad flex flex-1 flex-col gap-4 py-4" aria-label={title}>
        {children}
      </main>
      {footer ? <div className="wz-foot wz-pad bottom-14 lg:bottom-0">{footer}</div> : null}
    </>
  );
}

export function Tag({ children, premium }: { children: ReactNode; premium?: boolean }) {
  return (
    <span className="wz-tag" style={premium ? { background: "#b38cff", color: "#120a1c" } : undefined}>
      {children}
    </span>
  );
}

export function Disclaimer() {
  return (
    <p className="m-0 text-xs text-muted-foreground">
      BUDDY no es consejo médico ni sustituye a un entrenador certificado. Si algo duele, para.
    </p>
  );
}
