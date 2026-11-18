import type { EquipmentType, Exercise } from "./types";

// Catálogo de prueba para los tests del dominio (no es el catálogo semilla de U2).

export const EQUIPMENT: EquipmentType[] = [
  { id: "rack_barra", incrementKg: 2.5, minKg: 20 },
  { id: "prensa_piernas", incrementKg: 5, minKg: 20 },
  { id: "extension_cuadriceps", incrementKg: 5, minKg: 5 },
  { id: "curl_femoral", incrementKg: 5, minKg: 5 },
  { id: "hip_thrust_maquina", incrementKg: 5, minKg: 10 },
  { id: "mancuernas", incrementKg: 2, minKg: 2 },
  { id: "press_pecho_maquina", incrementKg: 5, minKg: 5 },
  { id: "jalon", incrementKg: 5, minKg: 5 },
  { id: "polea_remo", incrementKg: 5, minKg: 5 },
  { id: "press_hombro_maquina", incrementKg: 5, minKg: 5 },
];

export const ALL_EQUIPMENT_IDS = EQUIPMENT.map((e) => e.id);

export const CATALOG: Exercise[] = [
  {
    id: "sentadilla_barra",
    equipmentTypeId: "rack_barra",
    pattern: "sentadilla",
    region: "empuje_inferior",
    muscleGroups: ["cuadriceps", "gluteos"],
    joints: ["rodilla", "cadera", "espalda_baja"],
    calibrationLoadKg: 20,
  },
  {
    id: "prensa",
    equipmentTypeId: "prensa_piernas",
    pattern: "sentadilla",
    region: "empuje_inferior",
    muscleGroups: ["cuadriceps", "gluteos"],
    joints: ["rodilla", "cadera"],
    calibrationLoadKg: 40,
  },
  {
    id: "extension_cuadriceps",
    equipmentTypeId: "extension_cuadriceps",
    pattern: "extension_rodilla",
    region: "empuje_inferior",
    muscleGroups: ["cuadriceps"],
    joints: ["rodilla"],
    calibrationLoadKg: 15,
  },
  {
    id: "peso_muerto_rumano",
    equipmentTypeId: "mancuernas",
    pattern: "bisagra",
    region: "traccion_inferior",
    muscleGroups: ["isquiotibiales", "gluteos"],
    joints: ["espalda_baja", "cadera"],
    calibrationLoadKg: 10,
  },
  {
    id: "hip_thrust",
    equipmentTypeId: "hip_thrust_maquina",
    pattern: "bisagra",
    region: "traccion_inferior",
    muscleGroups: ["gluteos", "isquiotibiales"],
    joints: ["cadera"],
    calibrationLoadKg: 20,
  },
  {
    id: "curl_femoral",
    equipmentTypeId: "curl_femoral",
    pattern: "flexion_rodilla",
    region: "traccion_inferior",
    muscleGroups: ["isquiotibiales"],
    joints: ["rodilla"],
    calibrationLoadKg: 15,
  },
  {
    id: "press_pecho_maquina",
    equipmentTypeId: "press_pecho_maquina",
    pattern: "empuje_horizontal",
    region: "empuje_superior_horizontal",
    muscleGroups: ["pecho"],
    joints: ["hombro", "codo"],
    calibrationLoadKg: 20,
  },
  {
    id: "press_banca_mancuernas",
    equipmentTypeId: "mancuernas",
    pattern: "empuje_horizontal",
    region: "empuje_superior_horizontal",
    muscleGroups: ["pecho"],
    joints: ["hombro", "codo", "muneca"],
    calibrationLoadKg: 8,
  },
  {
    id: "jalon_pecho",
    equipmentTypeId: "jalon",
    pattern: "traccion_vertical",
    region: "traccion_superior_vertical",
    muscleGroups: ["espalda"],
    joints: ["hombro", "codo"],
    calibrationLoadKg: 25,
  },
  {
    id: "remo_polea",
    equipmentTypeId: "polea_remo",
    pattern: "traccion_horizontal",
    region: "traccion_superior_horizontal",
    muscleGroups: ["espalda"],
    joints: ["hombro", "codo"],
    calibrationLoadKg: 25,
  },
  {
    id: "press_hombro_maquina",
    equipmentTypeId: "press_hombro_maquina",
    pattern: "empuje_vertical",
    region: "empuje_superior_vertical",
    muscleGroups: ["hombros"],
    joints: ["hombro", "codo"],
    calibrationLoadKg: 15,
  },
];

export const byId = (id: string): Exercise => {
  const exercise = CATALOG.find((e) => e.id === id);
  if (!exercise) throw new Error(`Ejercicio de prueba inexistente: ${id}`);
  return exercise;
};
