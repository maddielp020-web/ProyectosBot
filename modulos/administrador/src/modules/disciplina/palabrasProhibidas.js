// ==================== FILTRO_PALABRAS ====================
// Estas palabras se BORRAN en mensajes normales (no comandos)
const PALABRAS_PROHIBIDAS = [
    'puta', 'puto', 'mierda', 'cono', 'cabron', 'cabrona',
    'pendejo', 'pendeja', 'idiota', 'estupido', 'estupida',
    'imbecil', 'maldito', 'maldita',
    'spam', 'estafa', 'fraude',
    'odio', 'muerte', 'matar', 'violar'
];

// ==================== PALABRAS_PARA_AVISO ====================
// Estas palabras solo generan AVISO en comandos, NUNCA se borran
// Lista refinada sin duplicados con PALABRAS_PROHIBIDAS
const PALABRAS_PARA_AVISO = [
    'zorra',
    'cojones',
    'coño',
    'gilipollas',
    'cabrón',
    'joder'
];

const EMOJIS_PROHIBIDOS = [
    '🔞', '🍆', '🍑', '💦', '👅', '🖕', '👊', '🤬', '💀', '☠️'
];

// ==================== HELPER ====================
function normalizarTexto(texto) {
    if (!texto) return '';
    return texto.toLowerCase()
        .replace(/[áàä]/g, 'a')
        .replace(/[éèë]/g, 'e')
        .replace(/[íìï]/g, 'i')
        .replace(/[óòö]/g, 'o')
        .replace(/[úùü]/g, 'u')
        .replace(/ñ/g, 'n');
}

// ==================== FUNCIONES_DETECCION ====================
function contienePalabraProhibida(texto) {
    if (!texto) return { contiene: false, palabras: [] };

    const textoNorm = normalizarTexto(texto);
    
    const palabrasEncontradas = PALABRAS_PROHIBIDAS.filter(p => {
        const palabraNorm = normalizarTexto(p);
        const regex = new RegExp(`\\b${palabraNorm}\\b`, 'i');
        return regex.test(textoNorm);
    });

    return {
        contiene: palabrasEncontradas.length > 0,
        palabras: palabrasEncontradas
    };
}

function contienePalabraParaAviso(texto) {
    if (!texto) return { contiene: false, palabras: [] };

    const textoNorm = normalizarTexto(texto);
    
    const palabrasEncontradas = PALABRAS_PARA_AVISO.filter(p => {
        const palabraNorm = normalizarTexto(p);
        const regex = new RegExp(`\\b${palabraNorm}\\b`, 'i');
        return regex.test(textoNorm);
    });

    return {
        contiene: palabrasEncontradas.length > 0,
        palabras: palabrasEncontradas
    };
}

function contieneEmojiProhibido(texto) {
    if (!texto) return { contiene: false, emojis: [] };

    const emojisEncontrados = EMOJIS_PROHIBIDOS.filter(e => texto.includes(e));

    return {
        contiene: emojisEncontrados.length > 0,
        emojis: emojisEncontrados
    };
}

// ==================== FILTRAR_MENSAJE ====================
async function filtrarMensajePorContenido(msg, bot) {
    if (!msg) return { eliminado: false };

    const texto = msg.text || msg.caption || '';
    if (!texto) return { eliminado: false };

    const usuario = msg.from;
    const messageId = msg.message_id;

    const resultadoPalabras = contienePalabraProhibida(texto);
    const resultadoEmojis = contieneEmojiProhibido(texto);

    if (!resultadoPalabras.contiene && !resultadoEmojis.contiene) {
        return { eliminado: false };
    }

    try {
        await bot.telegram.deleteMessage(msg.chat.id, messageId);
        console.log(`[Admin:palabras] Mensaje eliminado por contenido prohibido: usuario ${usuario.id}`);
    } catch (error) {
        console.error(`[Admin:palabras] Error al eliminar mensaje: ${error.message}`);
    }

    return {
        eliminado: true,
        razon: 'contenido_prohibido',
        palabras: resultadoPalabras.palabras,
        emojis: resultadoEmojis.emojis,
        usuario,
        chatId: msg.chat.id
    };
}

// ==================== EXPORTS ====================
module.exports = {
    contienePalabraProhibida,
    contienePalabraParaAviso,
    contieneEmojiProhibido,
    filtrarMensajePorContenido,
    PALABRAS_PROHIBIDAS,
    PALABRAS_PARA_AVISO,
    EMOJIS_PROHIBIDOS
};