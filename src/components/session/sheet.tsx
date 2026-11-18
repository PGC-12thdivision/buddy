"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

// Hoja inferior accesible (DESIGN.md §8; diseño D25): role="dialog", aria-modal, foco atrapado, Esc
// para cerrar y el foco vuelve a donde estaba. Sin animación: se usa también para la Molestia.
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const focusables = () => Array.from(node?.querySelectorAll<HTMLElement>("button:not([disabled]), [href], input") ?? []);
    // Sin desplazar la hoja: si el primer botón está abajo, el título y el contenido siguen a la vista.
    focusables()[0]?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="ss-sheet-bg" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} className="ss-sheet" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId}>{title}</h2>
        {children}
      </div>
    </div>
  );
}
