// ==================== IMPORTACIONES ====================
const { moduloAdministrador, registrarCallbacks } = require('./src/bot');

// ==================== EXPORT ====================
// Función principal: cumple el contrato (msg, ctx) => boolean
// ctx es el contexto completo de Telegraf
async function administrador(msg, ctx) {
    return await moduloAdministrador(msg, ctx);
}

// Función para registrar callbacks: recibe la instancia completa de Telegraf
function registrarCallbacksModulo(bot) {
    registrarCallbacks(bot);
    console.log('[Admin:index] Callbacks registrados en bot principal.');
}

module.exports = administrador;
module.exports.registrarCallbacks = registrarCallbacksModulo;