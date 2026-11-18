// Sesión del día, calibración y fin de sesión: sin barra de pestañas, en una columna de 480 px sobre
// el fondo morado con trama en pantallas anchas (DESIGN.md §5; plan.md U7).
export default function SessionLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="wz-frame">
      <div className="wz-column">{children}</div>
    </div>
  );
}
