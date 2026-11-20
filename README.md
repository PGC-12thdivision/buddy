# BUDDY

Web app (móvil primero) para quien entrena por su cuenta en el gimnasio: un plan hecho con IA para tu foco, tu disponibilidad y las máquinas de tu gimnasio, y unas reglas que te dicen cada día qué peso toca.

> BUDDY no es consejo médico ni sustituye a un entrenador certificado.

Proyecto final del bootcamp Vibe Code Builder (No Code Hackers).

- **Producción:** https://buddy-xi-eight.vercel.app

## Documentación
Índice completo: **[docs/README.md](docs/README.md)**.

- [Documento de entrega](docs/entrega/entrega.md): accesos, alcance, costes y mantenimiento.
- [Guía de uso](docs/guia-de-uso.md): para quien usa la app.
- [Documentación técnica](docs/tecnica/README.md) y [base de datos](docs/tecnica/base-de-datos.md).
- [3 mejoras con Claude Code](docs/entrega/3-mejoras-claude-code.md).
- [PRD v1.1](docs/02-prd-v1.md), [plan de construcción](plan.md) y [DESIGN.md](DESIGN.md).

## Arranque local
Requisitos: Node 24. Paso a paso, variables y tests en la [documentación técnica](docs/tecnica/README.md).

```powershell
npm install
Copy-Item .env.example .env.local   # y rellena los valores
npm run dev
```

## Ramas
`feature/<tarea>` → PR a `staging` → PR a `main` (producción).
