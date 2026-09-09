# AuthBackend
![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-DC382D?logo=redis&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma&logoColor=white)

A production-grade authentication and authorisation service built with Node.js, Express, PostgreSQL, and Redis. Includes a vanilla HTML/CSS/JS frontend for live demonstration.

---

## Features

- **Stateful JWT auth** — 15-minute access tokens issued on login, verified on every protected request without a DB call
- **Refresh token rotation** — 7-day UUID refresh tokens stored as SHA-256 hashes; rotated on every use with token family tracking for reuse detection and full family invalidation on replay attacks
- **Multi-device session management** — each login creates a new token family; users can list and remotely revoke individual sessions
- **Role-based access control** — three roles (USER, MODERATOR, ADMIN) with a fine-grained permission map guarding every protected route
- **Account banning** — admins can ban and restore users; banned users are blocked at login
- **Redis-backed sliding window rate limiting** — per-IP for unauthenticated routes, per-user-ID for authenticated routes, with in-memory fallback if Redis is unavailable
- **Structured audit logging** — every auth event written to a persistent AuditLog table with userId, action, IP address, and timestamp; queryable per-user by admins
- **Structured application logging** — pino with pretty-printing in development and JSON in production
- **Observability endpoints** — `/health` checks DB and Redis connectivity; `/metrics` exposes request, failure, and token counters
- **Input validation** — validator.js on all auth inputs; email format, field presence, and password strength enforced before any DB or bcrypt call
- **Frontend** — four-page vanilla JS dashboard: register, login, home (profile + sessions + health), admin panel (user management + per-user audit log)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 22 |
| Framework | Express |
| Database | PostgreSQL |
| ORM | Prisma |
| Cache / Rate limit | Redis (ioredis + node-redis) |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Logging | pino + pino-pretty |
| Validation | validator.js |
| Frontend | HTML / CSS / Vanilla JS |

---

## Architecture

```
Client
  │
  ▼
[Express]
  │
  ├── [Rate Limiter Middleware]     sliding window, Redis-backed, per-IP + per-user-ID
  │       │
  │       ▼
  ├── [Validator Middleware]        email format, field presence, password strength
  │       │
  │       ▼
  ├── [JWT Middleware]              verifies access token, sets req.user
  │       │
  │       ▼
  ├── [RBAC Middleware]             requireRole / requirePerm
  │       │
  │       ▼
  └── [Route Handler]
          │
          ├── [Prisma] ──────────► PostgreSQL
          │
          ├── [Audit Logger] ────► AuditLog table
          │
          └── [pino logger] ─────► stdout
```

---

## API Reference

### Auth

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | None | Register new user; returns access token + sets refresh cookie |
| POST | `/auth/login` | None | Login; returns access token + sets refresh cookie. Blocked if account is banned |
| POST | `/auth/refresh` | Cookie | Rotate refresh token; returns new access token |
| POST | `/auth/logout` | Bearer | Revoke refresh token, clear cookie |
| GET | `/auth/sessions` | Bearer | List active sessions for current user |
| POST | `/auth/session` | Bearer | Manage a specific session |
| DELETE | `/auth/sessions/:familyId` | Bearer | Revoke a specific device session |
| DELETE | `/auth/sessions` | Bearer | Revoke all sessions (logout everywhere) |

### User

| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/user` | Bearer | USER+ | Get own profile (no password) |

### Admin

| Method | Path | Auth | Role | Description |
|---|---|---|---|---|
| GET | `/admin/users` | Bearer | ADMIN | Paginated user list |
| PATCH | `/admin/users/:id/role` | Bearer | ADMIN | Promote or demote a user (cannot set ADMIN, cannot change self) |
| PATCH | `/admin/users/:id/ban` | Bearer | ADMIN | Ban a user |
| PATCH | `/admin/users/:id/restore` | Bearer | ADMIN | Unban a user |
| GET | `/admin/users/:id` | Bearer | ADMIN / MOD | Paginated audit log for a specific user |

### Observability

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | None | DB + Redis status, uptime, version |
| GET | `/metrics` | None | Request, failure, and token counters |

---

## Rate Limit Presets

| Route | Algorithm | Window | Max Requests |
|---|---|---|---|
| `/auth/login` | Sliding window | 1 hour | 5 |
| `/auth/register` | Sliding window | 1 hour | 5 |
| All others | Sliding window | 1 hour | 100 |

Requests over the limit receive `429 Too Many Requests` with `X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` headers.

---

## Refresh Token Flow

```
Login
  │
  ├── access token (JWT, 15min)  ──► response body
  └── refresh token (UUID, 7d)   ──► httpOnly cookie + hashed in DB with familyId

