/*
 * Filename: e:\NODE\wanotif\src\controllers\whatsapp.controller.ts
 * Path: e:\NODE\wanotif
 * Created Date: Monday, September 8th 2025, 11:04:41 am
 * Author: Rede
 * 
 * Copyright (c) 2022 10RI Dev
 */

import { Request, Response } from 'express';
import { WhatsAppService } from '../services/whatsapp.service';
import { ApiResponse } from '../helpers/responseApi.helper';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = './uploads';
        // Buat folder uploads jika belum ada
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

export const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB max file size
    }
});


interface WhatsAppGroup {
    id: string;
    name: string;
}

export class WhatsAppController {
    private static whatsapp: WhatsAppService = WhatsAppService.getInstance();

    // Helper untuk konversi waktu ke timezone +08:00 (Asia/Singapore)
    private static convertToTimezone(dateString: string, timezoneInfo?: any): string {
        try {
            let date: Date;
            
            // Jika ada informasi timezone dari parameter
            if (timezoneInfo && timezoneInfo.timezone && timezoneInfo.timezone_offset) {
                // Gabungkan datetime dengan offset yang ada
                const dateTimeWithOffset = `${dateString}${timezoneInfo.timezone_offset}`;
                date = new Date(dateTimeWithOffset);
                
                console.log(`Parsing with timezone info: "${dateTimeWithOffset}"`);
            } else {
                // Fallback ke metode sebelumnya
                const hasTimezone = /[+-]\d{2}:?\d{2}$|Z$/.test(dateString.trim()) || 
                                   dateString.includes('GMT') || 
                                   dateString.includes('UTC');
                
                if (hasTimezone) {
                    date = new Date(dateString);
                } else {
                    date = new Date(dateString);
                    if (isNaN(date.getTime())) {
                        const isoFormat = dateString.replace(' ', 'T');
                        date = new Date(isoFormat);
                    }
                }
            }
            
            // Validasi apakah date berhasil dibuat
            if (isNaN(date.getTime())) {
                console.warn('Invalid date format:', dateString);
                return dateString;
            }
            
            // Konversi ke timezone +08:00 (Asia/Singapore)
            const options: Intl.DateTimeFormatOptions = {
                timeZone: 'Asia/Singapore',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            };
            
            const converted = date.toLocaleString('en-CA', options).replace(',', '');
            
            // Log untuk debugging
            console.log(`Time conversion: "${dateString}" (${timezoneInfo?.timezone || 'unknown'}) -> "${converted}" (+08:00)`);
            
            return converted;
        } catch (error) {
            console.error('Error converting timezone:', error);
            return dateString;
        }
    }

    // Helper untuk format nomor telepon
    private static formatPhoneNumber(phone: string): string {
        // Hapus karakter non-numerik
        let cleaned = phone.replace(/\D/g, '');
        
        // Hapus awalan 0 jika ada
        if (cleaned.startsWith('0')) {
            cleaned = cleaned.substring(1);
        }
        
        // Tambahkan kode negara jika belum ada
        if (!cleaned.startsWith('62')) {
            cleaned = '62' + cleaned;
        }
        
        // Tambahkan suffix @c.us untuk format WhatsApp
        return cleaned + '@c.us';
    }

    // Kirim pesan ke nomor tertentu
    public static async sendMessage(req: Request, res: Response): Promise<void> {
        try {
            const { phone, message } = req.body;

            if (!phone || !message) {
                // res.status(400).json(responseApi(400, 'Phone number and message are required'));
                // return;
                ApiResponse.customError(res, 400, 'Phone number and message are required');
                return;
            }

            // Format nomor telepon menggunakan direct call ke static method
            const formattedPhone = WhatsAppController.formatPhoneNumber(phone);

            // Kirim pesan menggunakan direct reference ke static property
            const result = await WhatsAppController.whatsapp.sendMessage(formattedPhone, message);

            ApiResponse.success(res, result);
        } catch (error) {
            console.error('Error sending message:', error);
            // res.status(500).json(responseApi(500, 'Failed to send message', error));
            ApiResponse.customError(res, 500, 'Failed to send message');
        }
    }

