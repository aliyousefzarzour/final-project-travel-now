# TravelNow — Egyptian Tourism Platform

A full-stack travel platform for discovering and booking tourism experiences across Egypt. It pairs a framework-free frontend with a Node.js/Express API and MongoDB, and adds a company dashboard for tourism businesses alongside a full admin area.

---

## Features

- **Attractions** — 50+ Egyptian destinations on an interactive map with markers, search, and category filters
- **Detail pages** — photos, ratings, reviews, and Google Maps directions
- **Favorites & saved trips** — database-backed favourites plus a personal trip planner
- **Bookings** — availability checks and server-side price calculation
- **Companies** — registration, document verification, company profile, and a dedicated dashboard
- **Community** — posts feed, follows, notifications, and real-time chat
- **Accounts** — email verification and password reset through one-time codes
- **Admin** — manage attractions, users, companies, bookings, offers, and feedback
- **UI** — responsive layout, light/dark theme, Arabic-first content

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | HTML5, CSS3, vanilla JavaScript |
| Backend | Node.js, Express |
| Database | MongoDB with Mongoose |
| Auth | JWT with role-based access (traveler / company / admin) |
| Realtime | Socket.IO |
| Email | Nodemailer |
| Payments | Paymob (sandbox) |
| Hosting | GitHub Pages (frontend), Render / Vercel (API) |

## Project Structure

```
.
├── index.html                # Landing page
├── pages/                    # Frontend pages (map, attractions, bookings, dashboard, ...)
├── assets/
│   ├── css/
│   └── js/                   # Auth, theme, navbar, maps and helper modules
├── admin/                    # Admin dashboard
└── backend/
    ├── server.js             # Express entry point
    ├── config/               # Environment-driven configuration
    ├── models/               # Mongoose schemas
    ├── controllers/          # Business logic
    ├── routes/               # REST endpoints
    ├── middleware/           # Auth, validation, uploads
    ├── services/             # Email, payments, realtime
    ├── seeds/                # Sample attraction data
    └── test/                 # Test suites
```

## Getting Started

### Requirements

- Node.js 18 or newer
- MongoDB (local instance or an Atlas connection string)

### Backend

```bash
cd backend
npm install
cp .env.example .env
npm start
```

The API listens on `http://localhost:5000` by default. `.env.example` documents every variable the server reads — all secrets come from the environment and none are stored in the repository.

Key variables:

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | Database connection string |
| `JWT_SECRET` | Signing key for access tokens |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Credentials used once to seed the admin account |
| `EMAIL_USER`, `EMAIL_PASS` | Mailbox used for verification and reset codes |
| `PAYMOB_*` | Sandbox payment configuration |

### Frontend

Serve the repository root with any static server:

```bash
python -m http.server 3000
```

Then open `http://localhost:3000`. The frontend calls the API through the `/api` path, so it should be served from the same origin as the backend or behind a proxy.

## API Overview

| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/attractions` | — | List all attractions |
| GET | `/api/attractions/:id` | — | Attraction details |
| POST | `/api/auth/login` | — | Sign in |
| POST | `/api/auth/register` | — | Create an account |
| GET | `/api/favorites` | ✓ | Current user's favourites |
| POST | `/api/favorites` | ✓ | Add a favourite |
| GET | `/api/bookings/my` | ✓ | Current user's bookings |
| GET | `/api/notifications/my` | ✓ | Current user's notifications |

## License

Built as a graduation project. All rights reserved.
