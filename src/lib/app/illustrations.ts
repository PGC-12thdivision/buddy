// Dibujos de técnica (feedback de Pablo, 18/11): un maniquí de trazos por patrón de movimiento del
// catálogo, con la posición inicial en discontinuo y una flecha morada con la dirección del esfuerzo.
// Originales, sin fotos ni recursos de terceros. Datos puros: el componente los pinta en SVG con los
// tokens del tema (tinta, morado y limón de relleno; DESIGN.md §2 y §6).

export const VIEWBOX = { width: 120, height: 90 } as const;

type Point = readonly [number, number];

// Flecha recta (2 puntos) o curva cuadrática (inicio, control, fin). Con `both`, punta en los dos extremos.
export type Arrow = { points: readonly [Point, Point] | readonly [Point, Point, Point]; both?: boolean };

export type Illustration = {
  // Descripción del movimiento para lectores de pantalla (aria-label).
  label: string;
  // Equipo (banco, máquina, barra, suelo), en trazo suave.
  props?: readonly string[];
  // Posición inicial, en discontinuo.
  ghost?: readonly string[];
  // Cuerpo en la posición final: trazos y cabeza.
  body: readonly string[];
  head: Point;
  // Carga (mancuerna, disco o almohadilla): relleno limón con borde de tinta.
  loads?: readonly Point[];
  arrows: readonly Arrow[];
};

const HEAD_LENGTH = 6;
const HEAD_ANGLE = (28 * Math.PI) / 180;
const round = (n: number) => Math.round(n * 10) / 10;

// Punta de flecha en `tip`, orientada desde `from`: dos alas de HEAD_LENGTH.
function head(from: Point, tip: Point): string {
  const angle = Math.atan2(tip[1] - from[1], tip[0] - from[0]);
  const wing = (sign: number): Point => [
    round(tip[0] - HEAD_LENGTH * Math.cos(angle + sign * HEAD_ANGLE)),
    round(tip[1] - HEAD_LENGTH * Math.sin(angle + sign * HEAD_ANGLE)),
  ];
  const [a, b] = [wing(1), wing(-1)];
  return `M${a[0]} ${a[1]}L${tip[0]} ${tip[1]}L${b[0]} ${b[1]}`;
}

// Trazo de la flecha y sus puntas. En las curvas, la punta sigue la tangente (la del punto de control).
export function arrowPaths(arrow: Arrow): { line: string; heads: string[] } {
  const p = arrow.points;
  const start = p[0];
  const end = p[p.length - 1];
  const line = p.length === 3 ? `M${start[0]} ${start[1]}Q${p[1][0]} ${p[1][1]} ${end[0]} ${end[1]}` : `M${start[0]} ${start[1]}L${end[0]} ${end[1]}`;
  const beforeEnd = p.length === 3 ? p[1] : start;
  const afterStart = p.length === 3 ? p[1] : end;
  const heads = [head(beforeEnd, end)];
  if (arrow.both) heads.push(head(afterStart, start));
  return { line, heads };
}

const FLOOR = "M8 84H112";
// Banco plano de lado.
const BENCH = "M16 62H80M26 62V84M70 62V84";

