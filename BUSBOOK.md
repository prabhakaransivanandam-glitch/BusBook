# BusBook

Red & white bus ticket booking app: React (Vite) PWA + Express/Mongoose + Firebase Authentication.
Only two directions are supported: **Perundurai → Coimbatore** and **Coimbatore → Perundurai**.

## 1. Firebase setup

1. Create a Firebase project at <https://console.firebase.google.com>.
2. Add a **Web app** in *Project settings → Your apps*. Copy the config values into `client/.env` (see `client/.env.example`).
3. Enable **Authentication → Sign-in method → Email/Password**.
4. In *Project settings → Service accounts*, click **Generate new private key**. Save the JSON file.
   - Paste the whole JSON as one line into `FIREBASE_SERVICE_ACCOUNT` in `server/.env`, **or** base64-encode it: `Get-Content serviceAccount.json -Raw | Set-Content -Encoding UTF8 serviceAccount.b64` and paste that.
5. Set `FIREBASE_PROJECT_ID` to your project ID.

## 2. MongoDB

Use a local MongoDB (`mongodb://127.0.0.1:27017/busbook`) or a free MongoDB Atlas cluster. Put the URI in `server/.env` as `MONGODB_URI`.

## 3. Install & run

```bash
# Terminal 1 — API
cd server
npm install
copy .env.example .env   # edit values
npm run dev

# Terminal 2 — client
cd client
npm install
copy .env.example .env   # edit Firebase web config
npm run dev
```

Client: <http://localhost:5173> · API health: <http://localhost:5000/health>

Seed buses/trips, then create the first admin:

```bash
cd server && npm install
node ../scripts/seed.js
node ../scripts/createAdmin.js admin@example.com MyStrongPassword "BusBook Admin"
```

Sign out and sign back in after creating an admin so the `role: admin` custom claim appears in the ID token.

`seed.js` creates 2 buses, timetables and trips for **today and tomorrow** in both directions (06:00 → 20:30, roughly every 1–2 hours).

## 4. Roles

| Role | How it is created | Landing page |
| --- | --- | --- |
| passenger | Public signup page (claim-free default) | `/home` |
| conductor | Admin → Conductors form (`setCustomUserClaims({role:'conductor'})`) | `/conductor` |
| admin | `scripts/createAdmin.js` (`{role:'admin'}`) | `/admin` |

The server verifies the Firebase ID token on **every** `/api` request and enforces roles with `requireRole(...)`. Public signup can never assign conductor/admin.

## 5. Key API endpoints

- `POST /api/auth/sync`, `GET /api/auth/me`
- `GET /api/trips/search?direction=...&date=YYYY-MM-DD`, `GET /api/trips/:id`
- `POST /api/bookings`, `POST /api/bookings/:id/confirm`, `POST /api/bookings/:id/cancel`
- `GET /api/bookings/my`, `GET /api/tickets/my`
- `POST /api/tickets/validate` (conductor only, rate-limited)
- `GET /api/conductor/trips`, `POST /api/conductor/trips/:id/select`, `GET /api/conductor/trips/:id/summary`
- Admin CRUD: `/api/admin/conductors`, `/api/admin/buses`, `/api/admin/trips`, `/api/admin/timetables`, plus `/api/admin/overview`, `/api/admin/bookings`, `/api/admin/scan-logs`

Input validation uses zod; errors are handled centrally in `server/src/utils/errors.js`.

## 6. QR security

The QR value is a signed HS256 JWT containing only `ticketId`, `tripId`, and `exp` — no personal data. `POST /api/tickets/validate` verifies the signature, checks the selected trip, status and expiry, then atomically flips the ticket to `USED` with `findOneAndUpdate({status:'BOOKED'})`. A scan log is written for every attempt.

## 7. Seat booking

Seats are subdocuments on each trip. Booking uses a conditional `findOneAndUpdate` with `arrayFilters`; if any requested seat was taken, the whole update fails and the API returns **409**. Seats are held for 5 minutes (`SEAT_HOLD_MINUTES`) and a background job releases unpaid holds every 30 seconds. The client polls seat availability every 10 seconds.

## 8. Tests

```bash
cd server && npm test
```

## 9. Deployment notes

- **Client (Vercel/Netlify):** build command `npm run build`, output `dist`, set all `VITE_*` env vars. For React Router deep links add a rewrite to `/index.html`.
- **Server (Render/Railway):** start command `npm start` (or `npm run dev` with nodemon in dev), set all server env vars, allow outbound to MongoDB Atlas and Firebase.
- **MongoDB Atlas:** add `0.0.0.0/0` (or your platform's egress IPs) to the network access list.
- Set `CLIENT_URL` on the server to the deployed client origin, and `VITE_API_URL` on the client to the deployed API origin.
- PWA install requires HTTPS in production; the manifest and service worker are in `client/public`.

## File map

```
client/   React PWA (auth, passenger, conductor scanner, admin dashboard)
server/   Express API + Mongoose models + validation + QR signing
scripts/  seed.js and createAdmin.js
```
