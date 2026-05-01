# ProyectosBot — PergaminosAbiertos

Portero unificado de bots de Telegram para el ecosistema Pergaminos Abiertos.

## Arquitectura

```

ProyectosBot/
├── index.js              ← Punto de entrada
├── core/
│   └── portero.js        ← Enrutador de mensajes
└── modulos/
├── administrador/
└── bibliotecario/

```

## Principio: "Juntos pero no revueltos"

Todos los bots en un solo contenedor de Render (750h/mes). Cada bot en su carpeta independiente. Si un módulo falla, los demás siguen funcionando.

## Configuración

Crear archivo `.env` basado en `.env.example`:

```

PORTERO_TOKEN=...
ADMIN_TOKEN=...
BIBLIOTECARIO_TOKEN=...
DIRECTOR_CHAT_ID=...
RENDER_URL=https://proyectosbot.onrender.com
NODE_ENV=production

```

## Configuración del Webhook (MANUAL — Una sola vez)

Cuando el servicio está desplegado en Render, configurar el webhook con esta URL:

```

https://api.telegram.org/bot[PORTERO_TOKEN]/setWebhook?url=https://proyectosbot.onrender.com/webhook