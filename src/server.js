import express from 'express'
import authRoutes from '../src/routes/authRoutes.js'
import logger from './utils/logger.js'
import cookieParser from 'cookie-parser';
import cors from 'cors';
import dotenv from 'dotenv';

// loading env variables first
dotenv.config();

const app = express()

app.use(cors(
     {
          origin: 'http://127.0.0.1:5500',// this is the url of the frontend
          credentials: true
     }
));

app.use(express.json())
app.use(cookieParser());

const PORT = process.env.PORT || 8848

//ROUTES
app.use('/', authRoutes)

//server start
app.listen(PORT, ()=>{
     logger.info(`Server running on port ${PORT}`)
})