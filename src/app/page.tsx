// Página provisional de inicio: la bienvenida del wizard la sustituye en U4.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="flex flex-1 flex-col justify-center bg-accent px-6 py-10 text-accent-foreground">
        <span className="mb-5 self-start rounded-sm bg-primary px-2 py-1.5 font-pixel text-[11px] uppercase text-primary-foreground">
          Nivel 1
        </span>
        <h1
          className="font-display text-[clamp(46px,17vw,72px)] font-black uppercase italic leading-[0.9] text-primary [font-stretch:125%]"
          style={{ textShadow: "5px 5px 0 #ff5fa2" }}
        >
          Buddy
        </h1>
        <p className="mt-4 max-w-xs text-lg text-band-muted">
          Tu plan, hecho para ti y para tu gimnasio en 5 minutos. Y cada día, el peso que toca.
        </p>
      </section>
      <div
        aria-hidden="true"
        className="h-2 bg-[repeating-linear-gradient(90deg,#ffe03a_0_40px,#ff5fa2_40px_80px,#2ed3c1_80px_120px)]"
      />
    </main>
  );
}
