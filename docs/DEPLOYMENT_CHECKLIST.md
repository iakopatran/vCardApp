# Final Stretch to Deployment

> **Audit Date:** February 10, 2026
> **Current Status:** TEST MODE - Ready for Production Migration

---

## Current Configuration Summary

| Aspect | Current Value | Status |
|--------|---------------|--------|
| Payment Provider | Stripe | Integrated |
| Payment Type | One-time purchase (40 credits / $9.99) | Configured |
| API Key | `sk_test_*` | TEST MODE |
| Webhook Secret | `whsec_dummy` | Placeholder |
| Customer Portal | `localhost:3000/fake-portal` | Local only |
| Email Provider | Dummy (console logging) | Not production-ready |
| Database | Local PostgreSQL | Needs production instance |

---

## Steps to Reach Production

### 1. Stripe Dashboard Configuration

Complete these tasks in your [Stripe Dashboard](https://dashboard.stripe.com):

- [ ] **Activate Stripe Account**
  - Complete business verification if not already done
  - Provide required tax/business information

- [ ] **Get Live API Key**
  - Navigate to: Developers → API Keys
  - Copy the `sk_live_*` secret key (keep secure, never commit to git)

- [ ] **Create Live Product & Price**
  - Navigate to: Products → Add Product
  - Create: "40 Credits" product at $9.99 (one-time)
  - Copy the new `price_*` ID

- [ ] **Configure Production Webhook**
  - Navigate to: Developers → Webhooks → Add endpoint
  - URL: `https://yourdomain.com/payments-webhook`
  - Events to listen for: `checkout.session.completed`
  - Copy the `whsec_*` signing secret

- [ ] **Set Up Customer Portal**
  - Navigate to: Settings → Billing → Customer portal
  - Configure portal settings
  - Copy the portal link URL

---

### 2. Update Environment Variables

Replace these values in your production environment (NOT in `.env.server` for production):

```env
# Production Stripe Configuration
STRIPE_API_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
STRIPE_CUSTOMER_PORTAL_URL=https://billing.stripe.com/p/login/xxxxx
PAYMENTS_CREDITS_PLAN_ID=price_xxxxxxxxxxxxxxxxxxxxx

# Production Database
DATABASE_URL=postgresql://user:password@production-host:5432/vcard_db

# Production Email (SendGrid)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Other Production Keys
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
GOOGLE_CLIENT_ID=xxxxxxxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxx
```

---

### 3. Configure Production Email

Update your Wasp email provider configuration:

**Current (Development):**
```js
emailSender: {
  provider: Dummy,
}
```

**Production:**
```js
emailSender: {
  provider: SendGrid,
  defaultFrom: {
    name: "vCard App",
    email: "noreply@yourdomain.com",
  },
}
```

---

### 4. Set Up Production Database

Choose a managed PostgreSQL provider:

| Provider | Pros |
|----------|------|
| [Railway](https://railway.app) | Easy setup, good free tier |
| [Supabase](https://supabase.com) | Postgres + extras, generous free tier |
| [Neon](https://neon.tech) | Serverless Postgres, scales to zero |
| [AWS RDS](https://aws.amazon.com/rds/) | Enterprise-grade, more complex |

**After provisioning:**
1. Copy the connection string
2. Update `DATABASE_URL` in production environment
3. Run migrations: `wasp db migrate-deploy`

---

### 5. Deploy the Application

**Environment Setup:**
```env
NODE_ENV=production
WASP_WEB_CLIENT_URL=https://yourdomain.com
```

**Deployment Options:**
- [Fly.io](https://fly.io) - Wasp has built-in support: `wasp deploy fly`
- [Railway](https://railway.app) - Docker-based deployment
- [Render](https://render.com) - Simple container hosting

**Tile Service Deployment:**
- Deploy the Python tile service separately
- Update `VITE_TILE_SERVICE_URL` to production URL
- Configure CORS to allow your production domain

---

### 6. Post-Deployment Verification

- [ ] **Test Real Transaction**
  - Make a small real purchase
  - Verify payment appears in Stripe Dashboard
  - Confirm credits are awarded to user account

- [ ] **Verify Webhook Events**
  - Check Stripe Dashboard → Webhooks → Recent events
  - Confirm events are being received (200 status)
  - Look for any failed deliveries

- [ ] **Test Customer Portal**
  - Access portal from user account
  - Verify payment history displays correctly

- [ ] **Test Email Delivery**
  - Trigger a verification email
  - Confirm emails are being sent and received

---

## Security Checklist

### Before Go-Live

- [ ] **Rotate All Keys**
  - Never use test keys in production
  - Generate fresh production keys

- [ ] **Remove Test UI Elements**
  - Remove test card display from `PricingPage.tsx` (line showing `4242 4242 4242 4242`)

- [ ] **Secure Environment Files**
  - Ensure `.env.server` is in `.gitignore`
  - Use environment variables from hosting provider
  - Never commit secrets to version control

- [ ] **Enable Stripe Radar**
  - Stripe Dashboard → Radar → Enable
  - Provides fraud protection out of the box

- [ ] **Set Up Monitoring**
  - Configure alerts for failed payments
  - Monitor webhook delivery success rate
  - Set up error tracking (Sentry, etc.)

### Production Security Features Already Implemented

- Webhook signature verification (HMAC-SHA256)
- Idempotency via unique `stripeSessionId`
- Atomic database transactions for credit updates
- One-time checkout (no subscription attack vectors)

---

## File Reference

Key files for payment configuration:

| File | Purpose |
|------|---------|
| `app/.env.server` | Environment variables (dev only) |
| `app/src/payment/stripe/stripeClient.ts` | Stripe SDK initialization |
| `app/src/payment/stripe/webhook.ts` | Webhook handler |
| `app/src/payment/stripe/checkoutUtils.ts` | Checkout session creation |
| `app/src/payment/plans.ts` | Payment plan definitions |
| `app/src/payment/PricingPage.tsx` | Pricing UI (remove test card info) |
| `app/schema.prisma` | Database schema (User, Payment models) |

---

## Migration History Note

This project was migrated from LemonSqueezy to Stripe on February 3, 2026. The migration:
- Removed all LemonSqueezy integration code
- Created new Payment table for Stripe
- Dropped `lemonSqueezyCustomerPortalUrl` from User model

All current payment logic is Stripe-only.

---

## Quick Reference Commands

```bash
# Run database migrations in production
wasp db migrate-deploy

# Deploy to Fly.io
wasp deploy fly

# Test webhook locally (development)
stripe listen --forward-to localhost:3001/payments-webhook
```

---

## Support & Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Wasp Deployment Guide](https://wasp-lang.dev/docs/advanced/deployment/overview)
- [Stripe Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
