// ==================== IMPORTACIONES ====================
require('dotenv').config();
const { Telegraf } = require('telegraf');
const express = require('express');
const Portero = require('./core/portero');

// ==================== CONFIGURACION ====================
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

const PORTERO_TOKEN = process.env.PORTERO_TOKEN;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const BIBLIOTECARIO_TOKEN = process.env.BIBLIOTECARIO_TOKEN;
const DIRECTOR_CHAT_ID = process.env.DIRECTOR_CHAT_ID;
const RENDER_URL = process.env.RENDER_URL;

if (!PORTERO_TOKEN) {
    console.error('[CONFIG] FALTA PORTERO_TOKEN en variables de entorno.');
    process.exit(1);
}

console.log('========================================');
console.log('[CONFIG] Entorno:', IS_PRODUCTION ? 'PRODUCCIÓN' : 'DESARROLLO');
console.log('[CONFIG] Puerto:', PORT);
console.log('[CONFIG] Director ID:', DIRECTOR_CHAT_ID || 'NO CONFIGURADO');
console.log('[CONFIG] Tokens configurados:');
console.log('  - Portero:', PORTERO_TOKEN ? 'SÍ' : 'NO');
console.log('  - Admin:', ADMIN_TOKEN ? 'SÍ' : 'NO');
console.log('  - Bibliotecario:', BIBLIOTECARIO_TOKEN ? 'SÍ' : 'NO');
console.log('[CONFIG] Render URL:', RENDER_URL || 'NO CONFIGURADA');
console.log('========================================');

// ==================== INICIALIZACION_EXPRESS ====================
const app = express();

// Health check — Render y UptimeRobot lo usan para saber si el servicio está vivo
app.get('/health', (req, res) => {
    const healthData = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        modulos: Object.keys(portero.modulos),
        uptime: process.uptime()
    };
    res.json(healthData);
});

// ==================== INICIALIZACION_PORTERO ====================
const tokens = {
    portero: PORTERO_TOKEN,
    administrador: ADMIN_TOKEN,
    bibliotecario: BIBLIOTECARIO_TOKEN
};

const portero = new Portero(tokens, DIRECTOR_CHAT_ID);

// ==================== INICIALIZACION_BOT ====================
const bot = new Telegraf(PORTERO_TOKEN);

// ==================== HANDLER_MENSAJES ====================
bot.on('message', async (ctx) => {
    const msg = ctx.message;
    if (msg.edit_date) return; // ignorar mensajes editados

    console.log(`[Index] Mensaje de ${msg.from?.username || msg.from?.first_name} (${msg.from?.id}) en chat ${msg.chat.id}: "${msg.text?.substring(0, 80)}"`);
    await portero.procesarMensaje(msg, ctx);
});

// ==================== HANDLER_CALLBACK_QUERY ====================
bot.on('callback_query', async (ctx) => {
    console.log(`[Index] Callback query de ${ctx.from?.username || ctx.from?.first_name}: ${ctx.callbackQuery?.data}`);
    try {
        await ctx.answerCbQuery();
    } catch (error) {
        console.error('[Index] Error en callback query:', error.message);
    }
});

// ==================== MANEJADOR_ERRORES ====================
bot.catch(async (err, ctx) => {
    console.error('[Index] Error de Telegraf:', err.message);
    if (portero && DIRECTOR_CHAT_ID) {
        await portero.avisarDirector(
            'Error en Bot Principal (Portero)',
            `Error: ${err.message}\nStack: ${err.stack?.substring(0, 200)}`
        );
    }
});

// ==================== MODO_PRODUCCION_WEBHOOK ====================
async function iniciarProduccion() {
    console.log('[Index] Configurando webhook para producción...');

    const webhookUrl = `${RENDER_URL}/webhook`;

    try {
        await bot.telegram.setWebhook(webhookUrl, {
            drop_pending_updates: true
        });
        console.log(`[Index] Webhook configurado: ${webhookUrl}`);

        // Express maneja la ruta del webhook
        app.use(await bot.createWebhook({ domain: RENDER_URL }));

        // Iniciar Express
        app.listen(PORT, () => {
            console.log(`[Index] Servidor Express escuchando en puerto ${PORT}`);
            console.log('[Index] Portero listo en MODO PRODUCCIÓN (webhook)');
            console.log('========================================');
        });

        // Avisar al Director que el Portero arrancó
        if (DIRECTOR_CHAT_ID) {
            await portero.avisarDirector(
                'Portero iniciado',
                `Modo: Producción (webhook)\nURL: ${RENDER_URL}\nHealth: ${RENDER_URL}/health`
            );
        }
    } catch (error) {
        console.error('[Index] Error al configurar webhook:', error.message);
        process.exit(1);
    }
}

// ==================== MODO_DESARROLLO_POLLING ====================
async function iniciarDesarrollo() {
    console.log('[Index] Iniciando polling para desarrollo local...');

    try {
        // Eliminar webhook previo
        await bot.telegram.deleteWebhook({ drop_pending_updates: true });
        console.log('[Index] Webhook previo eliminado.');

        // Iniciar Express para /health
        app.listen(PORT, () => {
            console.log(`[Index] Servidor Express escuchando en puerto ${PORT}`);
        });

        // Iniciar polling
        await bot.launch();
        console.log('[Index] Portero listo en MODO DESARROLLO (polling)');
        console.log('========================================');

        if (DIRECTOR_CHAT_ID) {
            await portero.avisarDirector(
                'Portero iniciado',
                'Modo: Desarrollo (polling)'
            );
        }
    } catch (error) {
        console.error('[Index] Error al iniciar polling:', error.message);
        process.exit(1);
    }
}

// ==================== ARRANQUE ====================
(async () => {
    if (IS_PRODUCTION) {
        await iniciarProduccion();
    } else {
        await iniciarDesarrollo();
    }
})();

// ==================== CIERRE_GRACEFUL ====================
process.once('SIGINT', () => {
    console.log('[Index] Recibido SIGINT. Cerrando...');
    bot.stop('SIGINT');
});
process.once('SIGTERM', () => {
    console.log('[Index] Recibido SIGTERM. Cerrando...');
    bot.stop('SIGTERM');
});