    // Cek status koneksi WhatsApp
    public static async sendNotifikasi(req: Request, res: Response): Promise<void> {
        console.log('Sending Alert Notification');
        try {
            const { title, msg, status, alert_details } = req.body;
            
            if (!msg || !alert_details) {
                // res.status(400).json(responseApi(400, 'Message and alert details are required'));
                // return;
                ApiResponse.customError(res, 400, 'Message and alert details are required');
                return;
            }
    
            // Membuat pesan yang profesional
            const statusEmoji = status === 0 ? '🔴' : '🟢';
            const statusText = status === 0 ? 'DOWN' : 'UP';
            const convertedTime = WhatsAppController.convertToTimezone(alert_details.time_info.local_datetime, alert_details.time_info);
            
            const message = `*${title}*\n\n` +
                // `*Status:* ${statusEmoji} ${statusText}\n` +
                `*Message:* ${msg}\n` +
                `*Monitor Information:*\n` +
                `- Name: ${alert_details.monitor_info.name}\n` +
                `- Description: ${alert_details.monitor_info.description || 'N/A'}\n` +
                `- Host: ${alert_details.monitor_info.hostname}:${alert_details.monitor_info.port}\n` +
                `- Type: ${alert_details.monitor_info.type}\n` +
                `- Method: ${alert_details.monitor_info.method}\n` +
                `- Time: ${convertedTime} (+08:00)\n` +
                `- Timezone: Asia/Singapore\n\n` +
                `_System Status: ${status ? 'Under Maintenance' : 'Active'}_`;
    
            // Format nomor telepon menggunakan direct call ke static method
            const groupId = '120363355538083472@g.us';
            
            // Kirim pesan
            const result = await WhatsAppController.whatsapp.sendMessage(groupId, message);
            
            // Log untuk tracking
            console.log(`Alert sent: ${title}`);
            
            // res.json(responseApi(200, 'Alert notification sent successfully', result));
            // return ApiResponse.success(res,result);
        } catch (error) {

            console.error('Error sending alert notification:', error);
            return ApiResponse.customError(res, 500, 'Failed to send alert notification');
        }
    }
    
    public static async getStatus(req: Request, res: Response): Promise<void> {
        try {
            const status = {
                authenticated: this.whatsapp.getAuthStatus(),
                ready: this.whatsapp.isReady()
            };
            // res.json(responseApi(200, status));
            return ApiResponse.success(res, status);
        } catch (error) {
            // res.status(500).json(responseApi(500, 'Failed to get status', error));
            return ApiResponse.customError(res, 500, 'Failed to get status');
        }
    }

    public static async sendReply(req: Request, res: Response): Promise<void> {
        try {
            const { phone, message, quotedMessageId } = req.body;

            if (!phone || !message || !quotedMessageId) {
                // res.status(400).json(responseApi(400, 'Phone number, message, and quoted message ID are required'));
                // return;
                return ApiResponse.customError(res, 400, 'Phone number, message, and quoted message ID are required');
            }

            const formattedPhone = WhatsAppController.formatPhoneNumber(phone);
            const result = await WhatsAppController.whatsapp.sendReply(
                formattedPhone,
                message,
                quotedMessageId
            );

            // res.json(responseApi(200, 'Reply sent successfully', result));
            return ApiResponse.success(res,result);
        } catch (error) {
            // console.error('Error sending reply:', error);
            // res.status(500).json(responseApi(500, 'Failed to send reply', error));
            return ApiResponse.customError(res, 500, 'Failed to send reply');
        }
    }

    public static async getGroups(req: Request, res: Response): Promise<void> {
        try {
            // Periksa status client
            if (!WhatsAppController.whatsapp.isReady()) {
                // res.status(400).json(responseApi(400, 'WhatsApp client is not ready', null));
                // return;
                return ApiResponse.customError(res, 400, 'WhatsApp client is not ready');
            }

            // Ambil semua chat menggunakan getChats
            const chats = await WhatsAppController.whatsapp.getChats();
            console.log('Total chats found:', chats.length); // Debug log

            // Filter group chats
            const groups = chats
                .filter(chat => chat.isGroup)
                .map(group => ({
                    id: group.id._serialized,
                    name: group.name || 'Unnamed Group',
                }));

            console.log('Found groups:', groups.length); // Debug log
            // res.json(responseApi(200,  groups));
            return ApiResponse.success(res, groups);
        } catch (error) {
            console.error('Error getting groups:', error);
            // res.status(500).json(responseApi(500, 'Failed to get groups', error));
            return ApiResponse.customError(res, 500, 'Failed to get groups');
        }
    }


