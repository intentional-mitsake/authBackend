import express from 'express'
import { registerValidator, logValidator } from '../middleware/ authValidator.js'
import { regCredVerification, logCredVerification } from '../controllers/authController.js'
import { ratelimiter } from '../middleware/rate_limiter.js'
import { tokenVerification } from '../middleware/authMiddleware.js'
import { logout } from '../services/authServices.js'
const router = express.Router()

//registration
router.post('/auth/register', registerValidator, ratelimiter, regCredVerification)

//login
router.post('/auth/login', logValidator, ratelimiter,  logCredVerification)

//logout
router.post('/auth/logout', ratelimiter, tokenVerification,  logout)

export default router