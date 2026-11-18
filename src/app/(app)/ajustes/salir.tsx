"use client";

import { useRouter } from "next/navigation";
import { salir } from "@/app/(wizard)/actions";
import { TextButton } from "@/components/wizard/ui";

export function SalirButton() {
  const router = useRouter();
  return (
    <TextButton
      onClick={async () => {
        await salir();
        router.refresh();
        router.push("/");
      }}
    >
      Cerrar sesión
    </TextButton>
  );
}
