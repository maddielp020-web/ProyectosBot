// ==================== IMPORTACIONES ====================
const { Telegraf } = require('telegraf');

// ==================== CLASE_PORTERO ====================
class Portero {
    constructor(tokens, directorChatId) {
        // Mapa de módulos: { nombre: funcion }
        this.modulos = {};
        
        // Estado de cada módulo: { nombre: { estado: 'vivo'|'caido'|'pendiente', desde: timestamp } }
        this.estadoModulos = {};
        
        // Historial completo de errores (últimos 50)
        this.historialErrores = [];
        
        // ID del Director para notificaciones
        this.directorChatId = directorChatId;
        
        this.bots = {
            portero: new Telegraf(tokens.portero).telegram,
            administrador: null,
            bibliotecario: null
        };
        
        if (tokens.administrador) {
            this.bots.administrador = new Telegraf(tokens.administrador).telegram;
        }
        if (tokens.bibliotecario) {
            this.bots.bibliotecario = new Telegraf(tokens.bibliotecario).telegram;
        }
        
        console.log('[Portero] Inicializado.');
        console.log(`[Portero] Bots disponibles: ${Object.keys(this.bots).filter(k => this.bots[k]).join(', ')}`);
        console.log(`[Portero] Director Chat ID: ${this.directorChatId}`);
    }
    
    // ==================== AVISAR_DIRECTOR ====================
    async avisarDirector(asunto, detalle) {
        if (!this.directorChatId) {
            console.warn('[Portero] No se puede avisar al Director: ID no configurado.');
            return;
        }
        
        try {
            const mensaje = `🔔 *${asunto}*\n\n${detalle}\n\n🕐 _${new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}_`;
            
            await this.bots.portero.sendMessage(this.directorChatId, mensaje, {
                parse_mode: 'Markdown'
            });
            
            console.log(`[Portero] Aviso enviado al Director: ${asunto}`);
        } catch (error) {
            console.error('[Portero] No se pudo avisar al Director:', error.message);
        }
    }

    // ==================== REGISTRO_MODULOS ====================
    registrarModulo(nombre, funcion) {
        this.modulos[nombre] = funcion;
        this.estadoModulos[nombre] = { estado: 'vivo', desde: new Date().toISOString() };
        console.log(`[Portero] Módulo registrado: ${nombre} (estado: vivo)`);
    }

    // ==================== ENRUTAMIENTO ====================
    decidirDestino(msg) {
        const texto = (msg.text || msg.caption || '').trim();
        if (!texto) return 'administrador';
        const textoLower = texto.toLowerCase();

        if (textoLower.startsWith('/autor') || textoLower.startsWith('/titulo') || textoLower.startsWith('/libro')) {
            return 'bibliotecario';
        }
        if (textoLower.startsWith('/ayuda') || textoLower.startsWith('/feedback') || 
            textoLower.startsWith('/compartir') || textoLower.startsWith('/reglas') ||
            textoLower.startsWith('/start') || textoLower.startsWith('/admin')) {
            return 'administrador';
        }
        return 'administrador';
    }

    // ==================== PROCESAR_MENSAJE ====================
    async procesarMensaje(msg, ctx) {
        const destino = this.decidirDestino(msg);
        
        if (!destino) {
            console.log(`[Portero] Mensaje sin destino: "${msg.text}"`);
            return;
        }

        if (!this.modulos[destino]) {
            console.log(`[Portero] Módulo "${destino}" no está cargado aún.`);
            // Solo responder en grupo, no en privado con el Director
            if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
                await ctx.reply('⚠️ Este servicio aún no está disponible. Estamos trabajando en ello.', {
                    reply_to_message_id: msg.message_id
                });
            }
            return;
        }

        const botTelegram = destino === 'administrador' 
            ? this.bots.administrador 
            : destino === 'bibliotecario' 
                ? this.bots.bibliotecario 
                : this.bots.portero;

