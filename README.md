# 246 — QR Menu (MERN + Next.js)

Full-stack rebuild of the "QR Code Fast Food Menu" design: scan → browse menu →
pick size/supplements → cart → place order → confirmation.

## Stack

- **backend/** — Express + Mongoose, local MongoDB
- **frontend/** — Next.js (App Router, TypeScript, Tailwind CSS v4)

## Prerequisites

- Node.js 18+
- MongoDB running locally (default `mongodb://127.0.0.1:27017`)

## Setup

```bash
# 1. Backend
cd backend
npm install
cp .env.example .env      # adjust if needed
npm run seed               # populates the pizza246 database with the menu
npm run dev                 # http://localhost:5000

# 2. Frontend (new terminal)
cd frontend
npm install
cp .env.local.example .env.local   # adjust if needed
npm run dev                         # http://localhost:3000
```

## Notes

- `NEXT_PUBLIC_ORDER_MODE` in `frontend/.env.local` toggles checkout copy between
  `table` ("ENVOYER LA COMMANDE") and `delivery` ("COMMANDER").
- Product photos live in `frontend/public/photos/`. Burgers and Paninis items
  reference a photo via the `photo` field in `backend/seed/seed.js`; Extras,
  Classic, Signature, and XXL items have no `photo` set (matching the original
  design) and fall back to a generated color placeholder in `ItemCard`.
- `POST /api/orders` computes the total server-side and returns a random 4-digit
  order number, matching the original prototype's behavior.
