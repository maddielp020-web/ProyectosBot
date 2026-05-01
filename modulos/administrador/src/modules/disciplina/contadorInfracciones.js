// ==================== CONTADOR_INFRACCIONES ====================
// Sistema de advertencias progresivas para enlaces no permitidos
// Almacenamiento en memoria (Map) - Futuro: migrar a Supabase

// ==================== CONFIGURACION ====================
const DIAS_REINICIO = 15;
const MS_POR_DIA = 24 * 60 * 60 * 1000;
const TIEMPO_REINICIO = DIAS_REINICIO * MS_POR_DIA;
const DURACION_SUSPENSION = 12 * 60 * 60 * 1000; // 12 horas

// ==================== ALMACENAMIENTO ====================
// Estructura: Map<userId, { infracciones: number, ultimaInfraccion: timestamp, suspendidoHasta: timestamp | null }>
const infraccionesPorUsuario = new Map();

// ==================== FUNCIONES_PRINCIPALES ====================

/**
 * Registra una nueva infracción para un usuario
 * @param {number} userId - ID del usuario
 * @returns {Object} - { infracciones: number, esSuspension: boolean, esExpulsion: boolean }
 */
function registrarInfraccion(userId) {
    const ahora = Date.now();
    let datos = infraccionesPorUsuario.get(userId);
    
    // Verificar reinicio por inactividad
    if (datos && (ahora - datos.ultimaInfraccion) > TIEMPO_REINICIO) {
        datos = null; // Reiniciar contador
    }
    
    if (!datos) {
        datos = {
            infracciones: 0,
            ultimaInfraccion: ahora,
            suspendidoHasta: null
        };
    }
    
    // Incrementar infracción
    datos.infracciones += 1;
    datos.ultimaInfraccion = ahora;
    
    // Determinar si aplica suspensión o expulsión
    const esSuspension = datos.infracciones === 3;
    const esExpulsion = datos.infracciones >= 4;
    
    if (esSuspension) {
        datos.suspendidoHasta = ahora + DURACION_SUSPENSION;
    }
    
    infraccionesPorUsuario.set(userId, datos);
    
    return {
        infracciones: datos.infracciones,
        esSuspension,
        esExpulsion,
        suspendidoHasta: datos.suspendidoHasta
    };
}

/**
 * Obtiene el número actual de infracciones de un usuario
 * @param {number} userId - ID del usuario
 * @returns {number} - Número de infracciones vigentes (0 si reinició por inactividad)
 */
function obtenerInfracciones(userId) {
    const ahora = Date.now();
    const datos = infraccionesPorUsuario.get(userId);
    
    if (!datos) return 0;
    
    // Verificar reinicio por inactividad
    if ((ahora - datos.ultimaInfraccion) > TIEMPO_REINICIO) {
        infraccionesPorUsuario.delete(userId);
        return 0;
    }
    
    return datos.infracciones;
}

/**
 * Verifica si un usuario está actualmente suspendido
 * @param {number} userId - ID del usuario
 * @returns {boolean} - true si está suspendido
 */
function estaSuspendido(userId) {
    const ahora = Date.now();
    const datos = infraccionesPorUsuario.get(userId);
    
    if (!datos || !datos.suspendidoHasta) return false;
    
    return ahora < datos.suspendidoHasta;
}

/**
 * Obtiene los datos completos de infracciones de un usuario
 * @param {number} userId - ID del usuario
 * @returns {Object|null} - Datos completos o null si no tiene infracciones vigentes
 */
function obtenerDatosInfracciones(userId) {
    const ahora = Date.now();
    const datos = infraccionesPorUsuario.get(userId);
    
    if (!datos) return null;
    
    // Verificar reinicio por inactividad
    if ((ahora - datos.ultimaInfraccion) > TIEMPO_REINICIO) {
        infraccionesPorUsuario.delete(userId);
        return null;
    }
    
    return {
        infracciones: datos.infracciones,
        ultimaInfraccion: datos.ultimaInfraccion,
        suspendidoHasta: datos.suspendidoHasta,
        estaSuspendido: datos.suspendidoHasta ? ahora < datos.suspendidoHasta : false
    };
}

/**
 * Reinicia manualmente el contador de un usuario
 * @param {number} userId - ID del usuario
 */
function reiniciarContador(userId) {
    infraccionesPorUsuario.delete(userId);
}

/**
 * Obtiene el tiempo restante de suspensión en formato legible
 * @param {number} userId - ID del usuario
 * @returns {string|null} - Tiempo restante o null si no está suspendido
 */
function tiempoRestanteSuspension(userId) {
    const ahora = Date.now();
    const datos = infraccionesPorUsuario.get(userId);
    
    if (!datos || !datos.suspendidoHasta || ahora >= datos.suspendidoHasta) {
        return null;
    }
    
    const msRestantes = datos.suspendidoHasta - ahora;
    const horas = Math.floor(msRestantes / (60 * 60 * 1000));
    const minutos = Math.floor((msRestantes % (60 * 60 * 1000)) / (60 * 1000));
    
    return `${horas}h ${minutos}m`;
}

// ==================== LIMPIEZA_PERIODICA ====================
// Limpiar datos de usuarios inactivos cada 6 horas.
// En producción con Render, el timer se recrea con cada deploy.
setInterval(() => {
    const ahora = Date.now();
    for (const [userId, datos] of infraccionesPorUsuario) {
        if ((ahora - datos.ultimaInfraccion) > TIEMPO_REINICIO) {
            infraccionesPorUsuario.delete(userId);
        }
        // También limpiar suspensiones expiradas
        if (datos.suspendidoHasta && ahora >= datos.suspendidoHasta) {
            datos.suspendidoHasta = null;
            infraccionesPorUsuario.set(userId, datos);
        }
    }
}, 6 * 60 * 60 * 1000);

// ==================== EXPORTS ====================
module.exports = {
    registrarInfraccion,
    obtenerInfracciones,
    estaSuspendido,
    obtenerDatosInfracciones,
    reiniciarContador,
    tiempoRestanteSuspension,
    DIAS_REINICIO,
    DURACION_SUSPENSION
};