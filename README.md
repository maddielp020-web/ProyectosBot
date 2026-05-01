# ProyectosBot — PergaminosAbiertos

Portero unificado de bots de Telegram para el ecosistema Pergaminos Abiertos.

## Arquitectura

```

ProyectosBot/
├── index.js              ← Punto de entrada (webhook/polling)
├── core/
│   └── portero.js        ← Enrutador de mensajes
└── modulos/
├── administrador/     ← Bot de moderación
└── bibliotecario/     ← Bot de búsqueda

```

## Principio: "Juntos pero no revueltos"

Todos los bots en un solo contenedor de Render (750h/mes). Cada bot en su carpeta independiente. Si un módulo falla, los demás siguen funcionando.

## Configuración

Crear archivo `.env` basado en `.env.example`: