// ==================== FILTRO_ENLACES ====================
const { CREATEDOR_ID, GRUPO_URL, CANAL_URL } = require('../../config');

const DOMINIOS_PERMITIDOS = [
    'gutenberg.org',
    'openlibrary.org',
    'archive.org',
    't.me/PergaminosLibros_Bot',
    't.me/PergaminosAdmin_Bot',
    't.me/Pergaminos_Channel',
    't.me/Pergaminos_Abiertos'
];

// ==================== ENLACES_OFICIALES_CREADOR ====================
const ENLACES_OFICIALES = [
    GRUPO_URL,
    CANAL_URL,
    'https://t.me/PergaminosLibros_Bot',
    'https://t.me/PergaminosAdmin_Bot'
];

// ==================== FUNCIONES_AUXILIARES ====================
function esEnlacePermitido(url) {
    if (!url) return false;
    const urlLower = url.toLowerCase();
    return DOMINIOS_PERMITIDOS.some(dominio => urlLower.includes(dominio));
}

function esEnlaceOficialCreador(url) {
    if (!url) return false;
    return ENLACES_OFICIALES.some(enlace => url === enlace);
}

function contieneEnlaceEnTexto(texto) {
    if (!texto) return false;
    const patrones = [
        /https?:\/\/[^\s]+/gi,
        /t\.me\/[^\s]+/gi,
        /telegram\.me\/[^\s]+/gi
    ];
    return patrones.some(p => p.test(texto));
}

function extraerEnlacesDeTexto(texto) {
    if (!texto) return [];
    const patron = /(https?:\/\/[^\s]+|t\.me\/[^\s]+|telegram\.me\/[^\s]+)/gi;
    return texto.match(patron) || [];
}

function extraerEnlacesDeEntidades(entidades) {
    if (!entidades || entidades.length === 0) return [];
    const urls = [];
    for (const entidad of entidades) {
        if (entidad.type === 'url' && entidad.url) urls.push(entidad.url);
        if (entidad.type === 'text_link' && entidad.url) urls.push(entidad.url);
    }
    return urls;
}

// ==================== FUNCION_PRINCIPAL ====================
async function filtrarMensaje(msg, bot) {
    if (!msg) return { eliminado: false };

    const texto = msg.text || msg.caption || '';
    const entidades = msg.entities || msg.caption_entities || [];

    const usuario = msg.from;
    const userId = usuario.id;
    const messageId = msg.message_id;
    const chatId = msg.chat.id;

    const enlacesTexto = extraerEnlacesDeTexto(texto);
    const enlacesEntidades = extraerEnlacesDeEntidades(entidades);
    const todosLosEnlaces = [...new Set([...enlacesTexto, ...enlacesEntidades])];

    const hayEnlaceOculto = entidades.some(e => e.type === 'url' || e.type === 'text_link');
    const hayEnlaceEnTexto = contieneEnlaceEnTexto(texto);

    if (!hayEnlaceEnTexto && !hayEnlaceOculto) {
        return { eliminado: false };
    }

    const esCreador = userId === CREATEDOR_ID;

    // ========== LÓGICA PARA EL CREADOR ==========
    if (esCreador && todosLosEnlaces.length > 0) {
        const todosSonOficiales = todosLosEnlaces.every(enlace => esEnlaceOficialCreador(enlace));
        
        if (todosSonOficiales) {
            console.log(`[Admin:enlaces] Creador publicó enlace oficial - permitido`);
            return { eliminado: false };
        }
        
        const enlacesNoOficiales = todosLosEnlaces.filter(enlace => !esEnlaceOficialCreador(enlace));
        
        try {
            await bot.telegram.deleteMessage(chatId, messageId);
            console.log(`[Admin:enlaces] Mensaje del creador eliminado por enlace NO oficial`);
        } catch (error) {
            console.error(`[Admin:enlaces] Error al eliminar mensaje del creador: ${error.message}`);
        }
        
        return {
            eliminado: true,
            razon: 'enlace_no_oficial_creador',
            enlaces: enlacesNoOficiales,
            usuario,
            chatId,
            esCreador: true
        };
    }

    // ========== LÓGICA PARA USUARIOS NORMALES Y ADMIN ==========
    const enlacesNoPermitidos = todosLosEnlaces.filter(e => !esEnlacePermitido(e));

    if (todosLosEnlaces.length > 0 && enlacesNoPermitidos.length === 0) {
        return { eliminado: false };
    }

    const motivoEliminacion = enlacesNoPermitidos.length > 0
        ? enlacesNoPermitidos
        : ['[enlace oculto detectado en entidades]'];

    try {
        await bot.telegram.deleteMessage(chatId, messageId);
        console.log(`[Admin:enlaces] Mensaje eliminado por enlace no permitido: usuario ${usuario.id}`);
    } catch (error) {
        console.error(`[Admin:enlaces] Error al eliminar mensaje: ${error.message}`);
    }

    return {
        eliminado: true,
        razon: 'enlaces_no_permitidos',
        enlaces: motivoEliminacion,
        usuario,
        chatId,
        primerEnlace: enlacesNoPermitidos[0] || motivoEliminacion[0]
    };
}

// ==================== EXPORTS ====================
module.exports = {
    esEnlacePermitido,
    contieneEnlaceEnTexto,
    extraerEnlacesDeTexto,
    filtrarMensaje,
    ENLACES_OFICIALES
};