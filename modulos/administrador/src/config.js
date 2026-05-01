// ==================== IMPORTACIONES ====================
require('dotenv').config();

// ==================== CONSTANTES ====================
const BOT_TOKEN = process.env.ADMIN_TOKEN;
const CREATEDOR_ID = process.env.DIRECTOR_CHAT_ID 
    ? parseInt(process.env.DIRECTOR_CHAT_ID) 
    : 2022025893;
const ADMIN_IDS = process.env.ADMIN_IDS
    ? process.env.ADMIN_IDS.split(',').map(id => parseInt(id.trim()))
    : [];
const GRUPO_URL = process.env.GRUPO_URL || 'https://t.me/Pergaminos_Abiertos';
const CANAL_URL = process.env.CANAL_URL || 'https://t.me/Pergaminos_Channel';

// ==================== VALIDACION ====================
// Nota: El Portero ya valida ADMIN_TOKEN al arrancar.
// Si falta, el módulo no se carga y se informa al Director.
// No se hace process.exit() porque eso mataría a todos los bots.

if (!BOT_TOKEN) {
    console.error('[Admin:config] ADMIN_TOKEN no está definido en .env');
}

if (ADMIN_IDS.length === 0) {
    console.warn('[Admin:config] ADMIN_IDS está vacío. Solo el Creador recibirá notificaciones.');
}

console.log('[Admin:config] Configuración cargada:');
console.log(`  Creador: ${CREATEDOR_ID}`);
console.log(`  Admins adicionales: ${ADMIN_IDS.filter(id => id !== CREATEDOR_ID).join(', ') || 'ninguno'}`);
console.log(`  Grupo: ${GRUPO_URL}`);
console.log(`  Canal: ${CANAL_URL}`);

// ==================== EXPORTS ====================
module.exports = { BOT_TOKEN, CREATEDOR_ID, ADMIN_IDS, GRUPO_URL, CANAL_URL };