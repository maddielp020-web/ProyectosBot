// ==================== IMPORTACIONES ====================
const { moduloAdministrador, registrarCallbacks } = require('./src/bot');

// ==================== ESTADO ====================
let callbacksRegistrados = false;

// ==================== REGISTRO_UNICO ====================
function asegurarCallbacks(bot) {
    if (!callbacksRegistrados) {
        registrarCallbacks(bot);
        callbacksRegistrados = true;
        console.log('[Admin:index] Callbacks registrados.');
    }
}

// ==================== EXPORT ====================
module.exports = async (msg, bot) => {
    asegurarCallbacks(bot);
    return await moduloAdministrador(msg, bot);
};