    public static async uptimeKuma(req: Request, res: Response): Promise<void> {
        console.log('Sending Alert Notification');
        try {
            const { title, msg, status, alert_details } = req.body;
            const { groupid } = req.query;
            
            if (!msg || !alert_details) {
                // res.status(400).json(responseApi(400, 'Message and alert details are required'));
                // return;
                return ApiResponse.customError(res, 400, 'Message and alert details are required');
            }

            if (!groupid) {
                return ApiResponse.customError(res, 400, 'Group ID is required in URL parameters');
            }

            console.log("##################",  title, msg, status, alert_details, "groupid:", groupid, "################" )
    
            // Membuat pesan yang profesional
            const statusEmoji = alert_details.incident_info.status == '0' ? '🔴' : '🟢';
            const statusText = alert_details.incident_info.status == '0' ? 'OFFLINE' : 'ONLINE';
            
            // const keterangan = alert_details.monitor_info.name + ' ' + alert_details.incident_info.error_message
            const keterangan =  alert_details.incident_info.error_message
            const convertedTime = WhatsAppController.convertToTimezone(alert_details.time_info.local_datetime, alert_details.time_info);
            const message = `${statusEmoji} *${title}* \n\n` +
                // `*Status:* ${statusEmoji} ${statusText}\n` +
                `*Message:* ${keterangan}\n\n` +
                `*Informasi :*\n` +
                `- App      : ${alert_details.monitor_info.name}\n` +
                `- Waktu    : ${convertedTime} (+08:00)\n` +
                `- Status   : ${statusText}` +
                `${alert_details.monitor_info.description ? `\n- Keterangan   : ${alert_details.monitor_info.description}` : ''}\n\n`;
                
            // Format nomor telepon menggunakan direct call ke static method
            // const groupid = '120363355538083472@g.us'; GROUP WA COBALAGI
            // const groupid = '120363369382696934@g.us'; // GROUP WA NOT IF
            const targetgroupid = typeof groupid === 'string' ? groupid : '120363369382696934@g.us'; // Default group if not provided
            
            // Kirim pesan
            const result = await WhatsAppController.whatsapp.sendMessage(targetgroupid, message);

            // Log untuk tracking
            console.log(`Alert sent: ${title}`);
            
            // res.json(responseApi(200, 'Alert notification sent successfully', result));
            return ApiResponse.success(res, result);
        } catch (error) {
            console.error('Error sending alert notification:', error);
            // res.status(500).json(responseApi(500, 'Failed to send alert notification', error));
           return ApiResponse.customError(res, 500, 'Failed to send alert notification');
        }
    }

    public static async kirimGroup(req: Request, res: Response): Promise<void> {
        console.log('Sending Alert Notification');
        try {
            const { message } = req.body;
            const { groupid } = req.query;
            
            if (!message ) {
                return ApiResponse.customError(res, 400, 'Message and title are required');
            }

            if (!groupid) {
                return ApiResponse.customError(res, 400, 'Group ID is required in URL parameters');
            }
            
            const pesan = `${message}`;

            const targetgroupid = typeof groupid === 'string' ? groupid : '120363369382696934@g.us'; // Default group if not provided

            // Kirim pesan
            const result = await WhatsAppController.whatsapp.sendMessage(targetgroupid, pesan);
            
            console.log(`Target Group ID: ${targetgroupid}`);
            // res.json(responseApi(200, 'Alert notification sent successfully', result));
            return ApiResponse.success(res, result);
        } catch (error) {
            console.error('Error sending alert notification:', error);
            // res.status(500).json(responseApi(500, 'Failed to send alert notification', error));
           return ApiResponse.customError(res, 500, 'Failed to send alert notification');
        }
    }

