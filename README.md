# AuthBackend

Authentication backend built with Node.js, Express, and Prisma.

## Features

- User registration with validation and password hashing (bcrypt)
- User login with JWT access token + refresh token issuance
- Refresh token rotation with reuse detection and family-based invalidation
- Multi-device session management — list, selectively revoke, or bulk-revoke sessions
- Middleware for token verification and session expiry checks
- Logout functionality with session deletion and audit logging
- Sliding window log rate limiting (Redis-backed with in-memory fallback) on all auth routes
- Structured logging with pino and audit trail for all auth events
- Health check and readiness endpoints 
- Prisma ORM for database interaction

## Tech Stack

- Node.js + Express.js
- Prisma ORM + PostgreSQL
- Redis (ioredis) for rate limiter state
- bcrypt for password hashing
- jsonwebtoken (JWT) for access and refresh tokens
- pino for structured logging
- Jest for unit and integration tests

## To Add

- Email verification (OTP + magic link)
- RBAC
- Password reset flow
- Docker + nginx production setup
- Frontend dashboard (Vite + React + Tailwind)
- OpenAPI/Swagger documentation
