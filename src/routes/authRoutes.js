import express from 'express'
import { registerValidator, logValidator } from '../middleware/ authValidator.js'
import { regCredVerification, logCredVerification, rotateController, stateController, sessionController, getProfile, getUsers, promoteUser, banUser, restoreUser, auditLogs } from '../controllers/authController.js'
import { ratelimiter } from '../middleware/rate_limiter.js'
import { requireRole, tokenVerification } from '../middleware/authMiddleware.js'
import { logout } from '../services/authServices.js'
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
router.delete('/auth/session/:familyId', ratelimiter, tokenVerification, sessionController)

//logout
router.post('/auth/logout', ratelimiter, tokenVerification,  logout)

// observability endpoitns
router.get('/health', healthCheck)
router.get('/metrics', (req, res) => res.json(metrics))

// user info
router.get('/user', ratelimiter, tokenVerification, requireRole('ADMIN', 'USER'), getProfile)
// admin endpoints
router.get('/admin/users', ratelimiter, tokenVerification, requireRole('ADMIN'), getUsers)
router.patch('/admin/users/:id/role', ratelimiter, tokenVerification, requireRole('ADMIN'), promoteUser)
router.patch('/admin/users/:id/ban', ratelimiter, tokenVerification, requireRole('ADMIN'), banUser)
router.patch('/admin/users/:id/restore', ratelimiter, tokenVerification, requireRole('ADMIN',), restoreUser)
router.get('/admin/users/:id', ratelimiter, tokenVerification, requireRole('ADMIN', 'MOD'), auditLogs)

export default router