    /**
     * Endpoint untuk mengirim gambar
     * POST /api/whatsapp/send-image
     */
    public static async sendImage(req: Request, res: Response): Promise<void> {
        try {
            const { phone, imagePath, imageUrl, caption } = req.body;

            // Validasi input
            if (!phone) {
                return ApiResponse.customError(res, 400, 'Phone number is required');
            }

            if (!imagePath && !imageUrl) {
                return ApiResponse.customError(res, 400, 'Either imagePath or imageUrl is required');
            }

            // Format nomor telepon
            const formattedPhone = WhatsAppController.formatPhoneNumber(phone);

            let result;
            if (imagePath) {
                // Kirim gambar dari file path
                result = await WhatsAppController.whatsapp.sendImage(
                    formattedPhone,
                    imagePath,
                    caption
                );
            } else if (imageUrl) {
                // Kirim gambar dari URL
                result = await WhatsAppController.whatsapp.sendImageFromUrl(
                    formattedPhone,
                    imageUrl,
                    caption
                );
            }

            console.log('Image sent successfully to:', formattedPhone);
            return ApiResponse.success(res, result);
        } catch (error) {
            console.error('Error sending image:', error);
            return ApiResponse.customError(res, 500, 'Failed to send image');
        }
    }
    
    /**
     * Endpoint untuk mengirim gambar ke grup
     * POST /api/whatsapp/send-group-image
     */
    public static async sendGroupImage(req: Request, res: Response): Promise<void> {
        try {
            const { imagePath, imageUrl, caption } = req.body;
            const { groupid } = req.query;

            // Validasi input
            if (!groupid) {
                return ApiResponse.customError(res, 400, 'Group ID is required in URL parameters');
            }

            if (!imagePath && !imageUrl) {
                return ApiResponse.customError(res, 400, 'Either imagePath or imageUrl is required');
            }

            const targetGroupId = typeof groupid === 'string' ? groupid : '120363369382696934@g.us';

            let result;
            if (imagePath) {
                result = await WhatsAppController.whatsapp.sendImage(
                    targetGroupId,
                    imagePath,
                    caption
                );
            } else if (imageUrl) {
                result = await WhatsAppController.whatsapp.sendImageFromUrl(
                    targetGroupId,
                    imageUrl,
                    caption
                );
            }

            console.log('Image sent to group:', targetGroupId);
            return ApiResponse.success(res, result);
        } catch (error) {
            console.error('Error sending group image:', error);
            return ApiResponse.customError(res, 500, 'Failed to send image to group');
        }
    }

     /**
     * Endpoint untuk mengirim file dengan upload
     * POST /api/whatsapp/send-file
     * Menggunakan form-data dengan file upload
     */
    public static async sendFileWithUpload(req: Request, res: Response): Promise<void> {
        try {
            // Debug logging
            console.log('Form data received:', {
                body: req.body,
                file: req.file,
                files: req.files
            });

            const { phone, caption } = req.body;
            const file = req.file;

            // Validasi input
            if (!phone) {
                // Hapus file yang diupload jika validasi gagal
                if (file) fs.unlinkSync(file.path);
                return ApiResponse.customError(res, 400, 'Phone number is required');
            }

            if (!file) {
                return ApiResponse.customError(res, 400, 'File is required');
            }

            // Format nomor telepon
            const formattedPhone = WhatsAppController.formatPhoneNumber(phone);

            // Tentukan apakah file adalah gambar atau dokumen
            const isImage = file.mimetype.startsWith('image/');
            let result;

            if (isImage) {
                // Kirim sebagai gambar
                result = await WhatsAppController.whatsapp.sendImage(
                    formattedPhone,
                    file.path,
                    caption
                );
            } else {
                // Kirim sebagai dokumen
                result = await WhatsAppController.whatsapp.sendFile(
                    formattedPhone,
                    file.path,
                    caption,
                    file.originalname
                );
            }

            // Hapus file temporary setelah berhasil dikirim (opsional)
            // Anda bisa comment baris ini jika ingin menyimpan file
            setTimeout(() => {
                fs.unlinkSync(file.path);
            }, 5000); // Hapus setelah 5 detik

            console.log('File sent successfully to:', formattedPhone);
            return ApiResponse.success(res, {
                ...result,
                originalFilename: file.originalname,
                fileSize: file.size,
                mimeType: file.mimetype
            });
        } catch (error) {
            // Hapus file jika ada error
            if (req.file) {
                fs.unlinkSync(req.file.path);
            }
            console.error('Error sending file:', error);
            return ApiResponse.customError(res, 500, 'Failed to send file');
        }
    }

