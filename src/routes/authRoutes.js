import express from 'express'
import { registerValidator, logValidator } from '../middleware/ authValidator.js'
import { regCredVerification, logCredVerification } from '../controllers/authController.js'
import { ratelimiter } from '../middleware/rate_limiter.js'
import { tokenVerification } from '../middleware/authMiddleware.js'
import { logout } from '../services/authServices.js'
import { healthCheck } from '../services/healthServices.js'
import { metrics } from '../utils/metrics.js'
import { rotateRefreshToken } from '../services/tokenServices.js'


const router = express.Router()

//registration
router.post('/auth/register', ratelimiter, registerValidator, regCredVerification)

//login
router.post('/auth/login', ratelimiter, logValidator, logCredVerification)
router.post('/auth/refresh', ratelimiter, rotateRefreshToken)

//logout
router.post('/auth/logout', ratelimiter, tokenVerification,  logout)

// observability endpoitns
router.get('/health', healthCheck)
router.get('/metrics', (req, res) => res.json(metrics))


export default router