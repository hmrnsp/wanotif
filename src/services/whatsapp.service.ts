/*
 * File: whatsapp.service.ts
 * Project: wwebjs
 * File Created: Monday, 25th November 2024 4:39:10 pm
 * Author: Rede (hamransp@gmail.com)
 * Last Modified: Mon Sep 08 2025
 * Copyright 2017 - 2022 10RI Dev
 */
import { Client, LocalAuth } from 'whatsapp-web.js';
import EventEmitter from 'events';

export class WhatsAppService extends EventEmitter {
    private static instance: WhatsAppService;
    private client: Client;
    private isInitialized: boolean = false;
    private currentQR: string | null = null;
    private isAuthenticated: boolean = false;

    private constructor() {
        super();
        this.client = new Client({
            authStrategy: new LocalAuth({
                clientId: 'main-instance',
                dataPath: '.sessions'
            }),
            puppeteer: {
                headless: true,
                args: ['--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                    '--disable-extensions',
                    '--disable-canvas-aa',
                    '--disable-2d-canvas-clip-aa',
                    '--disable-accelerated-2d-canvas']
            }
        });

        this.setupEventHandlers();
    }
    // Helper untuk mendapatkan waktu aktif bot
    private getUptime(): string {
        const uptime = process.uptime();
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        return `${hours}h ${minutes}m`;
    }
    public static getInstance(): WhatsAppService {
        if (!WhatsAppService.instance) {
            WhatsAppService.instance = new WhatsAppService();
        }
        return WhatsAppService.instance;
    }

    private setupEventHandlers(): void {
        this.client.on('qr', (qr) => {
            console.log('New QR Code received');
            this.currentQR = qr;
            this.isAuthenticated = false;
            this.emit('qr', qr);
        });

        this.client.on('authenticated', () => {
            console.log('WhatsApp: Autentikasi berhasil!');
            this.isAuthenticated = true;
            this.currentQR = null;
        });

        this.client.on('auth_failure', (msg) => {
            console.error('WhatsApp: Autentikasi gagal:', msg);
            this.isAuthenticated = false;
            this.currentQR = null;
        });

        this.client.on('ready', () => {
            console.log('WhatsApp client siap!');
            this.isInitialized = true;
            this.isAuthenticated = true;
        });

        this.client.on('disconnected', (reason) => {
            console.log('WhatsApp Client terputus:', reason);
            this.isInitialized = false;
            this.isAuthenticated = false;
            this.currentQR = null;
        });

        this.client.on('message', this.handleMessage.bind(this));
    }
    private async sendMenu(message: any): Promise<void> {
        const menuText = `
        *DAFTAR COMMAND*
        !ping - Cek koneksi bot
        !info - Informasi bot
        !menu - Menampilkan menu ini
        !group - Dapatkan ID grup (khusus grup)

        Silakan gunakan command di atas untuk berinteraksi dengan bot.`;

        await message.reply(menuText);
    }

    private async sendGroupId(message: any): Promise<void> {
        try {
            // Periksa apakah message.author ada atau undefined
            if (!message.author) {
                // Pesan ini bukan dari grup
                await message.reply('❌ Command ini hanya bisa digunakan di dalam grup WhatsApp.');
                return;
            }

            // Dapatkan chat untuk mendapatkan nama grup
            const chat = await message.getChat();
            const groupName = chat.name || 'Unknown Group';
            
            const groupInfo = `📋 *INFORMASI GRUP*
            
🏷️ *Nama Grup:* ${groupName}
🆔 *Group ID:* \`${message.from}\`
📅 *Waktu:* ${new Date().toLocaleString('id-ID')}

💡 *Tips:* Salin Group ID di atas untuk keperluan konfigurasi bot atau notifikasi.`;

            await message.reply(groupInfo);
        } catch (error) {
            console.error('Error di sendGroupId:', error);
            await message.reply('❌ Terjadi kesalahan saat mengambil informasi grup.');
        }
    }

