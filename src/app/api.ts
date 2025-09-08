import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'

import indexRoute from '../routes/index.route'

dotenv.config()

// tambahkan pengecekan  


const app = express()
const port = process.env.PORT || 4888

app.use(cors())
// app.use(express.json())
// app.use(express.urlencoded({ extended: true }));
app.use((req, res, next) => {
    console.log('Incoming request body type:', typeof req.body);
    console.log('Incoming request body:', req.body);
    next();
});

app.use('/api', indexRoute)
app.use('/', (req, res) => {
    const response = {
      code: 401,
      message: 'Selamat Datang Di API Whatsapp IT DEV Ver. 1.0.1'
    }
    res
      .status(401)
      .json(response)
  })
export { app, port }
