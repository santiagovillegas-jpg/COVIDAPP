import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  makeCacheableSignalKeyStore,
  proto,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import qrcode from "qrcode";
import { EventEmitter } from "events";
import { mkdir } from "fs/promises";
import path from "path";

const AUTH_DIR = path.join(process.cwd(), ".whatsapp-auth");

class WhatsAppService extends EventEmitter {
  private sock: any = null;
  private qrCodeData: string | null = null;
  private isConnected = false;
  private isConnecting = false;

  getStatus() {
    return {
      connected: this.isConnected,
      connecting: this.isConnecting,
      hasQr: !!this.qrCodeData,
    };
  }

  getQr() {
    return this.qrCodeData;
  }

  async initialize() {
    if (this.isConnecting || this.isConnected) return;
    this.isConnecting = true;

    try {
      await mkdir(AUTH_DIR, { recursive: true });
      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

      this.sock = makeWASocket({
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, console as any),
        },
        printQRInTerminal: false,
        logger: { level: "silent", trace: () => {}, debug: () => {}, info: () => {}, warn: () => {}, error: () => {}, fatal: () => {}, child: () => ({ level: "silent", trace: () => {}, debug: () => {}, info: () => {}, warn: () => {}, error: () => {}, fatal: () => {}, child: () => {} as any }) },
        browser: ["COVIDAPP", "Chrome", "1.0.0"],
      });

      this.sock.ev.on("connection.update", async (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            this.qrCodeData = await qrcode.toDataURL(qr, { margin: 2, width: 300 });
            this.isConnecting = true;
            this.isConnected = false;
            console.log("📱 WhatsApp QR generado — visita /api/admin/whatsapp/qr para escanearlo");
            this.emit("qr", this.qrCodeData);
          } catch (e) {
            console.error("Error generando QR:", e);
          }
        }

        if (connection === "close") {
          const code = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const shouldReconnect = code !== DisconnectReason.loggedOut;
          this.isConnected = false;
          this.isConnecting = false;
          this.qrCodeData = null;
          console.log(`⚠️  WhatsApp desconectado (${code}). Reconectando: ${shouldReconnect}`);
          if (shouldReconnect) {
            setTimeout(() => this.initialize(), 5000);
          }
        }

        if (connection === "open") {
          this.isConnected = true;
          this.isConnecting = false;
          this.qrCodeData = null;
          console.log("✅ WhatsApp conectado correctamente");
          this.emit("connected");
        }
      });

      this.sock.ev.on("creds.update", saveCreds);
    } catch (err) {
      console.error("Error inicializando WhatsApp:", err);
      this.isConnecting = false;
      setTimeout(() => this.initialize(), 10000);
    }
  }

  async sendMessage(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isConnected || !this.sock) {
      return { success: false, error: "WhatsApp no está conectado. Escanee el QR primero." };
    }

    try {
      const cleaned = phone.replace(/\D/g, "");
      const withCode = cleaned.startsWith("57") ? cleaned : `57${cleaned}`;
      const jid = `${withCode}@s.whatsapp.net`;

      await this.sock.sendMessage(jid, { text: message });
      console.log(`✅ WhatsApp enviado a ${jid}`);
      return { success: true };
    } catch (err: any) {
      console.error(`❌ Error enviando WhatsApp a ${phone}:`, err.message);
      return { success: false, error: err.message };
    }
  }

  async broadcastMessage(phones: string[], message: string) {
    const results = [];
    for (const phone of phones) {
      if (!phone) continue;
      const result = await this.sendMessage(phone, message);
      results.push({ phone, ...result });
      await new Promise(r => setTimeout(r, 1000));
    }
    return results;
  }
}

export const whatsappService = new WhatsAppService();

export async function sendWhatsAppNotification(phone: string | null | undefined, message: string) {
  if (!phone) return { success: false, error: "Sin número de teléfono" };
  return whatsappService.sendMessage(phone, message);
}