    /**
     * Endpoint untuk mengirim multiple files dengan upload
     * POST /api/whatsapp/send-multiple-upload
     */
    public static async sendMultipleFilesWithUpload(req: Request, res: Response): Promise<void> {
        try {
            const { phone, captions } = req.body;
            const files = req.files as Express.Multer.File[];

            // Validasi input
            if (!phone) {
                // Hapus semua file yang diupload
                if (files && files.length > 0) {
                    files.forEach(file => fs.unlinkSync(file.path));
                }
                return ApiResponse.customError(res, 400, 'Phone number is required');
            }

            if (!files || files.length === 0) {
                return ApiResponse.customError(res, 400, 'At least one file is required');
            }

            // Format nomor telepon
            const formattedPhone = WhatsAppController.formatPhoneNumber(phone);

            // Parse captions jika ada (bisa berupa JSON string array)
            let captionsArray: string[] = [];
            if (captions) {
                try {
                    captionsArray = typeof captions === 'string' ? JSON.parse(captions) : captions;
                } catch (e) {
                    // Jika bukan JSON, gunakan caption yang sama untuk semua file
                    captionsArray = Array(files.length).fill(captions);
                }
            }

            const results = [];
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const caption = captionsArray[i] || '';
                const isImage = file.mimetype.startsWith('image/');

                let result;
                if (isImage) {
                    result = await WhatsAppController.whatsapp.sendImage(
                        formattedPhone,
                        file.path,
                        caption
                    );
                } else {
                    result = await WhatsAppController.whatsapp.sendFile(
                        formattedPhone,
                        file.path,
                        caption,
                        file.originalname
                    );
                }

                results.push({
                    ...result,
                    originalFilename: file.originalname,
                    fileSize: file.size,
                    mimeType: file.mimetype
                });

                // Delay untuk menghindari spam
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // Hapus files setelah dikirim (opsional)
            setTimeout(() => {
                files.forEach(file => {
                    if (fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                });
            }, 5000);

            console.log(`${results.length} files sent successfully to:`, formattedPhone);
            return ApiResponse.success(res, results);
        } catch (error) {
            // Hapus semua file jika ada error
            if (req.files) {
                const files = req.files as Express.Multer.File[];
                files.forEach(file => {
                    if (fs.existsSync(file.path)) {
                        fs.unlinkSync(file.path);
                    }
                });
            }
            console.error('Error sending multiple files:', error);
            return ApiResponse.customError(res, 500, 'Failed to send multiple files');
        }
    }

    /**
     * Endpoint untuk mengirim file ke grup dengan upload
     * POST /api/whatsapp/send-group-file-upload?groupid=xxx
     */
    public static async sendGroupFileWithUpload(req: Request, res: Response): Promise<void> {
        try {
            const { caption } = req.body;
            const { groupid } = req.query;
            const file = req.file;

            // Validasi input
            if (!groupid) {
                if (file) fs.unlinkSync(file.path);
                return ApiResponse.customError(res, 400, 'Group ID is required in URL parameters');
            }

            if (!file) {
                return ApiResponse.customError(res, 400, 'File is required');
            }

            const targetGroupId = typeof groupid === 'string' ? groupid : '120363369382696934@g.us';

            // Tentukan apakah file adalah gambar atau dokumen
            const isImage = file.mimetype.startsWith('image/');
            let result;

            if (isImage) {
                result = await WhatsAppController.whatsapp.sendImage(
                    targetGroupId,
                    file.path,
                    caption
                );
            } else {
                result = await WhatsAppController.whatsapp.sendFile(
                    targetGroupId,
                    file.path,
                    caption,
                    file.originalname
                );
            }

            // Hapus file temporary setelah berhasil dikirim
            setTimeout(() => {
                if (fs.existsSync(file.path)) {
                    fs.unlinkSync(file.path);
                }
            }, 5000);

            console.log('File sent to group:', targetGroupId);
            return ApiResponse.success(res, {
                ...result,
                originalFilename: file.originalname,
                fileSize: file.size,
                mimeType: file.mimetype
            });
        } catch (error) {
            if (req.file && fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
            }
            console.error('Error sending group file:', error);
            return ApiResponse.customError(res, 500, 'Failed to send file to group');
        }
    }

}