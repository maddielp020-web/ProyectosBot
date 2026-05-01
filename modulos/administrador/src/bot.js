// ==================== IMPORTACIONES ====================
const { BOT_TOKEN, ADMIN_IDS, CREATEDOR_ID, GRUPO_URL } = require('./config');
const { filtrarMensaje: filtrarEnlaces } = require('./modules/disciplina/filtroEnlaces');
const { 
    filtrarMensajePorContenido, 
    contienePalabraParaAviso,
    contienePalabraProhibida,
    contieneEmojiProhibido
} = require('./modules/disciplina/palabrasProhibidas');
const { 
    iniciarFeedback, 
    registrarCallbacks: registrarCallbacksFeedback 
} = require('./modules/feedback/botonesFeedback');
const { 
    notificarContenidoProhibido, 
    notificarAvisoComando,
    notificarAvisoContenidoCreador,
    notificarAdminEnlaceProhibido,
    notificarInfraccion1,
    notificarInfraccion2,
    notificarInfraccion3Publico,
    notificarInfraccion3Privado,
    notificarInfraccion4Publico,
    notificarInfraccion4Privado,
    notificarCreadorSuspension,
    notificarCreadorExpulsion,
    notificarAvisoEnlaceCreadorNoOficial,
    construirEnlaceMensaje
} = require('./utils/notificaciones');
const { esAdminDelGrupo } = require('./utils/cacheAdmins');
const { puedeEnviarAviso } = require('./modules/disciplina/rateLimit');
const { 
    registrarInfraccion, 
    estaSuspendido 
} = require('./modules/disciplina/contadorInfracciones');

// ==================== CONFIGURACION ====================
console.log('[Admin:bot] Módulo Administrador cargado.');
console.log(`[Admin:bot] Creador: ${CREATEDOR_ID}`);
console.log(`[Admin:bot] Admins adicionales: ${ADMIN_IDS.filter(id => id !== CREATEDOR_ID).join(', ') || 'ninguno'}`);

// ==================== MENSAJE_REDIRECCION_PRIVADO ====================
const MENSAJE_REDIRECCION = `🛡️ El guardián levanta la vista.

Trabajo dentro del grupo PergaminosAbiertos. Allí escucho, guío y protejo el silencio de la biblioteca.

🏛️ Únete al grupo y escríbeme allí:
🔗 ${GRUPO_URL}

Allí también te espera el bibliotecario @PergaminosLibros_Bot para buscar los libros que deseas.

🕯️ El guardián siempre escucha.`;

// ==================== HELPERS ====================
function esComandoBot(mensaje) {
    if (!mensaje || !mensaje.entities) return false;
    return mensaje.entities.some(e => e.type === 'bot_command');
}

function esCreador(userId) {
    return userId === CREATEDOR_ID;
}

function esAdminSinFiltro(userId) {
    return ADMIN_IDS.includes(userId) && userId !== CREATEDOR_ID;
}

async function avisarYBorrar(telegram, chatId, texto) {
    try {
        const aviso = await telegram.sendMessage(chatId, texto);
        setTimeout(async () => {
            try {
                await telegram.deleteMessage(chatId, aviso.message_id);
            } catch (_) {
                // El mensaje pudo haber sido eliminado
            }
        }, 8000);
    } catch (_) {
        // No se pudo enviar el aviso
    }
}

