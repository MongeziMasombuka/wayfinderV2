# 🏛 The Grand Atrium

An interactive wayfinding app for a shopping mall — search or browse stores, get step-by-step directions between them, scan a store's QR code to set it as your location, and check today's events and amenities. Includes a full admin panel for managing stores, events, categories, wings, and amenities.

## Features

**Public site (`/`)**

- Directory of all stores with filtering by category
- Step-by-step directions between any two stores
- QR code scanner — point your camera at a store's QR code to set it as your origin or destination
- Generate/display a QR code for any store
- Live events feed and amenities list

**Admin panel (`/admin.html`)**

- Full CRUD for stores (create, edit, delete)
- Full CRUD for events, with a target picker (mall-wide, a specific store, or a specific wing)
- Read-only views of categories, wings, and amenities
- Search/filter stores by name or ID

## Tech stack

- **Backend:** Node.js, Express
- **Database:** PostgreSQL (via `pg`)
- **Frontend:** Vanilla HTML/CSS/JS, no build step
- **QR codes:** [jsQR](https://github.com/cozmo/jsQR) (scanning) + [qrcodejs](https://davidshimjs.github.io/qrcodejs/) (generation)

## Project structure

```
grand-atrium/
├── server.js              # Express app + all API routes + DB init/seed
├── reset-db.js             # Drops and recreates the database from scratch
├── package.json
├── .env                     # DATABASE_URL (not committed)
└── public/
    ├── index.html           # Public wayfinding page
    ├── admin.html            # Admin panel
    ├── css/
    │   ├── style.css          # Public site styles
    │   └── admin.css           # Admin panel styles
    └── js/
        ├── app.js              # Public site logic (directions, QR scan, search)
        └── admin.js             # Admin panel logic (CRUD forms, tables)
```

## Prerequisites

- Node.js 18+
- A running PostgreSQL instance

## Setup

1. **Clone and install dependencies**

   ```bash
   git clone <your-repo-url>
   cd grand-atrium
   npm install
   ```

2. **Configure the database connection**

   Create a `.env` file in the project root:

   ```
   DATABASE_URL=postgres://<user>:<password>@<host>:<port>/<database>
   ```

3. **Create the database** (if it doesn't exist yet)

   ```bash
   node reset-db.js
   ```

   This drops and recreates the `grand_atrium` database. `server.js` will create all tables and seed reference data (floors, wings, categories, sample stores/amenities/events) automatically on first run — you don't need to run any SQL by hand.

   > Tip: add `"reset-db": "node reset-db.js"` to the `scripts` section of `package.json` if you'd rather run `npm run reset-db`.

4. **Start the server**

   ```bash
   node server.js
   ```

   You should see:

   ```
   ✅ Connected to PostgreSQL
   ✅ Database fully initialised
   🚀 Grand Atrium Full Backend running at http://localhost:3000
   🛠️  Admin panel: http://localhost:3000/admin.html
   ```

5. **Open it**
   - Public site: [http://localhost:3000](http://localhost:3000)
   - Admin panel: [http://localhost:3000/admin.html](http://localhost:3000/admin.html)

## API reference

| Method | Route             | Description                                                                     |
| ------ | ----------------- | ------------------------------------------------------------------------------- |
| GET    | `/api/stores`     | List all stores (joined with category/wing/level names)                         |
| GET    | `/api/stores/:id` | Get a single store                                                              |
| POST   | `/api/stores`     | Create a store                                                                  |
| PUT    | `/api/stores/:id` | Update a store                                                                  |
| DELETE | `/api/stores/:id` | Delete a store                                                                  |
| GET    | `/api/categories` | List all categories                                                             |
| GET    | `/api/wings`      | List all wings                                                                  |
| GET    | `/api/amenities`  | List all amenities                                                              |
| GET    | `/api/events`     | List upcoming events (`?all=1` to include past events, used by the admin panel) |
| POST   | `/api/events`     | Create an event                                                                 |
| PUT    | `/api/events/:id` | Update an event                                                                 |
| DELETE | `/api/events/:id` | Delete an event                                                                 |

## Notes on the QR scanner

Camera access (`getUserMedia`) only works in a [secure context](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts) — `https://` or `localhost`. If you're testing on a phone over your local network (e.g. `http://192.168.x.x:3000`), the camera will fail to open. Use a tunnel (ngrok, localtunnel) or deploy behind HTTPS to test scanning on a real device.

Each store's QR code encodes `GRAND_ATRIUM:<store-id>`. Generate one for any store via the QR button next to it in the directory or admin table.

## License

MIT (or update to whatever fits your project)
