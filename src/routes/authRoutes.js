import express from 'express'
import { registerValidator, logValidator } from '../middleware/ authValidator.js'
import { regCredVerification, logCredVerification, rotateController, stateController, sessionController } from '../controllers/authController.js'
import { ratelimiter } from '../middleware/rate_limiter.js'
import { requireRole, tokenVerification } from '../middleware/authMiddleware.js'
import { logout, getProfile, getUsers, promoteUser } from '../services/authServices.js'
import { healthCheck } from '../services/healthServices.js'
import { metrics } from '../utils/metrics.js'
import { rotateRefreshToken } from '../services/tokenServices.js'


const router = express.Router()

//registration
router.post('/auth/register', ratelimiter, registerValidator, regCredVerification)

//login
router.post('/auth/login', ratelimiter, logValidator, logCredVerification)
router.post('/auth/refresh', ratelimiter, rotateController, rotateRefreshToken)
router.get('/auth/sessions', ratelimiter, tokenVerification, stateController)
router.post('/auth/session', ratelimiter, tokenVerification, sessionController)

//logout
router.post('/auth/logout', ratelimiter, tokenVerification,  logout)

// observability endpoitns
router.get('/health', healthCheck)
router.get('/metrics', (req, res) => res.json(metrics))

// user info
router.get('/user', ratelimiter, tokenVerification, requireRole('admin', 'user'), getProfile)
// admin endpoints
router.get('/admin/users', ratelimiter, tokenVerification, requireRole('admin'), getUsers)
router.patch('/admin/users/:id/role', ratelimiter, tokenVerification, requireRole('admin'), promoteUser)

export default router