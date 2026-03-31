# Xpensist Production Environment Checklist

Last Updated: March 31, 2026

Use this as a strict pass/fail checklist before enabling broad paid signup.

## How To Use

- Mark each item `PASS` only after it is verified in the live production environment.
- If any `BLOCKER` item is not complete, do not launch publicly.

Legend:
- `BLOCKER`: must pass before launch
- `HIGH`: strongly recommended before broad launch
- `MEDIUM`: complete during controlled beta week

---

## 1) Backend Environment Variables

| Variable | Required | Severity | Status | Notes |
|---|---|---|---|---|
| `DATABASE_URL` | Yes | BLOCKER | [ ] PASS / [ ] FAIL | Points to production PostgreSQL |
| `JWT_SECRET` | Yes | BLOCKER | [ ] PASS / [ ] FAIL | 32+ random chars, not default |
| `JWT_REFRESH_SECRET` | Yes | BLOCKER | [ ] PASS / [ ] FAIL | 32+ random chars, not default |
| `ADMIN_JWT_SECRET` | Yes | BLOCKER | [ ] PASS / [ ] FAIL | Separate admin secret, 32+ chars |
| `ADMIN_JWT_AUDIENCE` | Yes | BLOCKER | [ ] PASS / [ ] FAIL | Must match backend config |
| `JWT_EXPIRES_IN` | Yes | HIGH | [ ] PASS / [ ] FAIL | Recommended `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Yes | HIGH | [ ] PASS / [ ] FAIL | Recommended `7d` |
| `LOGIN_MAX_FAILED_ATTEMPTS` | Yes | HIGH | [ ] PASS / [ ] FAIL | Suggested `5` |
| `LOGIN_LOCK_MINUTES` | Yes | HIGH | [ ] PASS / [ ] FAIL | Suggested `15` |
| `ADMIN_LOGIN_MAX_FAILED_ATTEMPTS` | Yes | HIGH | [ ] PASS / [ ] FAIL | Suggested `5` |
| `ADMIN_LOGIN_LOCK_MINUTES` | Yes | HIGH | [ ] PASS / [ ] FAIL | Suggested `15` |
| `CLIENT_URL` | Yes | BLOCKER | [ ] PASS / [ ] FAIL | Exact frontend origin |
| `ADMIN_CLIENT_URL` | Yes | BLOCKER | [ ] PASS / [ ] FAIL | Exact admin frontend origin |
| `TRUST_PROXY` | Yes | BLOCKER | [ ] PASS / [ ] FAIL | Set when behind proxy/CDN |
| `NODE_ENV` | Yes | BLOCKER | [ ] PASS / [ ] FAIL | Must be `production` |
| `PORT` | Yes | MEDIUM | [ ] PASS / [ ] FAIL | Matches runtime service config |

---

## 2) Admin Security Configuration

| Variable | Required | Severity | Status | Notes |
|---|---|---|---|---|
| `ADMIN_EMAILS` | Yes | BLOCKER | [ ] PASS / [ ] FAIL | Only trusted operators |
| `ADMIN_USER_IDS` | Optional | MEDIUM | [ ] PASS / [ ] FAIL | Use if needed |
| `ADMIN_TOTP_SECRETS` | Yes | BLOCKER | [ ] PASS / [ ] FAIL | Every admin has a valid TOTP secret |
| `ADMIN_IP_ALLOWLIST` | Strongly Yes | HIGH | [ ] PASS / [ ] FAIL | Restrict to trusted office/VPN CIDRs |

Validation steps:
- [ ] Admin login from allowed IP works
- [ ] Admin login from blocked IP is denied
- [ ] Wrong TOTP is denied
- [ ] Repeated failed admin logins trigger lockout

---

## 3) Billing and Email Configuration

| Variable | Required | Severity | Status | Notes |
|---|---|---|---|---|
| `STRIPE_SECRET_KEY` | Yes | BLOCKER | [ ] PASS / [ ] FAIL | Live key in production |
| `STRIPE_WEBHOOK_SECRET` | Yes | BLOCKER | [ ] PASS / [ ] FAIL | Matches live webhook endpoint |
| `STRIPE_PRICE_STARTER` | Yes | BLOCKER | [ ] PASS / [ ] FAIL | Correct live price ID |
| `STRIPE_PRICE_PROFESSIONAL` | Yes | BLOCKER | [ ] PASS / [ ] FAIL | Correct live price ID |
| `STRIPE_PRICE_BUSINESS` | Yes | BLOCKER | [ ] PASS / [ ] FAIL | Correct live price ID |
| `SMTP_HOST` | Yes | BLOCKER | [ ] PASS / [ ] FAIL | Valid SMTP host |
| `SMTP_PORT` | Yes | BLOCKER | [ ] PASS / [ ] FAIL | Usually 587 |
| `SMTP_USER` | Yes | BLOCKER | [ ] PASS / [ ] FAIL | Valid user/API key mode |
| `SMTP_PASS` | Yes | BLOCKER | [ ] PASS / [ ] FAIL | Valid credential |
| `FROM_EMAIL` | Yes | BLOCKER | [ ] PASS / [ ] FAIL | Verified sending domain |
| `SUPPORT_EMAIL` | Yes | HIGH | [ ] PASS / [ ] FAIL | Receives support traffic |

Validation steps:
- [ ] Live checkout session succeeds
- [ ] Webhook event is accepted and processed
- [ ] Support form email sends successfully
- [ ] Invoice email sends successfully

---

## 4) Frontend Environment Variables

| Variable | Required | Severity | Status | Notes |
|---|---|---|---|---|
| `VITE_API_URL` | Yes | BLOCKER | [ ] PASS / [ ] FAIL | Points to production API base URL |

Validation steps:
- [ ] Register from production UI succeeds
- [ ] Login/logout from production UI succeeds
- [ ] Refresh session works after page reload
- [ ] Admin panel login flow works (allowed origin)

---

## 5) Data Protection and Reliability

| Check | Severity | Status | Evidence |
|---|---|---|---|
| Automated DB backups enabled | BLOCKER | [ ] PASS / [ ] FAIL | Backup job details |
| Backup restore drill completed | BLOCKER | [ ] PASS / [ ] FAIL | Date + restore duration |
| API uptime monitor active | HIGH | [ ] PASS / [ ] FAIL | Monitoring URL |
| Frontend uptime monitor active | HIGH | [ ] PASS / [ ] FAIL | Monitoring URL |
| 5xx alert route tested | HIGH | [ ] PASS / [ ] FAIL | Test timestamp |
| Billing/webhook failure alert tested | HIGH | [ ] PASS / [ ] FAIL | Test timestamp |

---

## 6) Required Pre-Launch Commands

Run and record outputs:

```bash
# Backend
cd backend
npm run test:security
npm run test:auth-smoke

# Frontend
cd ../frontend
npm run test:e2e:auth
```

Status:
- [ ] Backend security tests pass
- [ ] Backend auth smoke test passes
- [ ] Frontend auth UI smoke test passes

---

## 7) Go/No-Go Decision

Go only if all blocker items pass.

- [ ] GO: All BLOCKER items are PASS
- [ ] NO-GO: At least one BLOCKER item is FAIL

Approver:
- Name: ____________________
- Date: ____________________
- Notes: ____________________
