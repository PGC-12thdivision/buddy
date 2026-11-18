// Plantillas de los 3 emails (PRD sección 15; DESIGN.md §9). Funciones puras: reciben solo la URL
// de la app y devuelven asunto, HTML con estilos en línea y texto plano.
// Reglas: columna de 600 px, marcador morado con el logotipo y la franja, Arial, un único botón
// limón con tinta, una sola acción por email y nunca datos de salud (ni limitaciones, ni molestias,
// ni respuestas del cribado). Tampoco llevan el email ni ningún otro dato del usuario.

export type RenderedEmail = { subject: string; html: string; text: string };

const INK = "#1A0F24";
const PAPER = "#FFF8E1";
const BOARD = "#3D1A5E";
const LEMON = "#FFE03A";
const MAGENTA = "#FF5FA2";
const TEAL = "#2ED3C1";
const MUTED = "#6B5E7B";
const FONT = "Arial, Helvetica, sans-serif";

const DISCLAIMER = "BUDDY no es consejo médico. Si tienes dudas sobre tu salud, consulta con un profesional.";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// La franja de 8 px: bloques de 40 px en limón, magenta y turquesa (DESIGN.md §2).
function stripe(): string {
  const colors = [LEMON, MAGENTA, TEAL];
  const cells = Array.from({ length: 15 }, (_, i) => `<td width="40" height="8" style="width:40px;height:8px;line-height:8px;font-size:0;background:${colors[i % 3]};">&nbsp;</td>`);
  return `<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;border-collapse:collapse;"><tr>${cells.join("")}</tr></table>`;
}

type Layout = { preheader: string; title: string; paragraphs: string[]; cta: string; url: string; footer: string };

function layout({ preheader, title, paragraphs, cta, url, footer }: Layout): string {
  const href = escapeHtml(url);
  const body = paragraphs
    .map((p) => `<p style="margin:0 0 16px;font-family:${FONT};font-size:16px;line-height:24px;color:${INK};">${escapeHtml(p)}</p>`)
    .join("");
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:${PAPER};">
<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAPER};">
<tr><td align="center" style="padding:24px 8px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;border:2px solid ${INK};background:${PAPER};">
<tr><td style="background:${BOARD};padding:24px 32px;">
<span style="font-family:'Arial Black',${FONT};font-size:32px;font-weight:900;font-style:italic;letter-spacing:1px;color:${LEMON};text-shadow:3px 3px 0 ${MAGENTA};">BUDDY</span>
</td></tr>
<tr><td style="padding:0;font-size:0;line-height:0;">${stripe()}</td></tr>
<tr><td style="padding:32px;">
<h1 style="margin:0 0 16px;font-family:${FONT};font-size:24px;line-height:30px;font-weight:900;text-transform:uppercase;color:${INK};">${escapeHtml(title)}</h1>
${body}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 0;"><tr>
<td style="background:${LEMON};border:2px solid ${INK};border-radius:6px;">
<a href="${href}" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:16px;font-weight:700;color:${INK};text-decoration:none;">${escapeHtml(cta)}</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:16px 32px 24px;border-top:2px solid ${INK};">
<p style="margin:0 0 8px;font-family:${FONT};font-size:13px;line-height:20px;color:${MUTED};">${escapeHtml(footer)}</p>
<p style="margin:0;font-family:${FONT};font-size:13px;line-height:20px;color:${MUTED};">${escapeHtml(DISCLAIMER)}</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function plain({ title, paragraphs, cta, url, footer }: Layout): string {
  return [`BUDDY`, ``, title, ``, ...paragraphs.flatMap((p) => [p, ``]), `${cta}: ${url}`, ``, `--`, footer, DISCLAIMER].join("\n");
}

function render(subject: string, content: Layout): RenderedEmail {
  return { subject, html: layout(content), text: plain(content) };
}

const link = (appUrl: string, path: string) => `${appUrl.replace(/\/+$/, "")}${path}`;

export function welcomeEmail(appUrl: string): RenderedEmail {
  return render("Te damos la bienvenida a BUDDY", {
    preheader: "Tu cuenta está lista. Tu plan te espera.",
    title: "Ya estás dentro",
    paragraphs: [
      "Tu cuenta de BUDDY está confirmada.",
      "Cada día te diremos qué toca entrenar y con qué peso. Tú solo registras lo que haces.",
    ],
    cta: "Abrir BUDDY",
    url: link(appUrl, "/hoy"),
    footer: "Recibes este correo porque acabas de crear tu cuenta en BUDDY.",
  });
}

export const PRODUCT_NAME = "BUDDY Premium";

export function purchaseEmail(appUrl: string): RenderedEmail {
  return render(`Confirmación de compra: ${PRODUCT_NAME}`, {
    preheader: `Ya tienes ${PRODUCT_NAME}.`,
    title: `Ya tienes ${PRODUCT_NAME}`,
    paragraphs: [
      "Gracias por tu compra. Las funciones premium ya están activas en tu cuenta.",
      "Puedes ver o cancelar tu suscripción cuando quieras desde Ajustes.",
    ],
    cta: "Abrir BUDDY",
    url: link(appUrl, "/hoy"),
    footer: `Recibes este correo porque has contratado ${PRODUCT_NAME}.`,
  });
}

export function inactivityEmail(appUrl: string): RenderedEmail {
  return render("Tu próxima sesión te espera", {
    preheader: "Hace más de dos semanas que no registras una sesión.",
    title: "Volvemos cuando quieras",
    paragraphs: [
      "Hace más de dos semanas que no registras una sesión en BUDDY.",
      "Tu plan sigue ahí. Abre la app y te decimos qué toca hoy.",
    ],
    cta: "Ver la sesión de hoy",
    url: link(appUrl, "/hoy"),
    footer: "Recibes este correo porque tienes cuenta en BUDDY. Solo te escribimos una vez por cada parón.",
  });
}
