import { redirect } from "next/navigation";
import { CtaLink, TextLink } from "@/components/wizard/ui";
import { StepView } from "@/components/wizard/wizard-provider";
import { createClient } from "@/lib/supabase/server";
import { accountProgress, sessionUserId } from "@/lib/wizard/account";
import { nextScreenForAccount } from "@/lib/wizard/progress";

// Pantalla 1: bienvenida con el aviso médico (guardarraíl 1; PRD §5).
export default async function Bienvenida() {
  const supabase = await createClient();
  const userId = await sessionUserId(supabase);
  if (userId) redirect(nextScreenForAccount(await accountProgress(supabase, userId)));

  return (
    <>
      <StepView step="bienvenida" />
      <header
        className="wz-band wz-pad relative flex flex-1 flex-col justify-center overflow-hidden py-10"
        aria-label="Marcador"
      >
        <span className="wz-tag mb-5 self-start">Nivel 1</span>
        <h1
          className="m-0 font-display text-[clamp(46px,17cqi,72px)] font-black uppercase italic leading-[0.9] text-primary [font-stretch:125%]"
          style={{ textShadow: "5px 5px 0 #ff5fa2" }}
        >
          Buddy
        </h1>
        <p className="mt-4 max-w-xs text-lg text-band-muted">
          Tu plan, hecho para ti y para tu gimnasio en 5 minutos. Y cada día, el peso que toca.
        </p>
      </header>
      <div className="wz-stripes" aria-hidden="true" />
      <main className="wz-foot wz-pad" aria-label="Empezar">
        <p className="m-0 text-xs text-muted-foreground">
          BUDDY no es consejo médico ni sustituye a un entrenador certificado. Tú respondes de la veracidad de tus respuestas.
        </p>
        <CtaLink href="/foco">Empezar</CtaLink>
        <TextLink href="/entrar">Ya tengo cuenta</TextLink>
      </main>
    </>
  );
}
