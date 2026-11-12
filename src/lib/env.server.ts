import "server-only";
import { parseServerEnv, requireServerVar, type OptionalServerVar } from "./env";

// Acceso a variables de servidor. Este módulo nunca puede llegar al cliente (R21).
export const serverEnv = () => parseServerEnv(process.env);

export const serverVar = (name: OptionalServerVar) => requireServerVar(process.env, name);
