# WhatsApp Notification API (WaNotif)

API untuk mengirim notifikasi WhatsApp menggunakan whatsapp-web.js dengan fitur monitoring dan alert system.

## 📋 Deskripsi

WaNotif adalah REST API yang memungkinkan Anda mengirim pesan WhatsApp secara programatis. API ini dibangun menggunakan TypeScript, Express.js, dan whatsapp-web.js. Cocok digunakan untuk sistem notifikasi, monitoring alert, dan integrasi dengan sistem lain seperti Uptime Kuma.

## ✨ Fitur

- 📱 **Kirim Pesan WhatsApp**: Kirim pesan ke nomor atau grup tertentu
- 🔔 **Sistem Notifikasi**: Khusus untuk alert dan monitoring  
- 📊 **Integrasi Uptime Kuma**: Webhook untuk monitoring server
- 👥 **Manajemen Grup**: Mendapatkan daftar grup dan ID grup
- 💬 **Reply Pesan**: Balas pesan tertentu dengan quote
- 🤖 **Bot Commands**: Perintah dasar untuk interaksi dengan bot
- 🔐 **QR Code Authentication**: Login menggunakan WhatsApp Web
- 📝 **Logging**: Sistem logging dengan Winston
- 🐳 **Docker Support**: Containerized deployment

## 🛠️ Teknologi yang Digunakan

- **Backend**: Node.js, TypeScript, Express.js
- **WhatsApp Integration**: whatsapp-web.js
- **Logging**: Winston dengan daily rotate
- **Authentication**: LocalAuth (WhatsApp Web)
- **Containerization**: Docker
- **Process Management**: PM2

## 🚀 Instalasi

### Prerequisites
- Node.js >= 18.x
- npm atau yarn
- Google Chrome/Chromium (untuk puppeteer)

### Local Development

1. **Clone repository**
```bash
git clone https://github.com/hmrnsp/wanotif.git
cd wanotif
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment variables**
```bash
cp .env.example .env
```

Edit `.env` file:
```env
PORT=4888
NODE_ENV=development
```

4. **Build project**
```bash
npm run build
```

5. **Run development server**
```bash
npm run dev
```

### Docker Deployment

1. **Build Docker image**
```bash
docker build -t wanotif .
```

2. **Run container**
```bash
docker run -d \
  --name wanotif-app \
  -p 4888:3000 \
  -v wanotif_sessions:/usr/src/app/.sessions \
  wanotif
```

### PM2 Deployment

```bash
npm run build
pm2 start ecosystem.config.js
```

## 📖 Penggunaan

### 1. Autentikasi WhatsApp

Setelah server berjalan, buka browser dan akses:
```
http://localhost:4888/api/wa/login
```

Scan QR code yang muncul dengan WhatsApp Anda.

### 2. Cek Status Koneksi

```bash
curl -X GET http://localhost:4888/api/wa/status
```

Response:
```json
{
  "authenticated": true,
  "ready": true
}
```

## 🔗 API Endpoints

### Base URL
```
http://localhost:4888/api
```

### Authentication Routes

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/wa/login` | Halaman login dengan QR code |
| GET | `/wa/qr` | Mendapatkan QR code dalam format base64 |
| GET | `/wa/status` | Cek status autentikasi |

### Messaging Routes

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/wa/send` | Kirim pesan ke nomor tertentu |
| POST | `/wa/notifikasi` | Kirim notifikasi ke grup default |
| POST | `/wa/reply` | Balas pesan tertentu |
| POST | `/wa/get-groups` | Dapatkan daftar grup |
| POST | `/wa/uptimekuma` | Webhook untuk Uptime Kuma |
| POST | `/wa/check` | Endpoint untuk testing |

## 📝 API Documentation

### 1. Kirim Pesan (`/wa/send`)

**Method:** POST

**Body:**
```json
{
  "phone": "628123456789",
  "message": "Halo, ini pesan dari API!"
}
```

**Response:**
```json
{
  "code": 200,
  "message": "Message sent successfully",
  "data": {
    "id": "message_id",
    "timestamp": 1693920000,
    "ack": 1,
    "to": "628123456789@c.us"
  }
}
```

### 2. Kirim Notifikasi (`/wa/notifikasi`)

**Method:** POST

**Body:**
```json
{
  "title": "Server Alert",
  "msg": "Server down detected",
  "status": 0,
  "alert_details": {
    "monitor_info": {
      "name": "Web Server",
      "description": "Main website",
      "hostname": "example.com",
      "port": 80,
      "type": "http",
      "method": "GET"
    },
    "time_info": {
      "local_datetime": "2023-09-05 10:00:00",
      "timezone": "Asia/Jakarta"
    }
  }
}
```

### 3. Reply Pesan (`/wa/reply`)

**Method:** POST

**Body:**
```json
{
  "phone": "628123456789",
  "message": "Ini balasan untuk pesan Anda",
  "quotedMessageId": "message_id_to_quote"
}
```

### 4. Dapatkan Daftar Grup (`/wa/get-groups`)

**Method:** POST

**Response:**
```json
{
  "code": 200,
  "message": "Success",
  "data": [
    {
      "id": "120363355538083472@g.us",
      "name": "Grup Monitoring"
    }
  ]
}
```

### 5. Uptime Kuma Webhook (`/wa/uptimekuma`)

**Method:** POST  
**Query Parameters:** `?groupId=YOUR_GROUP_ID`

**Body:**
```json
{
  "title": "Uptime Kuma Alert",
  "msg": "Service is down",
  "status": 0,
  "alert_details": {
    "monitor_info": {
      "name": "API Server",
      "description": "Main API endpoint"
    },
    "incident_info": {
      "status": "0",
      "error_message": "Connection timeout"
    },
    "time_info": {
      "local_datetime": "2023-09-05 10:00:00",
      "timezone": "Asia/Jakarta"
    }
  }
}
```

## 🤖 Bot Commands

Bot ini juga mendukung perintah interaktif di chat:

| Command | Deskripsi |
|---------|-----------|
| `!ping` | Cek koneksi bot |
| `!menu` | Tampilkan menu commands |
| `!info` | Informasi bot dan status |
| `!group` | Dapatkan ID grup (hanya di grup) |

## 📁 Struktur Project

```
wanotif/
├── src/
│   ├── app/
│   │   └── api.ts              # Setup Express app
│   ├── controllers/
│   │   └── whatsapp.controller.ts # Controller untuk WhatsApp
│   ├── services/
│   │   └── whatsapp.service.ts    # Service WhatsApp dengan singleton
│   ├── routes/
│   │   ├── index.route.ts         # Route utama
│   │   └── whatsapp.route.ts      # Route WhatsApp
│   ├── helpers/
│   │   ├── responseApi.helper.ts  # Helper untuk response API
│   │   └── requestContext.helper.ts
│   ├── libs/
│   │   └── winston.lib.ts         # Setup logging Winston
│   └── main.ts                    # Entry point aplikasi
├── logs/                          # Directory untuk log files
├── .sessions/                     # WhatsApp session data
├── Dockerfile                     # Docker configuration
├── ecosystem.config.js            # PM2 configuration
├── package.json
├── tsconfig.json
└── README.md
```

## ⚙️ Konfigurasi

### Environment Variables

```env
# Server Configuration
PORT=4888
NODE_ENV=production