// ==================== PROCESAR_COMANDO ====================
async function procesarComando(msg, bot) {
    const texto = msg.text || '';
    const chatType = msg.chat?.type;
    const userId = msg.from?.id;
    const chatId = msg.chat.id;

    // ========== /START ==========
    if (texto.startsWith('/start')) {
        // Solo responder en chat privado Y solo al creador
        if (chatType === 'private' && userId === CREATEDOR_ID) {
            await bot.telegram.sendMessage(
                chatId,
                '🛡️ <b>PergaminosAdmin_Bot</b>\n\n' +
                'Soy el guardián del grupo PergaminosAbiertos.\n\n' +
                '<b>Mis funciones:</b>\n' +
                '• Elimino enlaces no permitidos\n' +
                '• Elimino palabras y emojis prohibidos\n' +
                '• Recibo feedback sobre los resultados de búsqueda\n\n' +
                '<b>Comandos disponibles:</b>\n' +
                '/feedback — ¿Te fue útil la última búsqueda?\n' +
                '/ayuda — Ver esta ayuda\n' +
                '/reglas — Ver reglas del grupo\n' +
                '/compartir — Compartir el grupo',
                { parse_mode: 'HTML' }
            );
        }
        return true;
    }

    // ========== /AYUDA ==========
    if (texto.startsWith('/ayuda')) {
        await bot.telegram.sendMessage(
            chatId,
            '📘 <b>AYUDA — PergaminosAdmin_Bot</b>\n\n' +
            '<b>¿Qué hace este bot?</b>\n' +
            'Mantiene el orden en el grupo eliminando automáticamente:\n' +
            '• Enlaces a sitios no permitidos\n' +
            '• Palabras y emojis inapropiados\n\n' +
            '<b>Comandos para usuarios:</b>\n' +
            '/feedback — Indicar si el resultado de búsqueda fue útil\n\n' +
            '<b>¿Mi mensaje fue eliminado?</b>\n' +
            'Solo se permiten enlaces a: gutenberg.org, openlibrary.org y archive.org.',
            { parse_mode: 'HTML' }
        );
        return true;
    }

    // ========== /REGLAS ==========
    if (texto.startsWith('/reglas')) {
        await bot.telegram.sendMessage(
            chatId,
            '📜 <b>REGLAS DE PERGAMINOS ABIERTOS</b>\n\n' +
            '1. Respeta a todos los miembros del grupo.\n' +
            '2. No se permiten enlaces externos (salvo gutenberg.org, openlibrary.org, archive.org).\n' +
            '3. No se permiten palabras ofensivas, insultos ni emojis inapropiados.\n' +
            '4. Usa los comandos /autor y /titulo para buscar libros en dominio público.\n' +
            '5. Si algún resultado no te sirvió, usa /feedback para avisarnos.\n\n' +
            '🛡️ El guardián siempre escucha.',
            { parse_mode: 'HTML' }
        );
        return true;
    }

    // ========== /COMPARTIR ==========
    if (texto.startsWith('/compartir')) {
        await bot.telegram.sendMessage(
            chatId,
            `📚 <b>PERGAMINOS ABIERTOS</b>\n\n` +
            `Un grupo dedicado al dominio público.\n\n` +
            `🔗 Únete aquí: ${GRUPO_URL}\n\n` +
            `Comparte este enlace con quien quieras.`,
            { parse_mode: 'HTML' }
        );
        return true;
    }

    // ========== /FEEDBACK ==========
    if (texto.startsWith('/feedback')) {
        await iniciarFeedback(msg, bot);
        return true;
    }

    // Si llega aquí, el comando no fue reconocido por el Admin
    return false;
}

