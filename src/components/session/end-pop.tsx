"use client";

import { useEffect, useState } from "react";

// Pop de entrada del fin de sesión, una sola vez (diseño D7). Decorativo: su texto ya está en el
// marcador (aria-hidden). Va sobre el titular, que dice lo mismo, para no tapar el resumen.
export function EndPop() {
  const [show, setShow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 1100);
    return () => clearTimeout(t);
  }, []);
  if (!show) return null;
  return (
    <div className="ss-pop" data-long="" data-end="" aria-hidden="true">
      <b>Sesión completada</b>
      Bien jugado
    </div>
  );
}
