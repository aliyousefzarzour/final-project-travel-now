# 🇪🇬 TravelNow — Egyptian Tourism Platform

A full-stack SaaS travel platform featuring 50+ Egyptian attractions, interactive map, favorites system, bookings, posts, and more.

---

## 🚀 Quick Start

### 1. Prerequisites
- Node.js v18+
- MongoDB running locally (`mongod`) or a MongoDB Atlas URI

### 2. Install & Run Backend
```bash
cd backend
npm install
# Edit .env if needed (see .env.example)
npm start
# → API running on http://localhost:5000
```
cd "C:\Users\ammar\Downloads\Programs\TravelNow1\backend"
node server.js


### 3. Seed Egyptian Attractions
```bash
cd backend
npm run seed
# → Inserts 50+ famous Egyptian attractions into MongoDB


```

### 4. Open Frontend
Open `index.html` directly in your browser **or** use a local server:
```bash
# Option A: VS Code Live Server (recommended)
# Option B: Python
python3 -m http.server 3000
# Then open http://localhost:3000
```

> **Important:** API calls use relative `../api/` paths. You need a reverse proxy
> or to serve the frontend from the same origin as the backend.
> The simplest setup with VS Code Live Server + backend on port 5000 requires
> either a proxy or changing API paths to `http://localhost:5000/api/`.

### 5. Default Admin Login
```
Email:    admin@travelnow.com
Password: Admin@1234
```
*(Set via `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env`)*

---

## 📁 Structure
```
TravelNow/
├── index.html              # Landing page
├── pages/                  # All frontend pages
│   ├── map.html            # 🗺️ Interactive map with 50+ markers
│   ├── attractions.html    # ❤️ Card grid with heart buttons
│   ├── attraction-details.html
│   ├── favorites.html      # Profile favorites
│   ├── dashboard.html
│   ├── bookings.html
│   ├── posts.html
│   └── ...
├── assets/
│   ├── css/
│   └── js/
│       └── auth.js         # Auth, toast, Storage helpers
└── backend/
    ├── server.js
    ├── .env
    ├── seeds/
    │   └── egyptAttractions.js  # 50+ attractions seed
    ├── models/
    ├── controllers/
    └── routes/
```

---

## 🗺️ Map Features
- **50+ Egyptian attractions** as clickable map markers
- Beautiful color-coded markers by category
- Click marker → **modern floating card** with:
  - Attraction image
  - Category, name, location, rating, description
  - ✅ **View Full Details** → attraction-details page
  - ✅ **Go There** → Google Maps directions
  - ✅ **Images** → Google Images search
  - ✅ **Save/Favorite** → DB-backed, updates instantly
- Sidebar list syncs with map (click → pan + zoom)
- Search + category filter (real-time)

## ❤️ Favorites
- Heart button on every attraction card
- Floating heart button top-right of each card
- Counter bar shows total saved count
- Full favorites page in Profile section
- All persistence is database-backed

---

## 🔧 API Endpoints
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api/attractions | ❌ | List all attractions |
| GET | /api/attractions/:id | ❌ | Attraction details |
| GET | /api/favorites | ✅ | User's favorites |
| POST | /api/favorites | ✅ | Add favorite |
| DELETE | /api/favorites/:id | ✅ | Remove by doc ID |
| DELETE | /api/favorites/by-attraction/:aid | ✅ | Remove by attraction |
| GET | /api/favorites/check/:aid | ✅ | Check if favorited |
| POST | /api/auth/login | ❌ | Login |
| POST | /api/auth/register | ❌ | Register |
| GET | /api/bookings/my | ✅ | User bookings |
| GET | /api/notifications/my | ✅ | Notifications |
