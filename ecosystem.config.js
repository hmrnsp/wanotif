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
      name: 'apiranmor',
      script: './dist/main.js',
      watch: true,
      ignore_watch: ['src/logs'], // Mengecualikan folder src/logs dari pemantauan
      time: true, // Mengaktifkan opsi time
    },
  ],
}
