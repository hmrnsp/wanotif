/*
 * Filename: e:\NODE\wanotif\ecosystem.config.js
 * Path: e:\NODE\wanotif
 * Created Date: Monday, September 8th 2025, 4:02:58 pm
 * Author: Rede
 * 
 * Copyright (c) 2022 10RI Dev
 */

module.exports = {
  apps: [
    {
      name: 'wanotif',
      script: './dist/main.js',
      watch: false, // Nonaktifkan watch mode untuk production
      ignore_watch: ['src/logs', 'logs', 'node_modules', '.sessions'], // Mengecualikan folder dari pemantauan
      time: true, // Mengaktifkan opsi time
      max_restarts: 5, // Batasi jumlah restart
      restart_delay: 1000, // Delay antar restart
      autorestart: true,
      max_memory_restart: '1G',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log',
      env: {
        NODE_ENV: 'production'
      }
    },
  ],
}
