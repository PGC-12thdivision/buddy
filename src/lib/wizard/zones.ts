import type { Joint } from "@/lib/domain/types";

// Textos de la UI para zonas del gimnasio y zonas de limitación (PRD §5, pantallas 6 y 8).

export const ZONE_LABELS: Record<string, string> = {
  pierna: "Pierna",
  espalda: "Espalda",
  pecho_hombro: "Pecho y hombro",
  brazo: "Brazo",
  core: "Core",
  peso_libre: "Peso libre",
  cardio: "Cardio",
};

export const JOINT_LABELS: Record<Joint, string> = {
  hombro: "Hombro",
  codo: "Codo",
  muneca: "Muñeca",
  cuello_espalda_alta: "Cuello o espalda alta",
  espalda_baja: "Espalda baja",
  cadera: "Cadera",
  rodilla: "Rodilla",
  tobillo: "Tobillo",
};
