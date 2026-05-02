// ==================== IMPORTACIONES ====================
require('dotenv').config();
const { Telegraf } = require('telegraf');
const express = require('express');
const Portero = require('./core/portero');
const moduloAdministrador = require('./modulos/administrador');

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

// ==================== INICIALIZACION_BOT ====================
const bot = new Telegraf(PORTERO_TOKEN);
const adminBot = new Telegraf(ADMIN_TOKEN);
const biblioBot = BIBLIOTECARIO_TOKEN ? new Telegraf(BIBLIOTECARIO_TOKEN) : null;

// Redirigir mensajes de adminBot al handler principal
adminBot.on('message', (ctx) => {
    // Pasar el ctx al handler del Portero como si fuera un mensaje normal
    bot.handleUpdate(ctx.update);
});

// Redirigir callbacks de adminBot al handler principal
adminBot.on('callback_query', (ctx) => {
    bot.handleUpdate(ctx.update);
});

// ==================== INICIALIZACION_PORTERO ====================
const tokens = {
    portero: PORTERO_TOKEN,
    administrador: ADMIN_TOKEN,
    bibliotecario: BIBLIOTECARIO_TOKEN
};

const portero = new Portero(tokens, DIRECTOR_CHAT_ID);
// Registrar módulo Administrador
portero.registrarModulo('administrador', moduloAdministrador);

// Registrar callbacks del módulo en el bot principal
if (moduloAdministrador.registrarCallbacks) {
    moduloAdministrador.registrarCallbacks(bot);
    console.log('[Index] Callbacks del Administrador registrados.');
}

// ==================== HEALTH ====================
app.get('/health', (req, res) => {
    const healthData = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        modulos: Object.keys(portero.modulos),
        uptime: process.uptime()
    };
    res.json(healthData);
});

