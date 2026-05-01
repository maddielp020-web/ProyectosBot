// ==================== IMPORTACIONES ====================
require('dotenv').config();
const { Telegraf } = require('telegraf');
const express = require('express');
const Portero = require('./core/portero');

// ==================== CONFIGURACION ====================
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;

// Tokens y datos sensibles — SIN valores por defecto
const PORTERO_TOKEN = process.env.PORTERO_TOKEN;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const BIBLIOTECARIO_TOKEN = process.env.BIBLIOTECARIO_TOKEN;
const DIRECTOR_CHAT_ID = process.env.DIRECTOR_CHAT_ID;
const RENDER_URL = process.env.RENDER_URL;

// Validación de variables críticas
if (!PORTERO_TOKEN) {
    console.error('[CONFIG] ❌ FALTA PORTERO_TOKEN en variables de entorno.');
    process.exit(1);
}
if (!DIRECTOR_CHAT_ID) {
    console.warn('[CONFIG] ⚠️ DIRECTOR_CHAT_ID no configurado. No se podrá avisar al Director.');
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
