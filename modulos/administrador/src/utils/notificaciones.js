// ==================== NOTIFICACIONES ====================
const { ADMIN_IDS, CREATEDOR_ID } = require('../config');

// ==================== HELPER ====================
function esc(texto) {
    if (!texto) return '';
    return texto.toString()
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function construirEnlaceMensaje(chatId, messageId) {
    const chatIdStr = String(chatId).replace('-100', '');
    return `https://t.me/c/${chatIdStr}/${messageId}`;
}

// ==================== FUNCIONES_BASE ====================
async function notificarAdministradores(telegram, mensaje) {
    for (const adminId of ADMIN_IDS) {
        try {
            await telegram.sendMessage(adminId, mensaje, { parse_mode: 'HTML' });
        } catch (error) {
            console.error(`[Admin:notif] Error al notificar a admin ${adminId}: ${error.message}`);
        }
    }
}

async function notificarCreador(telegram, mensaje) {
    try {
        await telegram.sendMessage(CREADOR_ID, mensaje, { parse_mode: 'HTML' });
    } catch (error) {
        console.error(`[Admin:notif] Error al notificar al creador: ${error.message}`);
    }
}

// ==================== NOTIFICACIONES_ENLACES ====================
async function notificarEnlaceProhibido(telegram, usuario, enlaces, esCreador = false) {
    const nombre = usuario.username ? `@${esc(usuario.username)}` : esc(usuario.first_name);
    const enlacesStr = enlaces.map(e => esc(e)).join('\n• ');

    let mensaje =
        `🚫 <b>ENLACE PROHIBIDO DETECTADO</b>\n\n` +
        `👤 <b>Usuario:</b> ${nombre} (ID: <code>${usuario.id}</code>)\n` +
        `🔗 <b>Enlace(s):</b>\n• ${enlacesStr}\n\n` +
        `✅ El mensaje ha sido eliminado automáticamente.`;
    
    if (esCreador) {
        mensaje += `\n\nℹ️ <i>El mensaje NO fue eliminado porque eres el creador.</i>`;
    }

    await notificarAdministradores(telegram, mensaje);
}

async function notificarAvisoEnlaceCreador(telegram, chatId, messageId, usuario, enlaces) {
    const nombre = usuario.username ? `@${esc(usuario.username)}` : esc(usuario.first_name);
    const enlaceMensaje = construirEnlaceMensaje(chatId, messageId);
    const enlacesStr = enlaces.map(e => esc(e)).join('\n• ');

    const mensaje =
        `🚫 <b>ENLACE PROHIBIDO DETECTADO (CREADOR)</b>\n\n` +
        `👤 <b>Usuario:</b> ${nombre} (ID: <code>${usuario.id}</code>)\n` +
        `🔗 <b>Enlace(s):</b>\n• ${enlacesStr}\n\n` +
        `🔗 <b>Enlace al mensaje:</b> ${enlaceMensaje}\n\n` +
        `ℹ️ <i>El mensaje fue ELIMINADO porque contenía un enlace no permitido. Si necesitas publicar un enlace oficial, agrégalo a la lista blanca en el código.</i>`;

    await notificarCreador(telegram, mensaje);
}

async function notificarAvisoEnlaceCreadorNoOficial(telegram, chatId, messageId, usuario, enlaces) {
    const nombre = usuario.username ? `@${esc(usuario.username)}` : esc(usuario.first_name);
    const enlaceMensaje = construirEnlaceMensaje(chatId, messageId);
    const enlacesStr = enlaces.map(e => esc(e)).join('\n• ');

    const mensaje =
        `🚫 <b>ENLACE PROHIBIDO DETECTADO (CREADOR)</b>\n\n` +
        `👤 <b>Usuario:</b> ${nombre} (ID: <code>${usuario.id}</code>)\n` +
        `🔗 <b>Enlace(s) no permitido:</b>\n• ${enlacesStr}\n\n` +
        `🔗 <b>Enlace al mensaje:</b> ${enlaceMensaje}\n\n` +
        `ℹ️ <i>El mensaje fue ELIMINADO porque contenía un enlace no permitido.\n` +
        `   Si necesitas publicar este enlace como oficial, agrégarlo a la lista blanca ENLACES_OFICIALES.</i>`;

    await notificarCreador(telegram, mensaje);
}

// ==================== NOTIFICACIONES_CONTENIDO ====================
async function notificarContenidoProhibido(telegram, usuario, palabras, emojis, esCreador = false) {
    const nombre = usuario.username ? `@${esc(usuario.username)}` : esc(usuario.first_name);

    let detalles = '';
    if (palabras && palabras.length > 0) {
        detalles += `📝 <b>Palabras:</b> ${palabras.map(esc).join(', ')}\n`;
    }
    if (emojis && emojis.length > 0) {
        detalles += `😀 <b>Emojis:</b> ${emojis.join(' ')}\n`;
    }

    let mensaje =
        `⚠️ <b>CONTENIDO PROHIBIDO DETECTADO</b>\n\n` +
        `👤 <b>Usuario:</b> ${nombre} (ID: <code>${usuario.id}</code>)\n` +
        detalles +
        `\n✅ El mensaje ha sido eliminado automáticamente.`;
    
    if (esCreador) {
        mensaje += `\n\nℹ️ <i>El mensaje NO fue eliminado porque eres el creador.</i>`;
    }

    await notificarAdministradores(telegram, mensaje);
}

async function notificarAvisoContenidoCreador(telegram, chatId, messageId, usuario, palabras, emojis) {
    const nombre = usuario.username ? `@${esc(usuario.username)}` : esc(usuario.first_name);
    const enlaceMensaje = construirEnlaceMensaje(chatId, messageId);

    let detalles = '';
    if (palabras && palabras.length > 0) {
        detalles += `📝 <b>Palabras:</b> ${palabras.map(esc).join(', ')}\n`;
    }
    if (emojis && emojis.length > 0) {
        detalles += `😀 <b>Emojis:</b> ${emojis.join(' ')}\n`;
    }

    const mensaje =
        `⚠️ <b>CONTENIDO PROHIBIDO DETECTADO (CREADOR)</b>\n\n` +
        `👤 <b>Usuario:</b> ${nombre} (ID: <code>${usuario.id}</code>)\n` +
        detalles +
        `\n🔗 <b>Enlace al mensaje:</b> ${enlaceMensaje}\n\n` +
        `ℹ️ <i>El mensaje fue ELIMINADO porque contenía una palabra o emoji prohibido. La disciplina empieza por ti, creador.</i>`;

    await notificarCreador(telegram, mensaje);
}

// ==================== NOTIFICACIONES_COMANDOS ====================
async function notificarAvisoComando(telegram, chatId, messageId, usuario, comando, palabraDetectada, esCreador = false) {
    const nombre = usuario.username ? `@${esc(usuario.username)}` : esc(usuario.first_name);
    const enlaceMensaje = construirEnlaceMensaje(chatId, messageId);

    let mensaje =
        `🛡️ <b>AVISO DEL GUARDIÁN</b>\n\n` +
        `👤 <b>Usuario:</b> ${nombre} (ID: <code>${usuario.id}</code>)\n` +
        `📝 <b>Comando:</b> ${esc(comando)}\n` +
        `⚠️ <b>Palabra detectada:</b> "${esc(palabraDetectada)}"\n\n` +
        `🔗 <b>Enlace al mensaje:</b> ${enlaceMensaje}\n\n` +
        `ℹ️ <i>No se ha borrado automáticamente. Evalúa si merece acción manual.</i>`;
    
    if (esCreador) {
        mensaje += `\n\nℹ️ <i>Este mensaje es tuyo (creador).</i>`;
    }

    await notificarCreador(telegram, mensaje);
}

// ==================== NOTIFICACIONES_FEEDBACK ====================
async function notificarFeedbackNegativo(telegram, usuario, textoFeedback, messageId, chatId) {
    const nombre = usuario.username ? `@${esc(usuario.username)}` : esc(usuario.first_name);
    const enlaceMensaje = messageId ? construirEnlaceMensaje(chatId, messageId) : 'No disponible';

    const mensaje =
        `📬 <b>FEEDBACK RECIBIDO</b>\n\n` +
        `👤 <b>Usuario:</b> ${nombre} (ID: <code>${usuario.id}</code>)\n` +
        `📝 <b>Feedback:</b> "${esc(textoFeedback)}"\n\n` +
        `🔗 <b>Enlace al mensaje:</b> ${enlaceMensaje}`;

    await notificarCreador(telegram, mensaje);
}

async function notificarFeedbackNegativoLegacy(telegram, usuario, contexto) {
    const nombre = usuario.username ? `@${esc(usuario.username)}` : esc(usuario.first_name);
    const mensaje =
        `👎 <b>FEEDBACK NEGATIVO RECIBIDO</b>\n\n` +
        `👤 <b>Usuario:</b> ${nombre} (ID: <code>${usuario.id}</code>)\n` +
        `💬 <b>Contexto:</b> ${esc(contexto)}\n\n` +
        `🔍 Revisa el grupo para ver qué buscó el usuario.`;
    await notificarCreador(telegram, mensaje);
}

// ==================== NOTIFICACIONES_ADMIN_ENLACE ====================
async function notificarAdminEnlaceProhibido(telegram, adminId, enlace, nombreAdmin) {
    const mensaje =
        `🛡️ <b>AVISO PARA ADMINISTRADOR</b>\n\n` +
        `@${esc(nombreAdmin || 'admin')}, has compartido un enlace que no está en la lista blanca de PergaminosAbiertos.\n\n` +
        `🔗 <b>Enlace detectado:</b> ${esc(enlace)}\n\n` +
        `✅ El mensaje ha sido eliminado automáticamente para mantener la coherencia de las reglas.\n\n` +
        `📋 Los administradores no se suspenden ni se expulsan, pero deben cumplir las reglas igual que todos. El respeto empieza por la casa.\n\n` +
        `🤝 Si consideras que este enlace debería ser permitido (nueva biblioteca, funcionalidad, promoción oficial, etc.), por favor, ponte en contacto con el creador (@Maddiel_Perez_Lopez) para evaluar su inclusión en la lista blanca.\n\n` +
        `Gracias por ayudar a mantener el orden y la coherencia del grupo. 🛡️`;

    try {
        await telegram.sendMessage(adminId, mensaje, { parse_mode: 'HTML' });
    } catch (error) {
        console.error(`[Admin:notif] Error al notificar a admin ${adminId}: ${error.message}`);
    }
}

// ==================== NOTIFICACIONES_INFRACCIONES ====================
async function notificarInfraccion1(telegram, chatId, username) {
    const mensaje =
        `📚 @${esc(username)}, los enlaces externos no están permitidos en PergaminosAbiertos.\n\n` +
        `Aquí solo compartimos libros de dominio público a través de los comandos /autor y /titulo.\n\n` +
        `Por favor, revisa las reglas con /reglas. Gracias por ayudar a mantener el orden. 🕯️`;
    
    await telegram.sendMessage(chatId, mensaje);
}

async function notificarInfraccion2(telegram, chatId, username) {
    const mensaje =
        `⚠️ @${esc(username)}, es tu segunda infracción (de 4).\n\n` +
        `Los enlaces externos no están permitidos. La próxima infracción resultará en una suspensión temporal de 12 horas.\n\n` +
        `Por favor, respeta las reglas del grupo. 🛡️`;
    
    await telegram.sendMessage(chatId, mensaje);
}

async function notificarInfraccion3Publico(telegram, chatId, username) {
    const mensaje = `🔴 @${esc(username)} ha sido suspendido temporalmente por acumular 3 infracciones.`;
    await telegram.sendMessage(chatId, mensaje);
}

async function notificarInfraccion3Privado(telegram, userId, username) {
    const mensaje =
        `🛡️ <b>HAS SIDO SUSPENDIDO TEMPORALMENTE</b>\n\n` +
        `👤 <b>Usuario:</b> @${esc(username)}\n` +
        `📊 <b>Infracción:</b> #3 de 4\n` +
        `⏱️ <b>Duración:</b> 12 horas\n\n` +
        `📝 <b>Motivo:</b> Publicación repetida de enlaces no permitidos.\n\n` +
        `Durante este tiempo no podrás escribir en el grupo.\n\n` +
        `Aprovecha para revisar las reglas con /reglas. A la cuarta infracción, serás expulsado permanentemente.\n\n` +
        `🛡️ El guardián siempre escucha.`;
    
    try {
        await telegram.sendMessage(userId, mensaje, { parse_mode: 'HTML' });
    } catch (error) {
        console.error(`[Admin:notif] Error al enviar aviso privado a ${userId}: ${error.message}`);
    }
}

async function notificarInfraccion4Publico(telegram, chatId, username) {
    const mensaje = `⛔ @${esc(username)} ha sido expulsado permanentemente por acumular 4 infracciones.`;
    await telegram.sendMessage(chatId, mensaje);
}

async function notificarInfraccion4Privado(telegram, userId, username) {
    const mensaje =
        `⛔ <b>HAS SIDO EXPULSADO PERMANENTEMENTE</b>\n\n` +
        `👤 <b>Usuario:</b> @${esc(username)}\n` +
        `📊 <b>Infracción:</b> #4 de 4\n\n` +
        `📝 <b>Motivo:</b> Acumulaste 4 infracciones por publicar enlaces no permitidos, incluso después de advertencias y una suspensión.\n\n` +
        `Esta decisión es definitiva. Gracias por tu comprensión.\n\n` +
        `🕯️ Lo eterno. Lo libre. Lo de todos.`;
    
    try {
        await telegram.sendMessage(userId, mensaje, { parse_mode: 'HTML' });
    } catch (error) {
        console.error(`[Admin:notif] Error al enviar aviso privado a ${userId}: ${error.message}`);
    }
}

// ==================== NOTIFICACIONES_CREADOR_INFRACCIONES ====================
async function notificarCreadorSuspension(telegram, creadorId, username, userId, enlaceMensaje) {
    const mensaje =
        `🛡️ <b>AVISO DEL GUARDIÁN - SUSPENSIÓN</b>\n\n` +
        `👤 <b>Usuario:</b> @${esc(username)} (ID: <code>${userId}</code>)\n` +
        `📊 <b>Infracción:</b> #3 de 4\n` +
        `⏱️ <b>Duración:</b> 12 horas\n\n` +
        `📝 <b>Motivo:</b> Publicación repetida de enlaces no permitidos.\n\n` +
        `🔗 <b>Enlace al mensaje:</b> ${enlaceMensaje}\n\n` +
        `ℹ️ El usuario no podrá escribir en el grupo durante este tiempo.`;
    
    await notificarCreador(telegram, mensaje);
}

async function notificarCreadorExpulsion(telegram, creadorId, username, userId, enlaceMensaje) {
    const mensaje =
        `🛡️ <b>AVISO DEL GUARDIÁN - EXPULSIÓN PERMANENTE</b>\n\n` +
        `👤 <b>Usuario:</b> @${esc(username)} (ID: <code>${userId}</code>)\n` +
        `📊 <b>Infracción:</b> #4 de 4\n\n` +
        `📝 <b>Motivo:</b> Publicación de enlaces no permitidos tras advertencias y suspensión.\n\n` +
        `🔗 <b>Enlace al mensaje:</b> ${enlaceMensaje}\n\n` +
        `✅ El usuario ha sido expulsado del grupo permanentemente.`;
    
    await notificarCreador(telegram, mensaje);
}

// ==================== EXPORTS ====================
module.exports = {
    notificarAdministradores,
    notificarCreador,
    notificarEnlaceProhibido,
    notificarContenidoProhibido,
    notificarAvisoComando,
    notificarAvisoEnlaceCreador,
    notificarAvisoContenidoCreador,
    notificarFeedbackNegativo,
    notificarFeedbackNegativoLegacy,
    construirEnlaceMensaje,
    notificarAdminEnlaceProhibido,
    notificarInfraccion1,
    notificarInfraccion2,
    notificarInfraccion3Publico,
    notificarInfraccion3Privado,
    notificarInfraccion4Publico,
    notificarInfraccion4Privado,
    notificarCreadorSuspension,
    notificarCreadorExpulsion,
    notificarAvisoEnlaceCreadorNoOficial
};