// ==================== HANDLER_MENSAJES ====================
bot.on('message', async (ctx) => {
    const msg = ctx.message;
    if (msg.edit_date) return;
    const userId = msg.from?.id;
    const chatType = msg.chat?.type;

    console.log(`[Index] Mensaje de ${msg.from?.username || msg.from?.first_name} (${userId}) en chat ${msg.chat.id} (${chatType}): "${msg.text?.substring(0, 80)}"`);

    // ========== CHAT PRIVADO CON EL DIRECTOR (solo Portero) ==========
    const texto = msg.text || '';
    const esPortero = ctx.botInfo?.username === 'PorterosBot';
    
    if (chatType === 'private' && userId === parseInt(DIRECTOR_CHAT_ID) && esPortero) {
        
        // ========== /STATUS ==========
        if (texto.startsWith('/status')) {
            const estado = portero.obtenerEstado();
            const uptimeMin = Math.floor(process.uptime() / 60);
            const horas = Math.floor(uptimeMin / 60);
            const minutos = uptimeMin % 60;
            const erroresRecientes = portero.obtenerErrores(5);
            
            let mensaje = `📊 <b>INFORME DEL SISTEMA — Director</b>\n\n`;
            mensaje += `🕒 <b>Tiempo activo:</b> ${horas}h ${minutos}m\n\n`;
            mensaje += `<b>📦 Módulos:</b>\n`;
            
            for (const [nombre, datos] of Object.entries(estado)) {
                const icono = datos.estado === 'vivo' ? '✅' : datos.estado === 'caido' ? '🔴' : '⏳';
                const descripcion = datos.estado === 'vivo' ? 'Cargado y operativo' :
                                    datos.estado === 'caido' ? `Caído (${new Date(datos.desde).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })})` :
                                    'Pendiente de migración';
                mensaje += `   ${icono} <b>${nombre}:</b> ${descripcion}\n`;
            }
            
            mensaje += `\n⚠️ <b>Problemas detectados:</b> ${erroresRecientes.length > 0 ? erroresRecientes.length + ' en los últimos registros' : 'Ninguno'}`;
            
            if (erroresRecientes.length === 0) {
                mensaje += `\n\n✅ Todo funciona correctamente hasta el momento. No se han registrado errores en los módulos activos.\n\n🛡️ El Portero sigue vigilando.`;
            } else {
                mensaje += `\n\nUsa /errores para ver el detalle.`;
            }
            
            await ctx.reply(mensaje, { parse_mode: 'HTML' });
            return;
        }
        
        // ========== /ERRORES ==========
        if (texto.startsWith('/errores')) {
            const errores = portero.obtenerErrores(10);
            
            if (errores.length === 0) {
                await ctx.reply('✅ No se ha registrado ningún error hasta el momento.', { parse_mode: 'HTML' });
                return;
            }
            
            let mensaje = `⚠️ <b>ÚLTIMOS ERRORES REGISTRADOS</b>\n\n`;
            for (const e of errores) {
                mensaje += `🕐 ${new Date(e.timestamp).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}\n`;
                mensaje += `   📦 Módulo: ${e.modulo}\n`;
                mensaje += `   ❌ Causa: ${e.causa}\n`;
                mensaje += `   👤 Usuario: ${e.usuario} (${e.userId})\n`;
                mensaje += `   💬 Mensaje: "${e.mensaje}"\n\n`;
            }
            
            await ctx.reply(mensaje, { parse_mode: 'HTML' });
            return;
        }
        
        // ========== /AYUDA ==========
        if (texto.startsWith('/ayuda')) {
            await ctx.reply(
                `🛡️ <b>COMANDOS DISPONIBLES — Director</b>\n\n` +
                `/status → Informe detallado del sistema\n` +
                `/errores → Ver últimos fallos registrados\n` +
                `/ayuda → Este mensaje\n\n` +
                `El Portero te avisará por privado si algún módulo pasa de vivo a caído, o viceversa.`,
                { parse_mode: 'HTML' }
            );
            return;
        }
        
        // ========== RESPUESTA POR DEFECTO EN PRIVADO ==========
        const estado = portero.obtenerEstado();
        const errores = portero.obtenerErrores(1);
        const ultimoError = errores.length > 0 ? errores[0] : null;
        
        let mensaje = `🛡️ <b>Portero activo, Director.</b>\n\n`;
        mensaje += `<b>Estado actual:</b>\n`;
        
        for (const [nombre, datos] of Object.entries(estado)) {
            const icono = datos.estado === 'vivo' ? '✅' : datos.estado === 'caido' ? '🔴' : '⏳';
            const descripcion = datos.estado === 'vivo' ? 'Funcionando (módulo cargado)' :
                                datos.estado === 'caido' ? 'Caído' :
                                'Pendiente de migración';
            mensaje += `   • ${icono} <b>${nombre}:</b> ${descripcion}\n`;
        }
        
        mensaje += `\n<b>Errores detectados:</b> `;
        if (ultimoError) {
            mensaje += `${errores.length} registrado(s). Último: ${new Date(ultimoError.timestamp).toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}`;
        } else {
            mensaje += `Ninguno hasta ahora`;
        }
        
        mensaje += `\n\n<b>Comandos disponibles:</b>\n`;
        mensaje += `/status → Informe detallado del sistema\n`;
        mensaje += `/errores → Ver últimos fallos registrados\n`;
        mensaje += `/ayuda → Recordatorio de comandos\n\n`;
        mensaje += `¿En qué puedo ayudarte?`;
        
        await ctx.reply(mensaje, { parse_mode: 'HTML' });
        return;
    }

    // ========== RESTO DE MENSAJES: ENRUTAR A MÓDULOS ==========
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
// NOTA: El webhook se configura MANUALMENTE una sola vez.
// Ver instrucciones en README.md o al final de este archivo.
// Aquí solo se levanta el servidor y se monta el middleware de Telegraf.

async function iniciarProduccion() {
    console.log('[Index] Modo PRODUCCIÓN activo.');
    console.log('[Index] El webhook DEBE configurarse manualmente (ver README.md).');

    try {
        // Montar middleware de Telegraf en Express — esto expone POST /webhook
        app.use(await bot.createWebhook({ domain: RENDER_URL }));
        app.use(await adminBot.createWebhook({ domain: RENDER_URL }));
        if (biblioBot) {
    app.use(await biblioBot.createWebhook({ domain: RENDER_URL }));
}

        // Iniciar Express
        app.listen(PORT, () => {
            console.log(`[Index] Servidor Express escuchando en puerto ${PORT}`);
            console.log(`[Index] Endpoint /webhook listo para recibir mensajes.`);
            console.log(`[Index] Health: ${RENDER_URL}/health`);
            console.log('========================================');
        });

        // Avisar al Director
        if (DIRECTOR_CHAT_ID) {
            await portero.avisarDirector(
                'Portero iniciado',
                `Modo: Producción (webhook manual)\nURL: ${RENDER_URL}\nHealth: ${RENDER_URL}/health\n\nRecordatorio: si el webhook no está configurado, configura:\nhttps://api.telegram.org/bot[TOKEN]/setWebhook?url=${RENDER_URL}/webhook`
            );
        }
    } catch (error) {
        console.error('[Index] Error al iniciar producción:', error.message);
        process.exit(1);
    }
}

// ==================== MODO_DESARROLLO_POLLING ====================
async function iniciarDesarrollo() {
    console.log('[Index] Iniciando polling para desarrollo local...');

    try {
        // Eliminar webhook previo para que el polling funcione
        await bot.telegram.deleteWebhook({ drop_pending_updates: true });
        console.log('[Index] Webhook previo eliminado.');

        // Iniciar Express para /health
        app.listen(PORT, () => {
            console.log(`[Index] Servidor Express escuchando en puerto ${PORT}`);
        });

        // Iniciar polling
        await bot.launch();
        console.log('[Index] Portero listo en MODO DESARROLLO (polling)');
        console.log('[Index] Envía un mensaje a @PorterosBot para probar');
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