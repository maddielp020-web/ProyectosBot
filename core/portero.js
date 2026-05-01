// ==================== IMPORTACIONES ====================
const { Telegraf } = require('telegraf');

// ==================== CLASE_PORTERO ====================
class Portero {
    constructor(tokens, directorChatId) {
        this.modulos = {};
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
        console.log(`[Portero] Módulo registrado: ${nombre}`);
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
            await ctx.reply('⚠️ Este servicio aún no está disponible. Estamos trabajando en ello.', {
                reply_to_message_id: msg.message_id
            });
            return;
        }

        const botTelegram = destino === 'administrador' 
            ? this.bots.administrador 
            : destino === 'bibliotecario' 
                ? this.bots.bibliotecario 
                : this.bots.portero;

        try {
            console.log(`[Portero] Enrutando a: ${destino} | De: ${msg.from?.username || msg.from?.first_name} | Texto: "${msg.text?.substring(0, 50)}"`);
            await this.modulos[destino](msg, botTelegram);
        } catch (error) {
            console.error(`[Portero] Error en módulo ${destino}:`, error.message);
            
            try {
                await ctx.reply('⚠️ Servicio no disponible en este momento. Intenta de nuevo más tarde.', {
                    reply_to_message_id: msg.message_id
                });
            } catch (sendError) {
                console.error('[Portero] No se pudo enviar mensaje de error al usuario:', sendError.message);
            }
            
            await this.avisarDirector(
                `Fallo en módulo: ${destino}`,
                `Error: ${error.message}\nMódulo: ${destino}\nUsuario: ${msg.from?.username || msg.from?.first_name} (${msg.from?.id})\nChat: ${msg.chat.id}\nMensaje: ${msg.text?.substring(0, 100)}`
            );
        }
    }
}

// ==================== EXPORTACION ====================
module.exports = Portero;