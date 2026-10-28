# BUDDY

Web app (móvil primero) para quien entrena por su cuenta en el gimnasio: un plan hecho con IA para tu foco, tu disponibilidad y las máquinas de tu gimnasio, y unas reglas que te dicen cada día qué peso toca.

> BUDDY no es consejo médico ni sustituye a un entrenador certificado.

Proyecto final del bootcamp Vibe Code Builder (No Code Hackers).

## Documentación
- [Contexto, criterios y decisiones](docs/01-contexto-y-criterios.md)
- [PRD v1](docs/02-prd-v1.md)
- [Stack, entornos y logística](docs/03-stack-y-logistica.md)

## Arranque local
Requisitos: Node 24.

```powershell
npm install
Copy-Item .env.example .env.local   # y rellena los valores
npm run dev
```

## Ramas
`feature/<tarea>` → PR a `staging` → PR a `main` (producción).
