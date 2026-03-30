# Git Workflow & Deployment Guide

## Pre-Push Verification

Before pushing to GitHub, run this checklist:

### 1. Local Validation Script
```bash
# From project root
chmod +x deploy-check.sh
./deploy-check.sh
```

Expected output:
```
✓ Node.js version: v18.x+ (or v20.x+)
✓ .env file found
✓ Backend dependencies installed
✓ Backend builds successfully
✓ Frontend dependencies installed
✓ Frontend builds successfully
✓ READY FOR PRODUCTION
```

### 2. Manual Testing (5 minutes)

#### Frontend Tests
```bash
cd frontend
npm run dev
# Open http://localhost:5173 in browser

# Test public pages:
- Home page loads with full layout
- Pricing page shows 3 plans clearly
- FAQ page expands/collapses questions
- Contact form accepts input and submits

# Test authenticated pages (if you have a test account):
- Dashboard loads
- Can create an invoice
- Can upload expense receipt
```

#### Backend Tests
```bash
cd backend
npm run dev
# Should see "Server running on http://localhost:5000"

# Test via curl or Postman:
curl http://localhost:5000/health
# Expected: { "status": "ok" }

curl -X POST http://localhost:5000/api/support/contact-public \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "subject": "Test Subject",
    "message": "Test message"
  }'
# Expected: { "success": true }
```

---

## Git Workflow

### Step 1: Stage All Changes
```bash
# From project root
git add .

# Review what will be committed
git status
```

### Step 2: Commit with Clear Message
```bash
git commit -m "Production release: full marketing site, support portal, deployment docs

- Updated Landing page with enterprise copy and 8 featured
- Added FAQ page with 8+ Q&A pairs
- Added Contact Support form for public submittals
- Fixed SEO metadata and added robots.txt
- Implemented 404 page with proper routing
- Created comprehensive DEPLOYMENT.md guide
- Enhanced .gitignore for production
- Verified zero compilation errors across codebase
- Ready for Cloudflare Pages + VPS deployment"
```

### Step 3: Push to GitHub
```bash
# If using main branch
git push origin main

# Or if using master
git push origin master

# Or if using a feature branch first
git push origin feature/production-release
# Then create pull request on GitHub
```

---

## Post-Push Actions

### 1. Verify on GitHub
- ✅ Check that all commits appear in GitHub repo
- ✅ Verify branch is up to date: `git log --oneline -5`

### 2. Frontend Deployment (Cloudflare Pages)

Follow steps 1-5 in **DEPLOYMENT.md** under "Frontend Deployment":

```bash
# Quick overview:
1. Log in to Cloudflare Dashboard
2. Add Pages project linked to GitHub
3. Set build command: cd frontend && npm run build
4. Set output directory: frontend/dist
5. Connect custom domain
6. Verify https://yourdomain.com loads with correct title
```

**Expected Result:**
- Site accessible at yourdomain.com
- Title shows "Xpensist | Invoicing, Expenses, and Profit Dashboard"
- All pages (home, pricing, faq, contact) load correctly

### 3. Backend Deployment (VPS)

Follow steps 1-8 in **DEPLOYMENT.md** under "Backend Deployment":

```bash
# Quick overview:
1. SSH into your VPS
2. Clone repo: git clone https://github.com/your-org/xpensist.git
3. Set up PostgreSQL database
4. Configure .env with production values
5. Run Prisma migrations: npx prisma migrate deploy
6. Install PM2 globally
7. Start backend: pm2 start backend/src/server.js --name xpensist-api
8. Configure Nginx reverse proxy
9. Set up SSL with Cloudflare (Full Strict)
```

**Expected Result:**
- Backend accessible at api.yourdomain.com
- /health endpoint responds with {"status":"ok"}
- Contact form submissions reach xpensist@gmail.com (or configured email)

---

## Health Checks After Deployment

### Frontend
```bash
curl -I https://yourdomain.com
# Expected: HTTP/1.1 200 OK

# Check title hasn't regressed
curl https://yourdomain.com | grep "<title>"
# Expected: <title>Xpensist | Invoicing, Expenses, and Profit Dashboard</title>
```

### Backend
```bash
curl -I https://api.yourdomain.com/health
# Expected: HTTP/1.1 200 OK

curl https://api.yourdomain.com/health
# Expected: {"status":"ok"}
```

### Support Form End-to-End
1. Visit yourdomain.com/contact-support
2. Fill form with test data
3. Submit
4. Check your email (xpensist@gmail.com or configured SUPPORT_EMAIL)
5. Email should arrive within 30 seconds (may take longer if AWS SES rate limiting applies)

---

## Rollback Plan (If Issues Found)

### Frontend (Cloudflare Pages - Instant)
```bash
# Go to Cloudflare Dashboard > Pages > Deployments
# Click "Rollback" on previous working deployment
# Site reverts in ~30 seconds
```

### Backend (PM2 - Quick)
```bash
# SSH into VPS
pm2 stop xpensist-api
git checkout previous-working-commit
npm install
npx prisma migrate deploy (only if needed)
pm2 start xpensist-api

# Or use PM2 process snapshot
pm2 restart xpensist-api
```

---

## Emergency Contacts

- **Cloudflare Support**: https://support.cloudflare.com
- **SendGrid Support**: https://support.sendgrid.com (for email issues)
- **AWS/VPS Provider**: Check your provider's docs
- **GitHub Docs**: https://docs.github.com

---

## Commit History Example

After following this workflow, you should see in `git log`:

```
* commit abc123 (HEAD -> main)
| Author: You <you@example.com>
| Date:   Mon Mar 30 10:30:00 2026
|
|     Production release: full marketing site, support portal, deployment docs
|     
|     - Updated Landing page with enterprise copy and 8 featured
|     - Added FAQ page with 8+ Q&A pairs
|     - Added Contact Support form for public submittals
|     ... etc
|
* commit xyz789 (origin/main)
```

---

## Next Steps

1. ✅ Run `./deploy-check.sh` locally
2. ✅ Test all 4 public pages (home, pricing, faq, contact)
3. ✅ Verify backend /health works
4. ✅ Test support form submission
5. ✅ Run `git add . && git commit -m "..."` 
6. ✅ Run `git push origin main`
7. ✅ Check GitHub repo shows new commits
8. ✅ Follow DEPLOYMENT.md for Cloudflare + VPS setup

**You're ready to deploy!** 🚀
