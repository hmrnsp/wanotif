/*
 * File: main.ts
 * Project: wwebjs
 * File Created: Monday, 25th November 2024 4:38:39 pm
 * Author: Rede (hamransp@gmail.com)
 * Last Modified: Mon Sep 08 2025
 * Copyright 2017 - 2022 10RI Dev
 */

import { app, port } from './app/api'
// import { ApiResponse } from './helpers/responseApi.helper'
import { WhatsAppService } from './services/whatsapp.service'

async function initializeServer() {
    let server: any = null
    try {
        // Inisialisasi WhatsApp
        const whatsapp = WhatsAppService.getInstance();
        await whatsapp.initialize();
        console.log('WhatsApp service has been initialized.');

        // Function to start server
        const startServer = () => {
            return new Promise((resolve, reject) => {
                server = app
                    .listen(port)
                    .on('listening', () => {
                        console.log('App is running on port', port)
                        // console.log(responseApi(200, 'Ready... :)'))
                        // ApiResponse.success(null, 'Ready... :)')
                        resolve(server)
                    })
                    .on('error', (err: NodeJS.ErrnoException) => {
                        reject(err)
                    })
            })
        }

        // Start the server
        await startServer()
    } catch (error) {
        console.log('Unable to start server:', error)
        await cleanup()
        process.exit(1)
    }
    return server
}

async function cleanup() {
    try {
        // await db.closeConnection()
        console.log('Database connection closed.')
    } catch (error) {
        console.log('Error during cleanup:', error)
    }
}

// Graceful shutdown handlers remain the same
process.on('SIGINT', async () => {
    // await cleanup()
    process.exit(0)
})

process.on('uncaughtException', async (error) => {
    console.error('Uncaught Exception:', error)
    // await cleanup()
    process.exit(1)
})

process.on('unhandledRejection', async (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason)
    // await cleanup()
    process.exit(1)
})

let server = initializeServer()