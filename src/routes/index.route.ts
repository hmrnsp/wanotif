/*
 * File: index.route.ts
 * Project: wwebjs
 * File Created: Monday, 25th November 2024 4:31:27 pm
 * Author: Rede (hamransp@gmail.com)
 * Last Modified: Mon Sep 08 2025
 * Copyright 2017 - 2022 10RI Dev
 */

import express from 'express'
import whatsapp from './whatsapp.route'

// Konfigurasi Helmet untuk keamanan

const router = express.Router()

router.use(express.json({ strict: false, limit: '1mb',type: ['application/json']
}))
// router.use(express.json())

router.use('/wa', whatsapp)
// 404 handler
router.use((req, res) => {
  res.status(404).json({
    code: 404,
    message: 'Not Found',
    data: [
      {
        url: req.originalUrl ?? null,
        method: req.method ?? null,
        rawHeaders: req.rawHeaders ?? null,
        param: req.params ?? null,
        query: req.query ?? null,
        body: req.body ?? null,
      },
    ],
  })
})

export default router