# WhatsApp Configuration
WA_CLIENT_ID=main-instance
WA_SESSION_PATH=.sessions
```

### PM2 Configuration (ecosystem.config.js)

```javascript
module.exports = {
  apps: [
    {
      name: 'wanotif',
      script: './dist/main.js',
      watch: true,
      ignore_watch: ['src/logs'],
      time: true,
    },
  ],
}
```

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev          # Jalankan dengan nodemon + ts-node

# Production
npm run build        # Compile TypeScript
npm run prod         # Build dan jalankan dengan nodemon

# Testing
npm test             # Run tests (belum dikonfigurasi)
```

### Format Nomor Telepon

API secara otomatis memformat nomor telepon:
- Menghapus karakter non-numerik
- Menghapus awalan '0'
- Menambah kode negara '62' jika belum ada
- Menambah suffix '@c.us' untuk format WhatsApp

Contoh: `081234567890` → `6281234567890@c.us`

## 📊 Logging

Aplikasi menggunakan Winston untuk logging dengan fitur:
- Daily rotate files
- Error logs terpisah
- Console output untuk development
- Log format yang terstruktur

Log files disimpan di directory `logs/`:
- `YYYY-MM-DD.log` - General logs
- `error-YYYY-MM-DD.log` - Error logs

## 🐳 Docker

### Build & Run
```bash
# Build image
docker build -t wanotif:latest .

# Run dengan volume untuk sessions
docker run -d \
  --name wanotif \
  -p 4888:3000 \
  -v wanotif_sessions:/usr/src/app/.sessions \
  -e PORT=3000 \
  wanotif:latest
```

### Docker Compose
```yaml
version: '3.8'
services:
  wanotif:
    build: .
    ports:
      - "4888:3000"
    volumes:
      - wanotif_sessions:/usr/src/app/.sessions
    environment:
      - PORT=3000
      - NODE_ENV=production
    restart: unless-stopped

volumes:
  wanotif_sessions:
```

## 🔒 Keamanan

- Gunakan CORS untuk membatasi akses
- Implementasikan rate limiting
- Validasi input yang proper
- Gunakan HTTPS dalam production
- Jaga kerahasiaan session files

## 🚨 Troubleshooting

### Common Issues

1. **QR Code tidak muncul**
   - Pastikan Chromium/Chrome terinstall
   - Cek log untuk error puppeteer
   - Restart aplikasi

2. **Session terputus**
   - Hapus folder `.sessions`
   - Scan ulang QR code
   - Pastikan WhatsApp tidak login di device lain

3. **Pesan tidak terkirim**
   - Cek status autentikasi dengan `/wa/status`
   - Pastikan nomor format benar
   - Cek log untuk detail error

4. **Docker issues**
   - Pastikan volume untuk sessions
   - Cek environment variables
   - Monitor container logs

## 🤝 Contributing

1. Fork repository
2. Buat feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

Project ini menggunakan lisensi ISC. Lihat file `LICENSE` untuk detail.

## 👨‍💻 Author

**Rede (hamransp@gmail.com)**
- Copyright 2017 - 2025 10RI Dev

## 📞 Support

Jika ada pertanyaan atau masalah, silakan buat issue di GitHub atau hubungi email di atas.

---

## 🔗 Related Links

- [whatsapp-web.js Documentation](https://wwebjs.dev/)
- [Express.js Documentation](https://expressjs.com/)
- [PM2 Documentation](https://pm2.keymetrics.io/)
- [Docker Documentation](https://docs.docker.com/)

---

**Happy Coding! 🚀**
