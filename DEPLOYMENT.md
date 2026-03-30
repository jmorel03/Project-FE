# Xpensist — Production Deployment Guide

## Overview
This guide covers deploying Xpensist to production using Cloudflare Pages (frontend) and a VPS (backend).

---

## Pre-Deployment Checklist

- [ ] All environment variables configured (see `.env.example`)
- [ ] Database migrations run: `npm run db:migrate`
- [ ] Frontend builds with no warnings: `npm run build`
- [ ] Stripe API keys verified
- [ ] SendGrid API key and domain verified
- [ ] Cloudflare R2 bucket created and keys configured
- [ ] Admin emails configured
- [ ] SSL certificate ready (auto-provisioned by Cloudflare)

---

## Frontend Deployment (Cloudflare Pages)

### Setup
1. **Push to GitHub**
```bash
git push origin main
```

2. **Connect in Cloudflare**
   - Go to Cloudflare Dashboard → Pages
   - Click "Create a project" → "Connect to Git"
   - Select your repo and authorize
   - Choose `main` branch

3. **Configure Build**
   - Build command: `cd frontend && npm run build`
   - Build output directory: `frontend/dist`
   - Root directory: `.` (or leave blank)

4. **Set Environment Variables**
   - Add `VITE_API_URL` → your production API domain
   - Example: `https://api.xpensist.com`

5. **Deploy**
   - Click "Save and Deploy"
   - Cloudflare automatically redeploys on git push

### Custom Domain
1. Add your domain to Cloudflare
2. In Pages settings, add custom domain
3. Update DNS records in your registrar to use Cloudflare nameservers

---

## Backend Deployment (VPS + Cloudflare Proxy)

### Server Setup (DigitalOcean / Hetzner / AWS EC2)

1. **Create Droplet/Instance**
   - Ubuntu 22.04 LTS, 2GB+ RAM, 50GB+ SSD

2. **SSH into server**
```bash
ssh root@your-vps-ip
```

3. **Install Dependencies**
```bash
apt update && apt upgrade -y
apt install -y nodejs npm postgresql postgresql-contrib git curl

# Use Node 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs
```

4. **Clone Repository**
```bash
cd /opt
git clone https://github.com/yourusername/xpensist.git
cd xpensist/backend
npm install
```

5. **Configure PostgreSQL**
```bash
sudo -u postgres psql

CREATE DATABASE xpensist_prod;
CREATE USER xpensist_user WITH PASSWORD 'secure_password_here';
ALTER ROLE xpensist_user SET client_encoding TO 'utf8';
ALTER ROLE xpensist_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE xpensist_user SET default_transaction_deferrable TO on;
GRANT ALL PRIVILEGES ON DATABASE xpensist_prod TO xpensist_user;
\q
```

6. **Create `.env` file**
```bash
cp .env.example .env
nano .env
```

Fill in all production values:
```
DATABASE_URL="postgresql://xpensist_user:password@localhost/xpensist_prod"
SMTP_PASS="your-sendgrid-api-key"
STRIPE_SECRET_KEY="sk_live_xxx"
STRIPE_WEBHOOK_SECRET="whsec_xxx"
SUPPORT_EMAIL="support@yourdomain.com"
# ... etc
```

7. **Run Database Migrations**
```bash
npm run db:migrate
```

8. **Setup PM2 (Process Manager)**
```bash
npm install -g pm2
pm2 start src/server.js --name "xpensist-api"
pm2 startup
pm2 save
```

### Nginx Reverse Proxy

1. **Install Nginx**
```bash
apt install -y nginx
```

2. **Create Config** (`/etc/nginx/sites-available/api.xpensist.com`)
```nginx
upstream xpensist_api {
    server localhost:4000;
}

server {
    listen 80;
    server_name api.xpensist.com;

    location / {
        proxy_pass http://xpensist_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

3. **Enable Site**
```bash
ln -s /etc/nginx/sites-available/api.xpensist.com /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### SSL with Cloudflare

1. **In Cloudflare Dashboard**
   - Add DNS A record: `api.xpensist.com` → your VPS IP
   - Enable Cloudflare Proxy (orange cloud)
   - Set SSL/TLS to **Full (strict)**
   - Enable "Auto HTTPS Rewrites"

2. **Verify**
```bash
curl -I https://api.xpensist.com/health
# Should return 200 OK
```

---

## Post-Deployment

1. **Test Frontend**
   - Visit https://xpensist.com
   - Verify all pages load
   - Test signup flow

2. **Test Backend**
```bash
curl https://api.xpensist.com/health
# Should return {"status":"ok","timestamp":"..."}
```

3. **Monitor**
   - Watch PM2 logs: `pm2 logs`
   - Monitor Cloudflare Analytics
   - Set up error tracking (Sentry recommended)

4. **Set Up Daily Invoice Reminders**
```bash
# Add to crontab on backend server
0 8 * * * cd /opt/xpensist/backend && npm run jobs:invoice-reminders
```

---

## Troubleshooting

**502 Bad Gateway** → Backend not running
```bash
pm2 status
pm2 logs
```

**Email not sending** → Check SendGrid domain verification
- Verify SPF, DKIM, CNAME records with your domain registrar

**Database connection errors** → Check DATABASE_URL and PostgreSQL service
```bash
systemctl status postgresql
```

**High CPU/Memory** → Check logs for errors
```bash
pm2 logs --err
```

---

## Backup & Maintenance

1. **Weekly Database Backups**
```bash
pg_dump xpensist_prod | gzip > /backups/xpensist-$(date +%Y%m%d).sql.gz
```

2. **Monthly Log Rotation**
   - Configure logrotate for PM2 logs

3. **Keep Dependencies Updated**
```bash
npm outdated  # Check for updates
npm update    # Update safe versions
```

---

## Support

For issues or questions, check the main README.md or contact support@xpensist.com
