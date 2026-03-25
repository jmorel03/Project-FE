# InvoiceFlow — Invoice & Expense SaaS

A full-stack SaaS for invoicing and expense tracking, built with Node.js (Express) on the backend and React on the frontend, deployed via Cloudflare.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, React Router v6, React Query, React Hook Form |
| Backend | Node.js, Express.js, Prisma ORM, PostgreSQL |
| Auth | JWT (access + refresh tokens), bcryptjs |
| Email | Nodemailer (SMTP / SendGrid) |
| PDF | PDFKit |
| Hosting (FE) | Cloudflare Pages |
| Hosting (BE) | VPS / Docker behind Cloudflare Tunnel / Proxy |
| Storage | Cloudflare R2 (attachments) |
| DNS / CDN | Cloudflare |

---

## Project Structure

```
.
├── backend/          # Express API
│   ├── prisma/       # Database schema & migrations
│   └── src/
│       ├── controllers/
│       ├── middleware/
│       ├── routes/
│       └── services/
└── frontend/         # React app
    └── src/
        ├── components/
        ├── context/
        ├── hooks/
        ├── pages/
        └── services/
```

---

## Features

- **Authentication** — Register, login, JWT refresh, password reset
- **Clients** — Create and manage clients
- **Invoices** — Create, edit, send, and track invoices with line items
- **Expenses** — Log, categorize, and filter expenses
- **Dashboard** — Revenue overview, outstanding balances, recent activity
- **PDF Export** — Generate professional invoice PDFs
- **Email Delivery** — Send invoices directly to clients via email
- **Multi-currency** — Configurable default currency per account

---

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- A Cloudflare account with a domain

### Backend

```bash
cd backend
cp .env.example .env       # fill in your values
npm install
npx prisma migrate dev     # create DB tables
npm run dev
```

### Frontend

```bash
cd frontend
cp .env.example .env       # set VITE_API_URL
npm install
npm run dev
```

---

## Environment Variables

### Backend (`backend/.env`)
```
DATABASE_URL=postgresql://user:pass@localhost:5432/invoiceflow
JWT_SECRET=your-super-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
PORT=4000
CLIENT_URL=http://localhost:5173
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your-sendgrid-key
FROM_EMAIL=noreply@yourdomain.com
```

### Frontend (`frontend/.env`)
```
VITE_API_URL=http://localhost:4000/api
```

---

## Cloudflare Deployment

### Frontend → Cloudflare Pages
1. Push the repo to GitHub
2. In Cloudflare Pages, connect the repo
3. Build command: `npm run build`
4. Build output: `dist`
5. Set `VITE_API_URL` environment variable to your production API URL

### Backend → VPS + Cloudflare Proxy
1. Deploy the Express API to any VPS (e.g., DigitalOcean, Hetzner)
2. Add an A record in Cloudflare DNS pointing `api.yourdomain.com` → your VPS IP
3. Enable Cloudflare Proxy (orange cloud) for DDoS protection + caching headers
4. Use Cloudflare SSL/TLS in **Full (strict)** mode
5. Optionally run `cloudflared tunnel` for zero-trust access

---

## Option 1 (Implemented): Postgres + Cloudflare R2

This project now supports storing **expense receipt files** in Cloudflare R2 while keeping relational data in PostgreSQL.

### Why this setup
- PostgreSQL stores app data (users, clients, invoices, expenses)
- Cloudflare R2 stores files (receipt uploads, and can later hold generated PDFs)

### What you need to do

1. **Provision PostgreSQL** (local or hosted)
    - Local: install PostgreSQL and ensure it runs on `localhost:5432`
    - Hosted: Neon / Supabase / Railway / Aiven, etc.

2. **Create an R2 bucket in Cloudflare**
    - Cloudflare Dashboard → R2 → Create bucket
    - Example bucket name: `invoiceflow-attachments`

3. **Create R2 API token**
    - Cloudflare Dashboard → R2 → Manage R2 API tokens
    - Generate token with read/write bucket access
    - Save `Access Key ID` and `Secret Access Key`

4. **Get Account ID**
    - Cloudflare Dashboard → right sidebar / account settings

5. **Set backend env vars (`backend/.env`)**
    - `DATABASE_URL=...`
    - `R2_ACCOUNT_ID=...`
    - `R2_ACCESS_KEY_ID=...`
    - `R2_SECRET_ACCESS_KEY=...`
    - `R2_BUCKET_NAME=invoiceflow-attachments`
    - `R2_PUBLIC_URL=https://pub-xxxx.r2.dev` (optional but recommended)

6. **Run DB migration + backend**
    ```bash
    cd backend
    npx prisma migrate dev --name init
    npm run dev
    ```

7. **Run frontend**
    ```bash
    cd frontend
    npm run dev
    ```

### New receipt upload endpoint

- `POST /api/expenses/:id/receipt`
- Auth required: `Authorization: Bearer <accessToken>`
- Content type: `multipart/form-data`
- Field name: `receipt`
- Allowed files: `jpg`, `png`, `webp`, `pdf` (max 10MB)

Example using curl:

```bash
curl -X POST "http://localhost:4000/api/expenses/<expenseId>/receipt" \
  -H "Authorization: Bearer <accessToken>" \
  -F "receipt=@C:/path/to/receipt.pdf"
```

---

## License
MIT
