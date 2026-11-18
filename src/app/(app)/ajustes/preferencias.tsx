"use client";

import { useState } from "react";
import { guardarPreferencias } from "@/app/actions/account";
import { Note, Segmented } from "@/components/wizard/ui";
import { applyTheme, type Theme } from "@/lib/theme";

// Preferencias (diseño D15, bloque 2): tema y contador de descanso. Se guardan al tocar.
export function Preferencias({ theme: initialTheme, showRestTimer: initialRest }: { theme: Theme; showRestTimer: boolean }) {
  const [theme, setTheme] = useState(initialTheme);
  const [rest, setRest] = useState(initialRest);
  const [error, setError] = useState(false);

  async function save(patch: { theme?: Theme; showRestTimer?: boolean }, undo: () => void) {
    setError(false);
    const result = await guardarPreferencias(patch);
    if (!result.ok) {
      undo();
      setError(true);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-2 border-b border-muted-foreground py-3">
        <span>Tema</span>
        <Segmented
          label="Tema"
          value={theme}
          onChange={(value) => {
            const previous = theme;
            setTheme(value);
            applyTheme(value);
            void save({ theme: value }, () => {
              setTheme(previous);
              applyTheme(previous);
            });
          }}
          options={[
            { value: "light", text: "Claro" },
            { value: "dark", text: "Oscuro" },
            { value: "system", text: "Sistema" },
          ]}
        />
      </div>
      <div className="flex flex-col gap-2 border-b border-muted-foreground py-3">
        <span>Contador de descanso</span>
        <Segmented
          label="Mostrar el contador de descanso"
          value={rest}
          onChange={(value) => {
            const previous = rest;
            setRest(value);
            void save({ showRestTimer: value }, () => setRest(previous));
          }}
          options={[
            { value: true, text: "Sí" },
            { value: false, text: "No" },
          ]}
        />
      </div>
      {error ? (
        <Note tone="danger" role="alert">
          No hemos podido guardar el cambio. Inténtalo de nuevo.
        </Note>
      ) : null}
    </>
  );
}
