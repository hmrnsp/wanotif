/*
 * File: whatsapp.route.ts
 * Project: wwebjs
 * File Created: Monday, 25th November 2024 4:46:35 pm
 * Author: Rede (hamransp@gmail.com)
 * Last Modified: Tue Sep 09 2025
 * Copyright 2017 - 2022 10RI Dev
 */

import { Router, Request, Response } from 'express';
import { WhatsAppService } from '../services/whatsapp.service';
import { WhatsAppController } from '../controllers/whatsapp.controller';
import QRCode from 'qrcode';

const router = Router();
const whatsapp: WhatsAppService = WhatsAppService.getInstance();

const loginTemplate = `
<!DOCTYPE html>
<html>
<head>
    <title>WhatsApp Web Login</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background-color: #f0f2f5;
        }
        .container {
            text-align: center;
            background: white;
            padding: 2rem;
            border-radius: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        #qrcode {
            margin: 20px 0;
        }
        .status {
            margin-top: 1rem;
            padding: 1rem;
            border-radius: 5px;
        }
        .loading {
            color: #555;
        }
        .error {
            color: #dc3545;
        }
        .success {
            color: #28a745;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>WhatsApp Web Login</h1>
        <div id="qrcode"></div>
        <div id="status" class="status loading">Memuat QR Code...</div>
    </div>
    <script>
        function checkStatus() {
            fetch('/api/wa/status')
                .then(res => res.json())
                .then(data => {
                    const statusDiv = document.getElementById('status');
                    if (data.authenticated) {
                        statusDiv.className = 'status success';
                        statusDiv.textContent = 'WhatsApp telah terautentikasi!';
                        clearInterval(qrInterval);
                        clearInterval(statusInterval);
                        setTimeout(() => {
                            window.location.href = '/status'; // Redirect ke status
                        }, 2000);
                    }
                })
                .catch(console.error);
        }

        function updateQR() {
            fetch('/api/wa/qr')
                .then(res => res.json())
                .then(data => {
                    if (data.qr) {
                        document.getElementById('qrcode').innerHTML = 
                            '<img src="' + data.qr + '" alt="QR Code">';
                        document.getElementById('status').textContent = 
                            'Silakan scan QR Code dengan WhatsApp Anda';
                    }
                })
                .catch(console.error);
        }

        const qrInterval = setInterval(updateQR, 10000); // Update QR setiap 10 detik
        const statusInterval = setInterval(checkStatus, 3000); // Cek status setiap 3 detik
        updateQR(); // Initial QR fetch
        checkStatus(); // Initial status check
    </script>
</body>
</html>
`;
// Route untuk halaman login WhatsApp
// Untuk Pertama kali login, akan menampilkan QR code  
// Jika sudah login, akan redirect ke dashboard
router.get('/login', (req, res) => {
    if (whatsapp.getAuthStatus()) {
        return res.redirect('/status'); // Redirect jika sudah login
    }
    res.send(loginTemplate);
});

// Route untuk mendapatkan QR code dalam format base64
router.get('/qr', async (req: Request, res: Response): Promise<void> => {
    try {
        const qr = whatsapp.getCurrentQR();
        if (!qr) {
            res.json({ error: 'QR Code tidak tersedia' });
            return;
        }

        // Generate QR code sebagai gambar base64
        const qrImage = await QRCode.toDataURL(qr);
        res.json({ qr: qrImage });
    } catch (error) {
        res.status(500).json({ error: 'Gagal generate QR code' });
    }
});

// Route untuk cek status autentikasi
router.get('/status', (req, res) => {
    res.json({
        authenticated: whatsapp.getAuthStatus(),
        ready: whatsapp.isReady()
    });
});

router.post('/kirim', WhatsAppController.sendMessage);
router.post('/notifikasi', WhatsAppController.sendNotifikasi);
router.post('/reply', WhatsAppController.sendReply); // untuk membalas pesan
router.get('/get-groups', WhatsAppController.getGroups); // untuk mendapatkan daftar grup beserta id nya
router.post('/uptimekuma', WhatsAppController.uptimeKuma); // POST /api/wa/uptimekuma?groupId=YOUR_GROUP_ID_HERE
router.post('/kirim-group', WhatsAppController.kirimGroup); // POST /api/wa/kirim-group?groupId=YOUR_GROUP_ID_HERE

router.post('/check', (req, res) => {
    console.log('Check endpoint hit');
    console.log("==============================================")
    console.log('Body ##### ', req.body);
    console.log('query ##### ',req.query);
    console.log('params ##### ',req.params);
    console.log("==============================================")
    res.json({
        code: 200, 
        message: req.body
    });
});
export default router;