// Un dibujo por patrón de movimiento del catálogo (supabase/migrations/*catalogo*.sql).
export const ILLUSTRATIONS = {
  empuje_horizontal: {
    label: "Press horizontal: tumbado en el banco, empuja el peso hacia arriba hasta estirar los brazos y bájalo controlado al pecho.",
    props: [BENCH, FLOOR],
    ghost: ["M44 56L54 60L48 44"],
    body: ["M32 56H72", "M72 56L88 46L94 84", "M44 56V40V24"],
    head: [24, 54],
    loads: [[44, 21]],
    arrows: [{ points: [[62, 44], [62, 18]] }],
  },
  empuje_vertical: {
    label: "Press vertical: empuja el peso desde los hombros hacia arriba, por encima de la cabeza, sin arquear la espalda.",
    props: [FLOOR],
    ghost: ["M58 30L70 40L70 28"],
    body: ["M56 27L58 58", "M58 58L52 84", "M58 58L64 84", "M58 30L65 17L65 5"],
    head: [52, 21],
    loads: [[65, 6]],
    arrows: [{ points: [[82, 36], [82, 10]] }],
  },
  traccion_vertical: {
    label: "Jalón: sentado, tira de la barra desde arriba hacia la parte alta del pecho, con los codos hacia abajo.",
    props: ["M30 6H90", "M66 6V12", "M42 64H74M58 64V84", FLOOR],
    ghost: ["M58 36L64 22L66 12"],
    body: ["M56 33L60 62", "M60 62L80 60L82 84", "M58 36L50 48L62 36"],
    head: [52, 27],
    loads: [[62, 34]],
    arrows: [{ points: [[38, 10], [38, 38]] }],
  },
  traccion_horizontal: {
    label: "Remo: sentado con la espalda recta, tira del agarre hacia el abdomen llevando los codos atrás y junta las escápulas.",
    props: ["M30 66H50M40 66V84", "M92 52V76", "M106 48L50 48", FLOOR],
    ghost: ["M44 38L60 44L74 48"],
    body: ["M42 34L40 64", "M40 64L64 58L90 64", "M44 38L32 48L50 48"],
    head: [43, 27],
    loads: [[52, 48]],
    arrows: [{ points: [[84, 30], [56, 30]] }],
  },
  pullover: {
    label: "Pullover: tumbado, baja el peso por detrás de la cabeza con los brazos casi rectos y llévalo en arco hasta encima del pecho.",
    props: [BENCH, FLOOR],
    ghost: ["M38 56L14 46"],
    body: ["M32 56H72", "M72 56L88 46L94 84", "M38 56L44 30"],
    head: [24, 54],
    loads: [[44, 27]],
    arrows: [{ points: [[12, 36], [18, 16], [38, 18]] }],
  },
  fondos: {
    label: "Fondos: con las manos en las barras, baja doblando los codos y empuja hasta estirar los brazos.",
    props: ["M48 46H84M78 46V84", FLOOR],
    ghost: ["M58 37L46 42L60 46"],
    body: ["M58 21V50", "M58 50L52 66L42 72", "M58 25L60 46"],
    head: [58, 14],
    arrows: [{ points: [[94, 52], [94, 24]] }],
  },
  aperturas: {
    label: "Aperturas, visto desde arriba: con los brazos abiertos y los codos algo doblados, junta las manos delante del pecho en arco.",
    ghost: ["M44 52L26 46L10 50", "M76 52L94 46L110 50"],
    body: ["M44 52H76", "M44 52L50 34L58 24", "M76 52L70 34L62 24"],
    head: [60, 56],
    loads: [[58, 22], [62, 22]],
    arrows: [{ points: [[12, 40], [18, 22], [40, 18]] }, { points: [[108, 40], [102, 22], [80, 18]] }],
  },
  aperturas_inversas: {
    label: "Aperturas inversas, visto desde arriba: con los brazos delante, ábrelos en arco hacia atrás y junta las escápulas.",
    ghost: ["M44 52L50 34L58 24", "M76 52L70 34L62 24"],
    body: ["M44 52H76", "M44 52L26 46L10 50", "M76 52L94 46L110 50"],
    head: [60, 56],
    loads: [[10, 50], [110, 50]],
    arrows: [{ points: [[40, 18], [18, 22], [12, 38]] }, { points: [[80, 18], [102, 22], [108, 38]] }],
  },
  elevacion_lateral: {
    label: "Elevación lateral, de frente: sube los brazos hacia los lados hasta la altura de los hombros, con los codos algo doblados.",
    props: [FLOOR],
    ghost: ["M52 25L48 52", "M68 25L72 52"],
    body: ["M60 21V52", "M52 25H68", "M60 52L52 84", "M60 52L68 84", "M52 25L30 28", "M68 25L90 28"],
    head: [60, 14],
    loads: [[28, 28], [92, 28]],
    arrows: [{ points: [[42, 58], [26, 52], [24, 38]] }, { points: [[78, 58], [94, 52], [96, 38]] }],
  },
  elevacion_frontal: {
    label: "Elevación frontal: con el brazo casi recto, sube el peso por delante hasta la altura de los hombros.",
    props: [FLOOR],
    ghost: ["M56 25L60 54"],
    body: ["M56 21V54", "M56 54L50 84", "M56 54L62 84", "M56 25L86 26"],
    head: [56, 14],
    loads: [[88, 26]],
    arrows: [{ points: [[72, 62], [94, 56], [96, 38]] }],
  },
  flexion_codo: {
    label: "Curl de bíceps: con el codo pegado al cuerpo, sube el peso doblando el codo y bájalo despacio.",
    props: [FLOOR],
    ghost: ["M52 44L56 62"],
    body: ["M50 21V54", "M50 54L44 84", "M50 54L56 84", "M50 25L52 44L66 30"],
    head: [50, 14],
    loads: [[68, 28]],
    arrows: [{ points: [[66, 64], [84, 54], [80, 34]] }],
  },
  extension_codo: {
    label: "Extensión de tríceps: con el codo quieto junto al cuerpo, estira el brazo hacia abajo y vuelve despacio.",
    props: ["M74 4V12", FLOOR],
    ghost: ["M54 42L68 30"],
    body: ["M50 21V54", "M50 54L44 84", "M50 54L56 84", "M50 25L54 42L58 62", "M74 12L58 62"],
    head: [50, 14],
    loads: [[58, 63]],
    arrows: [{ points: [[78, 32], [84, 52], [70, 66]] }],
  },
  flexion_muneca: {
    label: "Curl de muñeca: con el antebrazo apoyado, sube el peso doblando solo la muñeca.",
    props: ["M14 56H74M24 56V84M64 56V84", FLOOR],
    ghost: ["M70 50L84 58"],
    body: ["M26 50H70", "M70 50L82 40"],
    head: [16, 44],
    loads: [[84, 38]],
    arrows: [{ points: [[94, 62], [102, 50], [94, 36]] }],
  },
  sentadilla: {
    label: "Sentadilla: baja llevando la cadera atrás y las rodillas en la línea de los pies, con la espalda recta, y sube empujando el suelo.",
    props: [FLOOR],
    ghost: ["M56 84L60 66L56 50L56 22"],
    body: ["M56 84L72 66L48 62L58 36", "M58 40L70 48L68 40"],
    head: [60, 29],
    loads: [[69, 38]],
    arrows: [{ points: [[94, 26], [94, 66]], both: true }],
  },
  zancada: {
    label: "Zancada: da un paso y baja hasta que las dos rodillas queden dobladas en ángulo recto; sube empujando con la pierna de delante.",
    props: [FLOOR],
    ghost: ["M58 48V20"],
    body: ["M58 62L78 64L78 84", "M58 62L48 80L32 84", "M58 62V34", "M58 38L62 52L62 62"],
    head: [58, 27],
    loads: [[62, 66]],
    arrows: [{ points: [[98, 30], [98, 62]], both: true }],
  },
  bisagra: {
    label: "Bisagra de cadera: con la espalda recta, lleva la cadera atrás bajando el peso pegado a las piernas y sube estirando la cadera.",
    props: [FLOOR],
    ghost: ["M56 52L58 24"],
    body: ["M58 84L62 66L46 52", "M46 52L74 40", "M72 41L72 56L72 66"],
    head: [81, 38],
    loads: [[72, 70]],
    arrows: [{ points: [[94, 46], [96, 22], [74, 16]] }],
  },
  puente_cadera: {
    label: "Hip thrust: con la espalda alta apoyada, sube la cadera apretando los glúteos hasta alinear tronco y muslos.",
    props: ["M10 56H32M20 56V84", FLOOR],
    ghost: ["M28 52L54 70L78 54"],
    body: ["M28 52L58 46", "M58 46L78 52L80 84"],
    head: [20, 46],
    loads: [[58, 40]],
    arrows: [{ points: [[42, 80], [42, 56]] }],
  },
  extension_cadera: {
    label: "Patada de glúteo: apoyado en la máquina, lleva la pierna hacia atrás estirando la cadera, sin arquear la espalda.",
    props: ["M84 30V84", FLOOR],
    ghost: ["M58 52L64 68L58 84"],
    body: ["M58 52L80 32", "M78 34L84 44", "M58 52L60 84", "M58 52L40 58L24 56"],
    head: [86, 26],
    loads: [[22, 56]],
    arrows: [{ points: [[54, 76], [34, 80], [24, 66]] }],
  },
  flexion_rodilla: {
    label: "Curl femoral: tumbado boca abajo, lleva los talones hacia los glúteos doblando las rodillas y baja despacio.",
    props: ["M10 62H96M22 62V84M84 62V84", FLOOR],
    ghost: ["M82 56L104 56"],
    body: ["M22 56H60", "M60 56H82", "M82 56L72 36"],
    head: [15, 52],
    loads: [[71, 33]],
    arrows: [{ points: [[108, 46], [104, 24], [84, 22]] }],
  },
  extension_rodilla: {
    label: "Extensión de cuádriceps: sentado, estira las rodillas subiendo la almohadilla y bájala despacio.",
    props: ["M30 58H64M34 58V84M30 58L26 22", FLOOR],
    ghost: ["M64 54L66 80"],
    body: ["M38 28L40 54", "M40 54H64", "M64 54L90 48", "M40 32L52 44L60 50"],
    head: [37, 21],
    loads: [[92, 48]],
    arrows: [{ points: [[76, 82], [96, 78], [98, 60]] }],
  },
  gemelo: {
    label: "Gemelo: sube sobre las puntas de los pies lo más alto que puedas y baja el talón despacio.",
    props: ["M48 78H84V84H48Z", FLOOR],
    ghost: ["M56 78H68"],
    body: ["M68 78L58 72L58 54L58 38", "M58 38V16", "M58 20L62 30L62 40"],
    head: [58, 9],
    arrows: [{ points: [[80, 70], [80, 46]] }],
  },
  abduccion_cadera: {
    label: "Abducción de cadera, de frente: separa la pierna hacia el lado sin inclinar el tronco y vuelve despacio.",
    props: [FLOOR],
    ghost: ["M64 52L64 84"],
    body: ["M60 21V52", "M52 25H68", "M56 52H64", "M56 52V84", "M64 52L84 80", "M52 25L48 52", "M68 25L72 52"],
    head: [60, 14],
    loads: [[82, 76]],
    arrows: [{ points: [[70, 70], [80, 72], [90, 64]] }],
  },
  aduccion_cadera: {
    label: "Aducción de cadera, de frente: con la pierna separada, júntala hacia la otra controlando el movimiento.",
    props: [FLOOR],
    ghost: ["M64 52L84 80"],
    body: ["M60 21V52", "M52 25H68", "M56 52H64", "M56 52V84", "M64 52L66 84", "M52 25L48 52", "M68 25L72 52"],
    head: [60, 14],
    loads: [[68, 76]],
    arrows: [{ points: [[94, 66], [86, 76], [74, 70]] }],
  },
  flexion_cadera: {
    label: "Elevación de piernas: colgado o tumbado, sube las rodillas hacia el pecho sin balancearte y baja despacio.",
    props: ["M40 6H80"],
    ghost: ["M60 54L60 84"],
    body: ["M60 6V24", "M60 26V54", "M60 54L78 52L78 70"],
    head: [65, 22],
    arrows: [{ points: [[68, 84], [90, 80], [90, 60]] }],
  },
  flexion_tronco: {
    label: "Crunch: tumbado, enrolla la parte alta de la espalda acercando las costillas a la cadera y baja despacio.",
    props: ["M8 82H112"],
    ghost: ["M60 78L22 78"],
    body: ["M60 78L76 60L90 80", "M60 78L44 72L36 62", "M40 66L48 56"],
    head: [31, 56],
    arrows: [{ points: [[14, 70], [14, 50], [26, 42]] }],
  },
  antiextension: {
    label: "Bicho muerto: tumbado boca arriba con la zona lumbar pegada al suelo, estira a la vez el brazo y la pierna contrarios y vuelve.",
    props: ["M8 82H112"],
    ghost: ["M64 76L72 58L86 58"],
    body: ["M26 76H64", "M64 76L104 72", "M34 76V50"],
    head: [18, 72],
    arrows: [{ points: [[90, 64], [104, 66]], both: true }],
  },
  antirrotacion: {
    label: "Press Pallof, visto desde arriba: de lado a la polea, empuja el agarre al frente sin dejar que el tronco gire y vuelve.",
    props: ["M110 24H60"],
    ghost: ["M46 50L58 40", "M74 50L62 40"],
    body: ["M46 50H74", "M46 50L58 24", "M74 50L62 24"],
    head: [60, 54],
    loads: [[60, 22]],
    arrows: [{ points: [[30, 44], [30, 18]], both: true }],
  },
  rotacion: {
    label: "Leñador, de frente: con los brazos estirados, lleva el agarre en diagonal desde arriba hasta el lado contrario girando el tronco.",
    props: ["M108 4L46 64", FLOOR],
    ghost: ["M52 25L86 12", "M68 25L86 12"],
    body: ["M60 21V52", "M52 25H68", "M60 52L52 84", "M60 52L68 84", "M52 25L44 62", "M68 25L44 62"],
    head: [60, 14],
    loads: [[44, 64]],
    arrows: [{ points: [[94, 24], [80, 54], [52, 74]] }],
  },
  flexion_lateral: {
    label: "Inclinación lateral, de frente: con el peso en una mano, inclina el tronco hacia ese lado sin girarlo y vuelve a la vertical.",
    props: [FLOOR],
    ghost: ["M60 52V20"],
    body: ["M60 52L48 24", "M42 30L58 22", "M60 52L54 84", "M60 52L66 84", "M42 30L36 58"],
    head: [44, 16],
    loads: [[36, 60]],
    arrows: [{ points: [[74, 24], [64, 10], [50, 6]] }],
  },
} satisfies Record<string, Illustration>;

export type IllustrationKey = keyof typeof ILLUSTRATIONS;

// Si llega un patrón nuevo sin dibujo, el de su región (todas las regiones del catálogo).
const BY_REGION: Record<string, IllustrationKey> = {
  empuje_superior_horizontal: "empuje_horizontal",
  empuje_superior_vertical: "empuje_vertical",
  traccion_superior_horizontal: "traccion_horizontal",
  traccion_superior_vertical: "traccion_vertical",
  empuje_inferior: "sentadilla",
  traccion_inferior: "bisagra",
  brazo: "flexion_codo",
  core: "flexion_tronco",
};

export function illustrationKey(pattern: string, region: string): IllustrationKey {
  if (Object.hasOwn(ILLUSTRATIONS, pattern)) return pattern as IllustrationKey;
  return BY_REGION[region] ?? "empuje_horizontal";
}
