# Production Quick Reference Card

## 🎯 Most Important Commands

### Before Git Push
```bash
# 1. Validate everything works
cd c:\Users\creep\OneDrive\Desktop\GitHub\Project FE
bash deploy-check.sh

# 2. Commit and push
git add .
git commit -m "Production release: full landing page, FAQ, support, deployment docs"
git push origin main
```

### Local Development Testing
```bash
# Frontend
cd frontend && npm run dev
# → Opens http://localhost:5173

# Backend  
cd backend && npm run dev
# → Starts http://localhost:5000
```

---

## 📋 Key Files to Know

| File | Purpose | Status |
|------|---------|--------|
| `DEPLOYMENT.md` | Step-by-step deployment guide | ✅ Complete |
| `PRODUCTION_READY.md` | Readiness checklist | ✅ Complete |
| `GIT_WORKFLOW.md` | Git + rollback procedures | ✅ Complete |
| `deploy-check.sh` | Pre-deploy validation script | ✅ Ready |
| `README.md` | Project overview + checklist | ✅ Updated |
| `frontend/src/pages/Landing.jsx` | Main marketing page | ✅ Enterprise copy |
| `frontend/src/pages/ContactSupport.jsx` | Support form | ✅ Working |
| `backend/src/routes/support.js` | Support API | ✅ Working |

---

## 🌐 Public URLs (After Deployment)

| Page | URL | Status |
|------|-----|--------|
| Home | `/` | ✅ Ready |
| Pricing | `/pricing` | ✅ Ready |
| Features | `/` (on Landing) | ✅ Ready |
| FAQ | `/faq` | ✅ Ready |
| Contact Support | `/contact-support` | ✅ Ready |
| Login | `/login` | ✅ Ready |
| Register | `/register` | ✅ Ready |
| Dashboard | `/dashboard` | ✅ Ready (auth required) |

---

## 📧 Email Configuration Status

| Setting | Value | Action |
|---------|-------|--------|
| `FROM_EMAIL` | `noreply@xpensist.com` | Add DKIM/SPF records to DNS |
| `SUPPORT_EMAIL` | `xpensist@gmail.com` | ✅ Already verified |
| `SMTP_HOST` | SendGrid (if configured) | ✅ Documented in .env |
| Contact Form | Public (no auth needed) | ✅ Working |

---

## ✅ Pre-Production Checklist

- [x] No TypeScript errors
- [x] No console.logs or debug code
- [x] All forms working with error handling
- [x] Contact form submits to xpensist@gmail.com
- [x] 404 page displays for bad routes
- [x] SEO metadata updated
- [x] robots.txt created
- [x] .gitignore enhanced
- [x] Deployment guide written
- [x] Pre-deploy script created
- [x] Brand consistency (invoiceflow → xpensist)

---

## 🚀 Deployment Timeline

| Step | Platform | Time | Status |
|------|----------|------|--------|
| 1. Git push | GitHub | ~5 sec | Ready |
| 2. Frontend deploy | Cloudflare Pages | ~2 min | Manual |
| 3. Backend deploy | VPS + PostgreSQL | ~15 min | Manual |
| 4. DNS config | Cloudflare | ~1 min | Manual |
| 5. SSL setup | Cloudflare | ~1 min | Manual |
| 6. Verification | Manual testing | ~5 min | Manual |

**Total: ~25 minutes for full production deployment**

---

## 🔍 Monitoring After Launch

### Daily
- Check Cloudflare analytics for traffic
- Review backend error logs: `pm2 logs`
- Monitor support form submissions

### Weekly
- Database backup verification
- SSL certificate status (Cloudflare handles)
- Email delivery rates
- Invoice reminder job execution

---

## 🆘 If Something Goes Wrong

### Frontend Issues (Cloudflare Pages)
```bash
# Check deployment logs in Cloudflare Dashboard
# Rollback to previous version in 1 click
# Fix code and re-push
git add . && git commit -m "Fix: ..." && git push origin main
```

### Backend Issues (VPS)
```bash
# SSH into VPS and check logs
ssh root@your-vps-ip
pm2 logs xpensist-api | head -50

# Restart if needed
pm2 restart xpensist-api

# Check database
psql -U postgres xpensist
SELECT VERSION();
```

### Email Not Sending
```bash
# Check support endpoint logs
pm2 logs xpensist-api | grep "Support contact"

# Verify SendGrid credentials in .env
cat .env | grep SENDGRID

# Test email service manually
curl -X POST http://localhost:5000/api/support/contact-public \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@test.com","subject":"Test","message":"Test"}'
```

---

## 📞 Support Access

### For Your Own Reference
- Backend logs: `pm2 logs`
- Database: `psql -U postgres xpensist`
- Frontend build: `frontend/dist/`
- Environment: Check `.env` file

### For User Support
- Contact form: yourdomain.com/contact-support
- Email received at: xpensist@gmail.com
- FAQ for answer lookup: yourdomain.com/faq

---

## 🎓 Resources

- **DEPLOYMENT.md** — Read this first for step-by-step setup
- **GIT_WORKFLOW.md** — Reference for git commands and rollback
- **PRODUCTION_READY.md** — Verification checklist
- **Cloudflare Docs** — https://developers.cloudflare.com
- **Express.js Docs** — https://expressjs.com
- **React Docs** — https://react.dev

---

## ⏱️ Next Action

**Right now, run:**
```bash
bash deploy-check.sh
```

**If it shows ✓ READY FOR PRODUCTION, then:**
```bash
git add .
git commit -m "Production release"
git push origin main
```

**Then follow DEPLOYMENT.md for Cloudflare + VPS setup.**

---

**You're all set. Go ship it! 🚀**
