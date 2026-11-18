import type { Route } from "next";
import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, KeyboardEvent, ReactNode } from "react";

// Grupo de radio accesible: las flechas mueven la selección y el foco (WAI-ARIA radiogroup; auditoría 18/11).
// Solo la opción elegida (o la primera si no hay ninguna) entra en el orden de tabulación.
function radioKeys<T>(values: readonly T[], value: T | undefined, onChange: (value: T) => void) {
  return (event: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const current = value === undefined ? -1 : values.indexOf(value);
    const next = (current + step + values.length) % values.length;
    onChange(values[next]);
    const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    buttons[next]?.focus();
  };
}
const tabIndexFor = <T,>(values: readonly T[], value: T | undefined, option: T) =>
  value === option || (value === undefined && values[0] === option) ? 0 : -1;

// Componentes del wizard (DESIGN.md §6, sistema §11.12). Estilos en globals.css (.wz-*).

export const WIZARD_TOTAL_STEPS = 11;

type ScreenProps = {
  title: string;
  subtitle?: string;
  // Paso de la barra de 11 segmentos; sin él no se muestra la barra.
  step?: number;
  // Paso que se anuncia como "N de 11"; por defecto, el de la barra.
  stepLabel?: boolean;
  backHref?: Route;
  tag?: string;
  // Cabecera sobria: bloqueo y errores, sin trama ni franja (DESIGN.md §1).
  sober?: boolean;
  children: ReactNode;
  footer?: ReactNode;
};

export function WizardScreen({ title, subtitle, step, stepLabel = true, backHref, tag, sober, children, footer }: ScreenProps) {
  return (
    <>
      <header className="wz-band wz-pad" data-sober={sober ? "" : undefined} aria-label="Marcador">
        <div className="wz-band-row">
          {backHref ? (
            <Link href={backHref} className="wz-back">
              <span aria-hidden="true">←&nbsp;</span>Atrás
            </Link>
          ) : (
            <span />
          )}
          {step && stepLabel ? <span>{`${step} de ${WIZARD_TOTAL_STEPS}`}</span> : null}
        </div>
        {step ? <ProgressBar step={step} /> : null}
        {tag ? <span className="wz-tag mt-3">{tag}</span> : null}
        <h1 className="wz-title">{title}</h1>
        {subtitle ? <p className="wz-subtitle">{subtitle}</p> : null}
      </header>
      {sober ? null : <div className="wz-stripes" aria-hidden="true" />}
      <main className="wz-pad flex flex-1 flex-col gap-3 py-4" aria-label={title}>
        {children}
      </main>
      {footer ? <div className="wz-foot wz-pad">{footer}</div> : null}
    </>
  );
}

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="wz-xp" aria-hidden="true">
      {Array.from({ length: WIZARD_TOTAL_STEPS }, (_, i) => (
        <i key={i} data-on={i < step ? "" : undefined} />
      ))}
    </div>
  );
}

export function Cta({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className="wz-cta" {...props}>
      {children}
    </button>
  );
}

export function CtaLink({ href, children }: { href: Route; children: ReactNode }) {
  return (
    <Link href={href} className="wz-cta">
      {children}
    </Link>
  );
}

export function SecondaryButton({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className="wz-btn2" {...props}>
      {children}
    </button>
  );
}

export function TextButton({ children, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className="wz-link" {...props}>
      {children}
    </button>
  );
}

export function TextLink({ href, children }: { href: Route; children: ReactNode }) {
  return (
    <Link href={href} className="wz-link">
      {children}
    </Link>
  );
}

// Grupo de selección única con tarjetas (radio accesible).
export function ChoiceCards<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; title: string; description?: string; icon?: ReactNode }[];
  value: T | undefined;
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex flex-col gap-2.5"
      onKeyDown={radioKeys(options.map((o) => o.value), value, onChange)}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          tabIndex={tabIndexFor(options.map((o) => o.value), value, option.value)}
          className="wz-card"
          onClick={() => onChange(option.value)}
        >
          {option.icon}
          <div>
            <b>{option.title}</b>
            {option.description ? <span>{option.description}</span> : null}
          </div>
        </button>
      ))}
    </div>
  );
}

// Segmentado de selección única (días, minutos, Sí/No). Ninguna opción viene marcada por defecto.
export function Segmented<T extends string | number | boolean>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; text: string }[];
  value: T | undefined;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="wz-seg" onKeyDown={radioKeys(options.map((o) => o.value), value, onChange)}>
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          tabIndex={tabIndexFor(options.map((o) => o.value), value, option.value)}
          onClick={() => onChange(option.value)}
        >
          {option.text}
        </button>
      ))}
    </div>
  );
}

export function Chip({ pressed, onToggle, children }: { pressed: boolean; onToggle: () => void; children: ReactNode }) {
  return (
    <button type="button" className="wz-chip" aria-pressed={pressed} onClick={onToggle}>
      {children}
    </button>
  );
}

export function Note({
  tone = "info",
  role,
  children,
}: {
  tone?: "info" | "ok" | "warn" | "danger";
  role?: "status" | "alert";
  children: ReactNode;
}) {
  const icon = { info: "i", ok: "✓", warn: "!", danger: "!" }[tone];
  return (
    <div className="wz-note" data-tone={tone} role={role}>
      <span className="wz-note-icon" aria-hidden="true">
        {icon}
      </span>
      <div>{children}</div>
    </div>
  );
}

export function Field({
  id,
  label,
  error,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; error?: string; hint?: ReactNode }) {
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-[15px] font-bold">
        {label}
      </label>
      <input id={id} className="wz-input" aria-invalid={error ? true : undefined} aria-describedby={error ? errorId : undefined} {...props} />
      {hint}
      {error ? (
        <p id={errorId} className="wz-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Question({ children }: { children: ReactNode }) {
  return <h2 className="m-0 text-xl font-extrabold leading-tight">{children}</h2>;
}

// Iconos propios de trazo de 2,5 px (DESIGN.md §6), del prototipo.
export function Icon({ d }: { d: string }) {
  return (
    <svg className="wz-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