Protected request
  └── Bearer access token ──► JWT middleware verifies, no DB call

Access token expires
  └── POST /auth/refresh
        ├── reads cookie
        ├── hashes token, looks up in DB
        ├── checks used === false and expiresAt > now
        ├── marks old token used: true
        ├── creates new token in same familyId
        └── returns new access token + sets new cookie

Reuse attack detected (stolen token replayed)
  └── server sees used: true
        └── invalidates entire familyId ──► all devices logged out
```

---

## RBAC

### Roles

| Role | Description |
|---|---|
| USER | Default role on registration |
| MODERATOR | Can view user list and per-user audit logs |
| ADMIN | Full system access; assigned via seed or admin promotion |

### Permissions

| Permission | USER | MODERATOR | ADMIN |
|---|---|---|---|
| profile:read | ✓ | ✓ | ✓ |
| profile:update | ✓ | ✓ | ✓ |
| content:moderate | | ✓ | ✓ |
| user:list | | ✓ | ✓ |
| user:delete | | | ✓ |
| user:promote | | | ✓ |
| audit:read | | | ✓ |

---

## Audit Log Events

| Event | Trigger |
|---|---|
| `Registration` | New user created |
| `Login` | Successful login |
| `Login` (failed) | Wrong password |

Each event stores `userId`, `action`, `ip`, and `createdAt`. Queryable per-user via `GET /admin/users/:id`.

---

## Seed Credentials

Run the seed script to create three users with distinct roles:

```bash
node prisma/seed.js
```

| Email | Password | Role |
|---|---|---|
| admin@test.com | Admin123! | ADMIN |
| mod@test.com | Mod123! | MODERATOR |
| user@test.com | User123! | USER |

---

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env

# Run migrations
npx prisma migrate dev

# Seed the database
node prisma/seed.js

# Start the server
npm run dev
```

### Environment Variables

```env
DATABASE_URL=postgresql://user:password@localhost:5432/authbackend
REDIS_URL=redis://localhost:6379
JWT_SECRET_KEY=your-secret-key
LOG_LEVEL=info
NODE_ENV=development
```

---

## Frontend

Open `frontend/login.html` in a browser. All four pages share `style.css` and `app.js` — keep them in the same folder.

| Page | Route | Description |
|---|---|---|
| `login.html` | — | Email/username + password login |
| `register.html` | — | New account creation |
| `home.html` | Requires auth | Profile, active sessions, health + metrics |
| `admin.html` | Requires ADMIN role | User table, ban/restore, per-user audit log modal |

Token is stored in `sessionStorage` and auto-refreshed on 401. Admin nav link only appears for ADMIN role.

---

## Project Structure

```
src/
├── config/
│   ├── permissions.js       # ROLES, PERMISSIONS map, requireRole, requirePerm
│   └── ratelimitConfigs.js  # Rate limit presets per route
├── middleware/
│   ├── rate_limiter.js      # Sliding window, Redis + fallback
│   ├── tokenVerification.js # JWT verification, sets req.user
│   └── validators.js        # Input validation for register + login
├── routes/
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── adminRoutes.js
│   └── healthRoutes.js
├── controllers/
│   ├── authController.js
│   ├── userController.js
│   └── adminController.js
├── services/
│   ├── authServices.js      # registration, login, logout, banned check
│   ├── tokenServices.js     # generateTokens, rotateRefreshToken, invalidateFamily
│   └── redisFallback.js     # ioredis in-memory fallback
└── utils/
    ├── logger.js            # pino singleton
    ├── auditLogger.js       # writes to AuditLog table
    └── metrics.js           # in-memory counters

prisma/
├── schema.prisma
├── seed.js
└── migrations/

frontend/
├── login.html
├── register.html
├── home.html
├── admin.html
├── style.css
└── app.js
```  