// ==================== PROCESAR_MENSAJE ====================
async function procesarMensaje(msg, bot) {
    const chatType = msg.chat?.type;

    // ========== CHAT PRIVADO ==========
    if (chatType === 'private') {
        const userId = msg.from?.id;

        // Si es el creador: procesar comandos normalmente
        if (userId === CREATEDOR_ID) {
            console.log(`[Admin:bot] Creador en privado - acceso permitido`);
            await procesarComando(msg, bot);
            return;
        }

        // Cualquier otro usuario: redirigir
        console.log(`[Admin:bot] Usuario ${userId} en privado - redirigido`);
        await bot.telegram.sendMessage(msg.chat.id, MENSAJE_REDIRECCION);
        return;
    }

    // ========== SOLO GRUPOS ==========
    if (chatType !== 'group' && chatType !== 'supergroup') {
        return;
    }

    const usuario = msg.from;
    const userId = usuario.id;
    const texto = msg.text || msg.caption || '';
    const chatId = msg.chat.id;
    const telegram = bot.telegram;

    // ========== VERIFICACIÓN DE ADMIN (SIN FILTRO) ==========
    if (esAdminSinFiltro(userId)) {
        await procesarComando(msg, bot);
        return;
    }

    // Verificar si es admin del grupo
    const esAdminGrupo = await esAdminDelGrupo(telegram, chatId, userId);
    if (esAdminGrupo && userId !== CREATEDOR_ID) {
        await procesarComando(msg, bot);
        return;
    }

    // ========== DETECCIÓN DE COMANDO ==========
    const esComando = esComandoBot(msg);
    const esComandoFeedback = texto.startsWith('/feedback');
    const esCreadorUsuario = esCreador(userId);

    // ========== CASO ESPECIAL: /feedback ==========
    if (esComandoFeedback) {
        await iniciarFeedback(msg, bot);
        return;
    }

    // ========== FILTRO DE ENLACES ==========
    const resultadoEnlaces = await filtrarEnlaces(msg, bot);
    if (resultadoEnlaces.eliminado) {
        const username = usuario.username || usuario.first_name;
        const enlaceMensaje = construirEnlaceMensaje(chatId, msg.message_id);
        const enlace = resultadoEnlaces.enlaces?.[0] || resultadoEnlaces.primerEnlace || 'enlace detectado';
        
        // ===== CASO 1: CREADOR CON ENLACE NO OFICIAL =====
        if (esCreadorUsuario && resultadoEnlaces.razon === 'enlace_no_oficial_creador') {
            await notificarAvisoEnlaceCreadorNoOficial(
                telegram,
                chatId,
                msg.message_id,
                usuario,
                resultadoEnlaces.enlaces
            );
            console.log(`[Admin:bot] Aviso al creador por enlace NO oficial - mensaje eliminado`);
            return;
        }
        
        // ===== CASO 2: ADMIN HUMANO (NO CREADOR) =====
        const esAdmin = await esAdminDelGrupo(telegram, chatId, userId);
        if (esAdmin && !esCreadorUsuario) {
            await notificarAdminEnlaceProhibido(
                telegram,
                userId,
                enlace,
                username
            );
            console.log(`[Admin:bot] Aviso a admin ${userId} por enlace no permitido`);
            return;
        }
        
        // ===== CASO 3: USUARIO NORMAL - SISTEMA DE INFRACCIONES =====
        if (!esAdmin && !esCreadorUsuario) {
            // Verificar si ya está suspendido
            if (estaSuspendido(userId)) {
                console.log(`[Admin:bot] Usuario ${userId} suspendido - mensaje eliminado`);
                return;
            }
            
            // Registrar infracción
            const resultado = registrarInfraccion(userId);
            const infracciones = resultado.infracciones;
            
            switch (infracciones) {
                case 1:
                    await notificarInfraccion1(telegram, chatId, username);
                    break;
                    
                case 2:
                    await notificarInfraccion2(telegram, chatId, username);
                    break;
                    
                case 3:
                    // Suspensión 12h
                    try {
                        await telegram.banChatMember(
                            chatId,
                            userId,
                            { until_date: Math.floor(Date.now() / 1000) + 12 * 60 * 60 }
                        );
                    } catch (error) {
                        console.error(`[Admin:bot] Error al suspender usuario ${userId}: ${error.message}`);
                    }
                    
                    await notificarInfraccion3Publico(telegram, chatId, username);
                    await notificarInfraccion3Privado(telegram, userId, username);
                    await notificarCreadorSuspension(
                        telegram,
                        CREATEDOR_ID,
                        username,
                        userId,
                        enlaceMensaje
                    );
                    break;
                    
                case 4:
                    // Expulsión permanente
                    try {
                        await telegram.banChatMember(chatId, userId);
                    } catch (error) {
                        console.error(`[Admin:bot] Error al expulsar usuario ${userId}: ${error.message}`);
                    }
                    
                    await notificarInfraccion4Publico(telegram, chatId, username);
                    await notificarInfraccion4Privado(telegram, userId, username);
                    await notificarCreadorExpulsion(
                        telegram,
                        CREATEDOR_ID,
                        username,
                        userId,
                        enlaceMensaje
                    );
                    break;
            }
            
            console.log(`[Admin:bot] Usuario ${userId} - Infracción #${infracciones} por enlace`);
            return;
        }
    }

    // ========== SI ES COMANDO (que no sea /feedback) ==========
    if (esComando) {
        const resultadoAviso = contienePalabraParaAviso(texto);
        
        if (resultadoAviso.contiene && resultadoAviso.palabras.length > 0) {
            const puedeAvisar = puedeEnviarAviso(userId);
            
            if (puedeAvisar) {
                await notificarAvisoComando(
                    telegram,
                    chatId,
                    msg.message_id,
                    usuario,
                    texto,
                    resultadoAviso.palabras[0],
                    esCreadorUsuario
                );
                console.log(`[Admin:bot] Aviso por comando de ${usuario.id}: "${resultadoAviso.palabras[0]}"`);
            } else {
                console.log(`[Admin:bot] Rate-limit para usuario ${usuario.id}`);
            }
        }
        
        // Los comandos NUNCA se borran por contenido
        await procesarComando(msg, bot);
        return;
    }

    // ========== MENSAJE NORMAL (NO COMANDO) ==========
    const resultadoPalabras = contienePalabraProhibida(texto);
    const resultadoEmojis = contieneEmojiProhibido(texto);
    const tieneContenidoProhibido = resultadoPalabras.contiene || resultadoEmojis.contiene;

    if (tieneContenidoProhibido) {
        console.log(`[Admin:bot] Contenido prohibido detectado. Borrando...`);
        const resultadoContenido = await filtrarMensajePorContenido(msg, bot);
        
        if (resultadoContenido.eliminado) {
            if (esCreadorUsuario) {
                await notificarAvisoContenidoCreador(
                    telegram,
                    chatId,
                    msg.message_id,
                    usuario,
                    resultadoPalabras.palabras,
                    resultadoEmojis.emojis
                );
                console.log(`[Admin:bot] Mensaje del creador borrado y aviso enviado.`);
            } else {
                await notificarContenidoProhibido(
                    telegram,
                    resultadoContenido.usuario,
                    resultadoContenido.palabras,
                    resultadoContenido.emojis,
                    false
                );
                await avisarYBorrar(
                    telegram,
                    chatId,
                    `⚠️ ${usuario.first_name}, tu mensaje fue eliminado por contener contenido no permitido.`
                );
                console.log(`[Admin:bot] Mensaje de usuario borrado y notificaciones enviadas.`);
            }
            return;
        }
    }

    // Si no es contenido prohibido ni enlace, intentar procesar como comando
    await procesarComando(msg, bot);
}

// ==================== REGISTRO_CALLBACKS ====================
function registrarCallbacks(bot) {
    registrarCallbacksFeedback(bot);
    console.log('[Admin:bot] Callbacks registrados.');
}

// ==================== EXPORT ====================
// Función principal que cumple el contrato (msg, bot) => true/false
async function moduloAdministrador(msg, bot) {
    try {
        await procesarMensaje(msg, bot);
        return true;
    } catch (error) {
        console.error(`[Admin:bot] Error al procesar mensaje: ${error.message}`);
        return false;
    }
}

module.exports = {
    moduloAdministrador,
    registrarCallbacks
};