    private async sendInfo(message: any): Promise<void> {
        try {
            const info = `*INFO BOT*
        ID Pesan: ${message.id._serialized} 
        ID Chat/Group: ${message.from}
        Pesan: ${message.body}
        Waktu: ${new Date(message.timestamp * 1000).toLocaleString()}
        Status: ${this.isAuthenticated ? 'Terhubung' : 'Terputus'}
        Siap: ${this.isReady() ? 'Ya' : 'Tidak'}
        Waktu Aktif: ${this.getUptime()}`;

            await message.reply(info);
        } catch (error) {
            console.error('Error di sendInfo:', error);
            await message.reply('Terjadi kesalahan saat menghasilkan pesan info');
        }
    }

    private async handleCommand(message: any): Promise<void> {
        const command = message.body.toLowerCase();

        switch (command) {
            case '!ping':
                await message.reply('pong');
                break;
            case '!menu':
                await this.sendMenu(message);
                break;
            case '!info':
                await this.sendInfo(message);
                break;
            case '!group':
                await this.sendGroupId(message);
                break;
            default:
                if (!message.isGroup) {  // Hanya balas di chat pribadi
                    await message.reply('Command tidak dikenali. Ketik !menu untuk melihat daftar command.');
                }
        }
    }
    
    private async handleMessage(message: any): Promise<void> {
        try {
            // Log pesan masuk beserta ID pesannya
            console.log("==============================================")
            console.log('Body ##### ', message);
            console.log("==============================================")

            console.log('Pesan masuk:', {
                messageId: message.id._serialized,
                from: message.from,
                body: message.body,
                timestamp: message.timestamp
            });
    
            // Hanya proses jika ini adalah perintah dan belum ditangani
            if ((message.body.startsWith('!')) && !message._handled) {
                message._handled = true;  // Tandai sudah ditangani
                await this.handleCommand(message);
            }
    
        } catch (error) {
            console.error('Error saat menangani pesan:', error);
        }
    }

    public async initialize(): Promise<void> {
        try {
            await this.client.initialize();
        } catch (error) {
            console.error('Error initializing WhatsApp client:', error);
            throw error;
        }
    }

    public getCurrentQR(): string | null {
        return this.currentQR;
    }

    public isReady(): boolean {
        return this.isInitialized;
    }

    public getAuthStatus(): boolean {
        return this.isAuthenticated;
    }

    public async sendMessage(to: string, message: string): Promise<any> {
        try {
            if (!this.isAuthenticated || !this.isInitialized) {
                throw new Error('WhatsApp client is not ready');
            }

            const result = await this.client.sendMessage(to, message);
            return {
                id: result.id,
                timestamp: result.timestamp,
                ack: result.ack,
                to: to
            };
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    // Tambahkan method untuk mengecek apakah nomor terdaftar di WhatsApp
    public async isRegisteredUser(phone: string): Promise<boolean> {
        try {
            const isRegistered = await this.client.isRegisteredUser(phone);
            return isRegistered;
        } catch (error) {
            console.error('Error checking registered user:', error);
            return false;
        }
    }


     // Add new methods for group functionality
     public async getChats() {
        try {
            return await this.client.getChats();
        } catch (error) {
            console.error('Error getting chats:', error);
            throw new Error('Failed to get chats');
        }
    }

    // Method untuk mengirim pesan dengan reply
    public async sendReply(to: string, message: string, quotedMessageId: string): Promise<any> {
        try {
            if (!this.isAuthenticated || !this.isInitialized) {
                throw new Error('WhatsApp client is not ready');
            }

            // Mendapatkan message yang akan di-quote berdasarkan ID
            const msg = await this.client.getMessageById(quotedMessageId);
            
            if (!msg) {
                throw new Error('Quoted message not found');
            }

            // Kirim reply menggunakan message object
            const result = await msg.reply(message);
            
            return {
                id: result.id,
                timestamp: result.timestamp,
                ack: result.ack,
                to: to
            };
        } catch (error) {
            console.error('Error sending reply:', error);
            throw error;
        }
    }
}