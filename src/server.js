import express from 'express'
import authRoutes from '../src/routes/authRoutes.js'
import logger from './utils/logger.js'
import cookieParser from 'cookie-parser';

const app = express()

app.use(express.json())
app.use(cookieParser());

const PORT = process.env.PORT || 8848

//ROUTES
app.use('/', authRoutes)

//server start
app.listen(PORT, ()=>{
     logger.info(`Server running on port ${PORT}`)
})