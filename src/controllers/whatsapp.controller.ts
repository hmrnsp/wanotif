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

interface WhatsAppGroup {
    id: string;
    name: string;
}

export class WhatsAppController {
    private static whatsapp: WhatsAppService = WhatsAppService.getInstance();

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
            
            const message = `*${title}*\n\n` +
                // `*Status:* ${statusEmoji} ${statusText}\n` +
                `*Message:* ${msg}\n` +
                `*Monitor Information:*\n` +
                `- Name: ${alert_details.monitor_info.name}\n` +
                `- Description: ${alert_details.monitor_info.description || 'N/A'}\n` +
                `- Host: ${alert_details.monitor_info.hostname}:${alert_details.monitor_info.port}\n` +
                `- Type: ${alert_details.monitor_info.type}\n` +
                `- Method: ${alert_details.monitor_info.method}\n` +
                `- Time: ${alert_details.time_info.local_datetime}\n` +
                `- Timezone: ${alert_details.time_info.timezone}\n\n` +
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
            const statusText = alert_details.incident_info.status == '0' ? 'DOWN' : 'UP';
            
            const keterangan = alert_details.monitor_info.name + ' ' + alert_details.incident_info.error_message
            const message = `${statusEmoji} *${title}* \n\n` +
                // `*Status:* ${statusEmoji} ${statusText}\n` +
                `*Message:* ${keterangan}\n\n` +
                `*Monitor Information:*\n` +
                `- Name: ${alert_details.monitor_info.name}\n` +
                `- Time: ${alert_details.time_info.local_datetime}\n` +
                // `- Timezone: ${alert_details.time_info.timezone}\n` +
                `- Description: ${alert_details.monitor_info.description || 'N/A'}\n\n`;
    
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
}