        try {
            console.log(`[Portero] Enrutando a: ${destino} | De: ${msg.from?.username || msg.from?.first_name} | Texto: "${msg.text?.substring(0, 50)}"`);
            const resultado = await this.modulos[destino](msg, botTelegram);
            
            // ========== SI ESTABA CAÍDO Y RESPONDIÓ, MARCAR VIVO ==========
            if (this.estadoModulos[destino]?.estado === 'caido') {
                this.estadoModulos[destino] = { estado: 'vivo', desde: new Date().toISOString() };
                console.log(`[Portero] Módulo ${destino} recuperado: caido → vivo`);
                await this.avisarDirector(
                    `🟢 Módulo RECUPERADO: ${destino}`,
                    `El módulo ${destino} volvió a funcionar correctamente.`
                );
            }
            
            if (!resultado) {
                console.log(`[Portero] Módulo ${destino} no procesó el mensaje.`);
            }
        } catch (error) {
            console.error(`[Portero] Error en módulo ${destino}:`, error.message);
            
            // ========== REGISTRAR ERROR EN HISTORIAL ==========
            const errorRegistrado = {
                timestamp: new Date().toISOString(),
                modulo: destino,
                causa: error.message,
                usuario: msg.from?.username || msg.from?.first_name || 'desconocido',
                userId: msg.from?.id,
                chatId: msg.chat.id,
                mensaje: msg.text?.substring(0, 100) || '[sin texto]'
            };
            this.historialErrores.push(errorRegistrado);
            
            // Mantener solo últimos 50 errores
            if (this.historialErrores.length > 50) {
                this.historialErrores.shift();
            }
            
            // ========== DETECTAR CAMBIO DE ESTADO ==========
            const estadoAnterior = this.estadoModulos[destino]?.estado || 'pendiente';
            
            if (estadoAnterior === 'vivo') {
                // Pasó de vivo a caído: avisar al Director
                this.estadoModulos[destino] = { estado: 'caido', desde: new Date().toISOString() };
                await this.avisarDirector(
                    `🔴 Módulo CAÍDO: ${destino}`,
                    `Error: ${error.message}\nMódulo: ${destino}\nUsuario: ${msg.from?.username || msg.from?.first_name} (${msg.from?.id})\nChat: ${msg.chat.id}\nMensaje: ${msg.text?.substring(0, 100)}`
                );
            } else if (estadoAnterior === 'caido') {
                // Ya estaba caído, actualizar timestamp
                this.estadoModulos[destino].desde = new Date().toISOString();
            } else {
                // Primera ejecución y falló
                this.estadoModulos[destino] = { estado: 'caido', desde: new Date().toISOString() };
                await this.avisarDirector(
                    `🔴 Módulo CAÍDO: ${destino}`,
                    `Error: ${error.message}\nMódulo: ${destino}\nUsuario: ${msg.from?.username || msg.from?.first_name} (${msg.from?.id})\nChat: ${msg.chat.id}\nMensaje: ${msg.text?.substring(0, 100)}`
                );
            }
            
            // Responder al usuario solo en grupos
            if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
                try {
                    await ctx.reply('⚠️ Servicio no disponible en este momento. Intenta de nuevo más tarde.', {
                        reply_to_message_id: msg.message_id
                    });
                } catch (sendError) {
                    console.error('[Portero] No se pudo enviar mensaje de error al usuario:', sendError.message);
                }
            }
        }
    }

    // ==================== OBTENER_ESTADO ====================
    obtenerEstado() {
        const estado = {};
        for (const [nombre, datos] of Object.entries(this.estadoModulos)) {
            estado[nombre] = datos;
        }
        // Marcar módulos esperados que no están cargados
        const esperados = ['administrador', 'bibliotecario'];
        for (const nombre of esperados) {
            if (!estado[nombre]) {
                estado[nombre] = { estado: 'pendiente', desde: null };
            }
        }
        return estado;
    }

    // ==================== OBTENER_ERRORES ====================
    obtenerErrores(limite = 10) {
        return this.historialErrores.slice(-limite).reverse();
    }
}

// ==================== EXPORTACION ====================
module.exports = Portero;