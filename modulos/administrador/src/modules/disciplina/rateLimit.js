// ==================== CONFIGURACION ====================
const MAX_AVISOS = 5;
const VENTANA_TIEMPO_MS = 10 * 60 * 1000; // 10 minutos

// ==================== ALMACENAMIENTO ====================
// Estructura: { userId: [timestamp1, timestamp2, ...] }
const avisosPorUsuario = new Map();

// ==================== FUNCIONES ====================
/**
 * Verifica si un usuario puede recibir un aviso más
 * @param {number} userId - ID del usuario
 * @returns {boolean} - true si puede recibir aviso, false si alcanzó el límite
 */
function puedeEnviarAviso(userId) {
    const ahora = Date.now();
    const ventanaInicio = ahora - VENTANA_TIEMPO_MS;
    
    let timestamps = avisosPorUsuario.get(userId) || [];
    timestamps = timestamps.filter(ts => ts > ventanaInicio);
    
    if (timestamps.length >= MAX_AVISOS) {
        return false;
    }
    
    timestamps.push(ahora);
    avisosPorUsuario.set(userId, timestamps);
    
    return true;
}

/**
 * Obtiene cuántos avisos le quedan al usuario en esta ventana
 * @param {number} userId - ID del usuario
 * @returns {number} - Avisos restantes
 */
function avisosRestantes(userId) {
    const ahora = Date.now();
    const ventanaInicio = ahora - VENTANA_TIEMPO_MS;
    
    let timestamps = avisosPorUsuario.get(userId) || [];
    timestamps = timestamps.filter(ts => ts > ventanaInicio);
    
    return Math.max(0, MAX_AVISOS - timestamps.length);
}

// ==================== LIMPIEZA_PERIODICA ====================
// Nota: Si el módulo se recarga, este timer se recrea.
// En producción con Render no es problema.
setInterval(() => {
    const ahora = Date.now();
    const ventanaInicio = ahora - VENTANA_TIEMPO_MS;
    
    for (const [userId, timestamps] of avisosPorUsuario) {
        const filtrados = timestamps.filter(ts => ts > ventanaInicio);
        if (filtrados.length === 0) {
            avisosPorUsuario.delete(userId);
        } else {
            avisosPorUsuario.set(userId, filtrados);
        }
    }
}, 5 * 60 * 1000); // Limpiar cada 5 minutos

// ==================== EXPORTS ====================
module.exports = {
    puedeEnviarAviso,
    avisosRestantes,
    MAX_AVISOS,
    VENTANA_TIEMPO_MS
};