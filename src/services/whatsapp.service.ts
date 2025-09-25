/*
 * File: whatsapp.service.ts
 * Project: wwebjs
 * File Created: Monday, 25th November 2024 4:39:10 pm
 * Author: Rede (hamransp@gmail.com)
 * Last Modified: Thu Sep 25 2025
 * Copyright 2017 - 2022 10RI Dev
 */
import { Client, LocalAuth, MessageMedia  } from 'whatsapp-web.js';
import EventEmitter from 'events';
import * as fs from 'fs';
import * as path from 'path';
import * as mime from 'mime-types';

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

    /**
     * Mengirim gambar dengan caption
     * @param to - Nomor tujuan (format: 628xxx@c.us untuk personal, xxx-xxx@g.us untuk grup)
     * @param imagePath - Path ke file gambar
     * @param caption - Caption untuk gambar (opsional)
     */
    public async sendImage(to: string, imagePath: string, caption?: string): Promise<any> {
        try {
            if (!this.isAuthenticated || !this.isInitialized) {
                throw new Error('WhatsApp client is not ready');
            }

            // Cek apakah file exists
            if (!fs.existsSync(imagePath)) {
                throw new Error(`File not found: ${imagePath}`);
            }

            // Buat MessageMedia dari file
            const media = MessageMedia.fromFilePath(imagePath);

            // Kirim gambar dengan atau tanpa caption
            const result = await this.client.sendMessage(to, media, {
                caption: caption || ''
            });

            return {
                id: result.id,
                timestamp: result.timestamp,
                ack: result.ack,
                to: to,
                type: 'image',
                caption: caption
            };
        } catch (error) {
            console.error('Error sending image:', error);
            throw error;
        }
    }

    /**
     * Mengirim gambar dari URL dengan caption
     * @param to - Nomor tujuan
     * @param imageUrl - URL gambar
     * @param caption - Caption untuk gambar (opsional)
     */
    public async sendImageFromUrl(to: string, imageUrl: string, caption?: string): Promise<any> {
        try {
            if (!this.isAuthenticated || !this.isInitialized) {
                throw new Error('WhatsApp client is not ready');
            }

            // Download gambar dari URL
            const media = await MessageMedia.fromUrl(imageUrl);

            // Kirim gambar dengan atau tanpa caption
            const result = await this.client.sendMessage(to, media, {
                caption: caption || ''
            });

            return {
                id: result.id,
                timestamp: result.timestamp,
                ack: result.ack,
                to: to,
                type: 'image_url',
                caption: caption
            };
        } catch (error) {
            console.error('Error sending image from URL:', error);
            throw error;
        }
    }

    /**
     * Mengirim file attachment (dokumen, pdf, zip, dll)
     * @param to - Nomor tujuan
     * @param filePath - Path ke file
     * @param caption - Caption untuk file (opsional)
     * @param filename - Nama file yang akan ditampilkan (opsional)
     */
    public async sendFile(to: string, filePath: string, caption?: string, filename?: string): Promise<any> {
        try {
            if (!this.isAuthenticated || !this.isInitialized) {
                throw new Error('WhatsApp client is not ready');
            }

            // Cek apakah file exists
            if (!fs.existsSync(filePath)) {
                throw new Error(`File not found: ${filePath}`);
            }

            // Dapatkan nama file jika tidak disediakan
            const displayFilename = filename || path.basename(filePath);

            // Buat MessageMedia dari file
            const media = MessageMedia.fromFilePath(filePath);

            // Kirim file dengan options
            const result = await this.client.sendMessage(to, media, {
                caption: caption || '',
                sendMediaAsDocument: true
            });

            return {
                id: result.id,
                timestamp: result.timestamp,
                ack: result.ack,
                to: to,
                type: 'document',
                filename: displayFilename,
                caption: caption
            };
        } catch (error) {
            console.error('Error sending file:', error);
            throw error;
        }
    }

    /**
     * Mengirim file dari Base64
     * @param to - Nomor tujuan
     * @param base64Data - Data base64
     * @param mimeType - MIME type file
     * @param filename - Nama file
     * @param caption - Caption (opsional)
     */
    public async sendFileFromBase64(
        to: string, 
        base64Data: string, 
        mimeType: string, 
        filename: string, 
        caption?: string
    ): Promise<any> {
        try {
            if (!this.isAuthenticated || !this.isInitialized) {
                throw new Error('WhatsApp client is not ready');
            }

            // Buat MessageMedia dari base64
            const media = new MessageMedia(mimeType, base64Data, filename);

            // Tentukan apakah ini dokumen atau gambar/video
            const isDocument = !mimeType.startsWith('image/') && !mimeType.startsWith('video/');

            // Kirim file
            const result = await this.client.sendMessage(to, media, {
                caption: caption || '',
                sendMediaAsDocument: isDocument
            });

            return {
                id: result.id,
                timestamp: result.timestamp,
                ack: result.ack,
                to: to,
                type: isDocument ? 'document' : 'media',
                filename: filename,
                caption: caption
            };
        } catch (error) {
            console.error('Error sending file from base64:', error);
            throw error;
        }
    }

    /**
     * Mengirim multiple files sekaligus
     * @param to - Nomor tujuan
     * @param files - Array of file objects
     */
    public async sendMultipleFiles(
        to: string, 
        files: Array<{
            path?: string;
            url?: string;
            base64?: string;
            mimeType?: string;
            filename?: string;
            caption?: string;
        }>
    ): Promise<any[]> {
        try {
            if (!this.isAuthenticated || !this.isInitialized) {
                throw new Error('WhatsApp client is not ready');
            }

            const results = [];

            for (const file of files) {
                let result;
                
                if (file.path) {
                    // Kirim dari file path
                    const mimeType = mime.lookup(file.path) || 'application/octet-stream';
                    
                    if (mimeType.startsWith('image/')) {
                        result = await this.sendImage(to, file.path, file.caption);
                    } else {
                        result = await this.sendFile(to, file.path, file.caption, file.filename);
                    }
                } else if (file.url) {
                    // Kirim dari URL
                    result = await this.sendImageFromUrl(to, file.url, file.caption);
                } else if (file.base64 && file.mimeType && file.filename) {
                    // Kirim dari base64
                    result = await this.sendFileFromBase64(
                        to, 
                        file.base64, 
                        file.mimeType, 
                        file.filename, 
                        file.caption
                    );
                }

                if (result) {
                    results.push(result);
                    // Delay untuk menghindari spam detection
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            return results;
        } catch (error) {
            console.error('Error sending multiple files:', error);
            throw error;
        }
    }

    /**
     * Mengirim video dengan caption
     * @param to - Nomor tujuan
     * @param videoPath - Path ke file video
     * @param caption - Caption untuk video (opsional)
     */
    public async sendVideo(to: string, videoPath: string, caption?: string): Promise<any> {
        try {
            if (!this.isAuthenticated || !this.isInitialized) {
                throw new Error('WhatsApp client is not ready');
            }

            // Cek apakah file exists
            if (!fs.existsSync(videoPath)) {
                throw new Error(`Video file not found: ${videoPath}`);
            }

            // Buat MessageMedia dari file
            const media = MessageMedia.fromFilePath(videoPath);

            // Kirim video dengan atau tanpa caption
            const result = await this.client.sendMessage(to, media, {
                caption: caption || '',
                sendMediaAsDocument: false
            });

            return {
                id: result.id,
                timestamp: result.timestamp,
                ack: result.ack,
                to: to,
                type: 'video',
                caption: caption
            };
        } catch (error) {
            console.error('Error sending video:', error);
            throw error;
        }
    }

    /**
     * Mengirim audio/voice note
     * @param to - Nomor tujuan
     * @param audioPath - Path ke file audio
     * @param ptt - Send as Push To Talk (voice note) - default false
     */
    public async sendAudio(to: string, audioPath: string, ptt: boolean = false): Promise<any> {
        try {
            if (!this.isAuthenticated || !this.isInitialized) {
                throw new Error('WhatsApp client is not ready');
            }

            // Cek apakah file exists
            if (!fs.existsSync(audioPath)) {
                throw new Error(`Audio file not found: ${audioPath}`);
            }

            // Buat MessageMedia dari file
            const media = MessageMedia.fromFilePath(audioPath);

            // Kirim audio
            const result = await this.client.sendMessage(to, media, {
                sendAudioAsVoice: ptt
            });

            return {
                id: result.id,
                timestamp: result.timestamp,
                ack: result.ack,
                to: to,
                type: ptt ? 'voice_note' : 'audio'
            };
        } catch (error) {
            console.error('Error sending audio:', error);
            throw error;
        }
    }
}