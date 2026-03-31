# Xpensist Operations Runbook

Last Updated: March 31, 2026

## Purpose

This runbook defines exactly how to detect, triage, communicate, and recover from production incidents for Xpensist.

Scope:
- Backend API and database
- Frontend availability and auth flows
- Billing and email delivery paths
- Admin access and security events

## Service Ownership

Use named owners in production. Fill this table before full launch.

| Role | Primary | Secondary | Contact Channel |
|---|---|---|---|
| Incident Commander | TBD | TBD | Pager + Slack #incidents |
| Backend Owner | TBD | TBD | Pager + Slack #backend |
| Frontend Owner | TBD | TBD | Pager + Slack #frontend |
| Data/DB Owner | TBD | TBD | Pager + Slack #database |
| Customer Comms | TBD | TBD | support@xpensist.com |

## Severity Levels

- Sev 1: Revenue-blocking outage, data integrity risk, auth completely down, or active security incident.
- Sev 2: Major feature degradation (login failures for a segment, billing failures, high 5xx).
- Sev 3: Minor degradation with workaround.
- Sev 4: Cosmetic/low-risk issue.

## Alert Thresholds

Trigger alerts at these thresholds:

### API / App Health

- Sev 1: API 5xx rate > 5% for 5 minutes.
- Sev 2: API 5xx rate > 2% for 10 minutes.
- Sev 2: p95 API latency > 1500ms for 10 minutes.
- Sev 3: p95 API latency > 800ms for 15 minutes.
- Sev 1: Health endpoint down for 3 consecutive checks.

### Authentication / Security

- Sev 1: Login success rate drops below 70% for 10 minutes.
- Sev 2: Login success rate drops below 85% for 10 minutes.
- Sev 2: Refresh token failure rate > 10% for 10 minutes.
- Sev 2: Admin login failure spike > 20 failures in 15 minutes.
- Sev 1: Any confirmed unauthorized admin access attempt or credential leak.

### Billing / Stripe

- Sev 1: Webhook signature verification failures spike above 20 in 10 minutes.
- Sev 2: Webhook delivery failures > 10 in 15 minutes.
- Sev 2: Checkout session creation failures > 5% for 10 minutes.
- Sev 1: No successful webhook processing for 30+ minutes during normal traffic.

### Email / Notifications

- Sev 2: SMTP send failures > 10% for 15 minutes.
- Sev 3: Reminder job failure on a scheduled run.

### Infrastructure / Data

- Sev 1: Database unavailable > 2 minutes.
- Sev 2: DB connection utilization > 85% for 10 minutes.
- Sev 2: CPU > 85% for 15 minutes.
- Sev 2: Memory > 90% for 10 minutes.
- Sev 1: Disk free < 10%.
- Sev 1: No successful backup in 24 hours.

## First 15 Minutes (Incident Triage)

1. Declare severity and assign Incident Commander.
2. Freeze deployments.
3. Confirm blast radius:
   - login/signup
   - dashboard core APIs
   - billing/checkout/webhooks
   - admin access
4. Open incident channel and start timestamped timeline.
5. Post initial customer-facing status update for Sev 1/2.

## Diagnostic Commands

Backend host:

```bash
pm2 status
pm2 logs --lines 200
curl -sS https://api.xpensist.com/health
df -h
free -m
```

Database checks:

```bash
psql "$DATABASE_URL" -c "select now();"
psql "$DATABASE_URL" -c "select count(*) from \"User\";"
```

Prisma sanity:

```bash
npx prisma validate
npx prisma migrate status
```

## Rollback Playbooks

### Frontend Rollback (Cloudflare Pages)

1. Open Cloudflare Pages project.
2. Select last known good deployment.
3. Click Rollback/Promote.
4. Verify `/login`, `/register`, `/dashboard` load.
5. Confirm API calls from frontend succeed.

### Backend Rollback (PM2 + release directory)

Recommended release layout:
- `/opt/xpensist/releases/<timestamp>`
- `/opt/xpensist/current` symlink

Rollback steps:

```bash
cd /opt/xpensist
ln -sfn /opt/xpensist/releases/<last_good_release> current
cd current/backend
npm ci --omit=dev
npx prisma generate
pm2 restart xpensist-api
pm2 logs --lines 100
```

### Migration Rollback

If migration is reversible, apply the documented down migration.
If not reversible, restore from backup:

```bash
gunzip -c /backups/xpensist-YYYYMMDD.sql.gz | psql "$DATABASE_URL"
```

Always verify:
- authentication flows
- invoice list/create
- billing webhook endpoint health

## Security Incident Playbook

When suspicious admin or auth activity is detected:

1. Rotate `ADMIN_JWT_SECRET`, `JWT_SECRET`, and `JWT_REFRESH_SECRET`.
2. Force logout by clearing refresh tokens:

```bash
psql "$DATABASE_URL" -c 'DELETE FROM "RefreshToken";'
```

3. Confirm `ADMIN_IP_ALLOWLIST` and `ADMIN_EMAILS` are correct.
4. Audit recent admin actions from logs and database audit records.
5. Communicate impact and remediation to affected customers.

## Customer Communication Templates

### Initial (Sev 1/2)

"We are currently investigating an issue affecting Xpensist [feature]. We have identified impact and are actively mitigating. Next update in 30 minutes."

### Recovery

"Service has been restored for [feature]. We are monitoring closely and completing a full post-incident review."

### Postmortem

"On [date/time], Xpensist experienced [issue]. Impact: [summary]. Root cause: [summary]. Fixes: [actions]. Prevention: [follow-up work with owners and due dates]."

## Post-Incident Review Checklist

1. Root cause identified and documented.
2. Timeline finalized with exact timestamps.
3. Corrective actions converted into tracked tickets.
4. Detection gaps converted into new alerts/tests.
5. Runbook updated with lessons learned.

## Weekly Reliability Routine

1. Review alert noise and tune thresholds.
2. Verify one successful backup and one restore dry-run per month.
3. Review dependency vulnerabilities and patch cadence.
4. Review auth/admin security logs for anomalies.
