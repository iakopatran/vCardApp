# vCard App - Project Roadmap & Audit

**Last Updated:** 2025-12-23
**Project Status:** ~80% Complete (Phase 1 Complete!)
**Next Milestone:** Phase 2 UX Improvements or Phase 3 Production Setup

---

## 📋 Table of Contents

1. [Executive Summary](#executive-summary)
2. [Completed Items](#completed-items)
3. [Current Architecture](#current-architecture)
4. [Phase 1: Critical Fixes](#phase-1-critical-fixes-remaining)
5. [Phase 2: UX Improvements](#phase-2-ux-improvements)
6. [Phase 3: Production Ready](#phase-3-production-ready)
7. [Phase 4: Advanced Features](#phase-4-advanced-features)
8. [Critical Issues & Security](#critical-issues--security)
9. [Environment Configuration](#environment-configuration)
10. [Deployment Checklist](#deployment-checklist)

---

## Executive Summary

### Project Overview
- **Name:** vCard Application
- **Tech Stack:** Wasp (React + Node.js), PostgreSQL, FastAPI (Python), Docker
- **Purpose:** Contact management with business card scanning and vCard export
- **Status:** Functional MVP with core features complete

### What Works Well ✅
- Complete contact CRUD operations
- Tile generation with color customization
- Business card image upload (S3)
- Input validation (Zod - client + server)
- Toast notifications for user feedback
- Secure CORS configuration
- Environment variable templates
- Authentication & user management
- Admin dashboard with analytics
- Docker infrastructure
- vCard export functionality

### Critical Gaps ❌
- No real payment/email/S3 services (all dummy credentials)
- Zero test coverage
- Messages system is a stub
- Missing search/filter/pagination
- No production meta tags/branding
- Tiles stored locally (need S3 for production)

---

## Completed Items

### ✅ Recently Completed (This Session)

#### 1. Business Card Upload Feature
**Status:** 100% Complete
**Files Modified:**
- `app/src/contacts/operations.ts` - Added cardImageKey parameter
- `app/src/contacts/CreateContactPage.tsx` - S3 upload integration
- `app/src/contacts/EditContactModal.tsx` - View/upload card images

**Features:**
- ✅ S3 upload logic with pre-signed URLs
- ✅ Image preview before upload
- ✅ Display existing card images
- ✅ Database stores S3 key (cardImageKey)
- ✅ Error handling and loading states

**Note:** Requires AWS S3 configuration to work (see Environment Configuration)

#### 2. Input Validation with Zod
**Status:** 100% Complete
**Files Created:**
- `app/src/contacts/validation.ts` - Validation schemas

**Files Modified:**
- `app/src/contacts/operations.ts` - Server-side validation
- `app/src/contacts/CreateContactPage.tsx` - Client-side validation
- `app/src/contacts/EditContactModal.tsx` - Client-side validation

**Validation Rules:**
- First Name: Required, 1-50 chars
- Last Name: Required, 1-50 chars
- Email: Optional, valid format, max 100 chars
- Phone: Optional, valid format, max 20 chars
- Company: Optional, max 100 chars
- Title: Optional, max 100 chars
- Website: Optional, valid URL, max 200 chars
- Notes: Optional, max 1000 chars

**Features:**
- ✅ Server-side validation (security)
- ✅ Client-side validation (UX)
- ✅ Real-time field validation on blur
- ✅ Inline error messages
- ✅ Visual indicators (red borders)
- ✅ Auto-clear errors on typing
- ✅ Pre-submit validation

#### 3. Toast Notifications
**Status:** 100% Complete
**Files Modified:**
- `app/src/client/App.tsx` - Added Toaster component
- `app/src/client/pages/Profile.tsx` - Success/error toasts for delete/update
- `app/src/contacts/CreateContactPage.tsx` - Success/error toasts for create

**Features:**
- ✅ Success toasts: "Contact created!", "Contact updated!", "Contact deleted!"
- ✅ Error toasts with descriptive messages
- ✅ Top-right positioning
- ✅ Consistent UX feedback across all operations

#### 4. CORS Security Fix
**Status:** 100% Complete
**Files Modified:**
- `tile-service/app.py` - Environment-based CORS origins
- `docker-compose.yml` - ALLOWED_ORIGINS environment variable

**Security Improvements:**
- ✅ Changed from `allow_origins=["*"]` to environment-based configuration
- ✅ Default to localhost URLs for development
- ✅ Production-ready (set ALLOWED_ORIGINS in production env)

#### 5. Environment Configuration Templates
**Status:** 100% Complete
**Files Created:**
- `app/.env.server.example` - Comprehensive server env template
- `app/.env.client.example` - Client env template with VITE_TILE_SERVICE_URL

**Documentation:**
- ✅ All required environment variables documented
- ✅ Comments explaining where to get credentials
- ✅ Sections for: Database, AWS S3, Stripe, Lemon Squeezy, Email, OpenAI, Analytics

#### 6. File Upload Type Safety
**Status:** 100% Complete
**Files Modified:**
- `app/src/contacts/CreateContactPage.tsx` - Type-safe file upload
- `app/src/contacts/EditContactModal.tsx` - Type-safe file upload

**Improvements:**
- ✅ Fixed TypeScript errors for fileType parameter
- ✅ Runtime validation for image file types (JPEG/PNG only)
- ✅ User-friendly error messages for unsupported file types

---

## Current Architecture

### Tech Stack
```
Frontend: React + TypeScript (Wasp framework)
Backend: Node.js + Prisma ORM (Wasp framework)
Database: PostgreSQL (Docker)
Tile Service: Python FastAPI (Docker, port 8000)
File Storage: AWS S3 (requires configuration)
Authentication: Wasp built-in (email/password)
Payments: Stripe + Lemon Squeezy (dummy keys)
```

### Database Schema (Simplified)
```prisma
model User {
  id        String    @id @default(uuid())
  email     String    @unique
  username  String?
  contacts  Contact[]
}

model Contact {
  id           String   @id @default(uuid())
  userId       String
  firstName    String
  lastName     String
  email        String
  phone        String
  company      String
  title        String
  website      String
  notes        String
  sourceType   String   // 'manual' | 'scanned'
  tileImageKey String?  // Path to tile image
  cardImageKey String?  // S3 key for business card
  vcardKey     String?  // Not implemented yet
  user         User     @relation(fields: [userId], references: [id])
}
```

### Key Components
- **Profile Page** (`app/src/client/pages/Profile.tsx`) - "My Cards" dashboard
- **Create Contact** (`app/src/contacts/CreateContactPage.tsx`) - Add new contact
- **Edit Modal** (`app/src/contacts/EditContactModal.tsx`) - Edit existing contact
- **Operations** (`app/src/contacts/operations.ts`) - Backend CRUD
- **Tile Service** (`tile-service/app.py`) - Generate name tiles
- **File Upload** (`app/src/file-upload/operations.ts`) - S3 integration

---

## Phase 1: Critical Fixes ✅ COMPLETE

**Time Estimate:** 2-3 days
**Priority:** HIGH
**Status:** ✅ **100% COMPLETE**

All Phase 1 tasks have been completed! The application now has:
- ✅ Business card upload feature (S3 integration)
- ✅ Comprehensive input validation (Zod - client + server)
- ✅ Toast notifications for user feedback
- ✅ Secure CORS configuration
- ✅ Environment variable templates
- ✅ Type-safe file uploads

**Next Steps:** Choose between Phase 2 (UX improvements) or Phase 3 (production setup)

---

## Phase 2: UX Improvements

**Time Estimate:** 5-7 days
**Priority:** MEDIUM

### 6. Auto-Generate Tiles on Name Entry
**Status:** Not Started
**Estimated Time:** 1-2 days

**Current:** User must click "Generate Tile" button
**Proposed:** Auto-generate when first/last name is entered

**Implementation:**
```typescript
// CreateContactPage.tsx
useEffect(() => {
  if (form.firstName.trim() && form.lastName.trim()) {
    // Debounce to avoid excessive API calls
    const timeoutId = setTimeout(() => {
      generateTile()
    }, 500)
    return () => clearTimeout(timeoutId)
  }
}, [form.firstName, form.lastName])
```

**Benefits:**
- Better UX (one less click)
- Tiles always available
- Consistent with edit modal behavior

---

### 7. Contact Search & Filter
**Status:** Not Started
**Estimated Time:** 2 days

**Features:**
- Search by name, company, email
- Filter by company
- Sort by: name (A-Z), date created, company
- Clear search/filter button

**UI Mockup:**
```
┌─────────────────────────────────────────┐
│ [Search...] [Filter ▼] [Sort ▼] [Clear]│
└─────────────────────────────────────────┘
```

**Implementation:**
- Add search input above contact grid
- Filter contacts array based on search query
- Add filter dropdown for company
- Add sort dropdown

**Files to Modify:**
- `app/src/client/pages/Profile.tsx`

**Benefits:**
- Essential for users with 100+ contacts
- Professional contact management app

---

### 8. Pagination
**Status:** Not Started
**Estimated Time:** 1 day

**Current:** All contacts load at once
**Proposed:** Load 20 contacts per page

**Implementation Options:**
1. **Load More Button** (Simpler)
2. **Numbered Pagination** (Traditional)
3. **Infinite Scroll** (Modern)

**Recommended:** Load More Button

**Backend Changes:**
```typescript
// operations.ts
export const getAllContactsByUser = async (args: { skip?: number, take?: number }, context) => {
  // ...
  return context.entities.Contact.findMany({
    where: { userId: context.user.id },
    orderBy: { createdAt: 'desc' },
    skip: args.skip || 0,
    take: args.take || 20,
  })
}
```

**Benefits:**
- Performance with large datasets
- Faster initial page load
- Better mobile experience

---

### 9. Toast Notifications (Already Listed in Phase 1)
See Phase 1, Task #3

---

## Phase 3: Production Ready

**Time Estimate:** 10-15 days
**Priority:** HIGH (before launch)

### 10. S3 Integration for Tiles
**Status:** Not Started
**Estimated Time:** 2-3 days

**Current:** Tiles stored in local filesystem (`tiles/`)
**Proposed:** Upload tiles to S3

**Why:**
- Local filesystem doesn't scale to multiple servers
- No backup/disaster recovery
- Production deployment requires cloud storage

**Implementation:**
1. Modify `tile-service/app.py` to upload to S3 after generation
2. Update `tileImageKey` to store S3 URLs instead of file paths
3. Update frontend to load tiles from S3 (with pre-signed URLs)

**Files to Modify:**
- `tile-service/app.py` - Add S3 upload after tile generation
- `app/src/contacts/operations.ts` - Store S3 URLs
- `app/src/client/pages/Profile.tsx` - Load from S3

**Benefits:**
- Scalable architecture
- Production-ready file storage
- CloudFront CDN integration possible

---

### 11. Configure Real Services
**Status:** Not Started
**Estimated Time:** 2-3 days

**Tasks:**

#### AWS S3 Setup
- [ ] Create S3 bucket
- [ ] Configure bucket CORS
- [ ] Create IAM user with S3 permissions
- [ ] Generate access keys
- [ ] Update `.env.server` with real credentials

#### Stripe Setup
- [ ] Create Stripe account
- [ ] Set up products/prices
- [ ] Get API keys
- [ ] Configure webhook endpoint
- [ ] Update `.env.server`

#### Email Provider
- [ ] Choose provider (SendGrid, Mailgun, AWS SES)
- [ ] Create account
- [ ] Verify domain
- [ ] Get API credentials
- [ ] Update `.env.server`
- [ ] Change `EMAIL_PROVIDER` from "Dummy"

**Benefits:**
- Functional payments
- Real email delivery
- Production-ready services

---

### 12. Update Meta Tags & Branding
**Status:** Not Started
**Estimated Time:** 0.5 days

**Current Issues:**
```wasp
// main.wasp
title: "My Open SaaS App",  // Template default
head: [
  "<meta name='description' content='Your apps main description...' />",
  "<meta property='og:url' content='https://your-saas-app.com' />",
]
```

**Tasks:**
- [ ] Update app title in `main.wasp`
- [ ] Write proper meta description
- [ ] Update OpenGraph tags (og:title, og:description, og:image)
- [ ] Create/replace favicon
- [ ] Add Google Analytics (or Plausible)
- [ ] Update all "My Open SaaS App" references

**Files to Modify:**
- `app/main.wasp`
- `app/public/favicon.ico`
- `app/public/og-image.png` (create)

**Benefits:**
- SEO optimization
- Professional branding
- Better social media sharing

---

### 13. Security Hardening
**Status:** Partially Complete (CORS remaining)
**Estimated Time:** 1-2 days

**Completed:**
- ✅ Input validation (Zod)
- ✅ Authentication on all routes
- ✅ Authorization checks (user owns contact)
- ✅ HttpError with proper status codes
- ✅ Path traversal protection in tile deletion

**Remaining:**
- [ ] Rate limiting on API endpoints
- [ ] CSRF protection (Wasp may handle)
- [ ] Content Security Policy (CSP) headers
- [ ] File upload size limits (already has 5MB limit)
- [ ] File type validation (images only)
- [ ] SQL injection protection (Prisma handles)

**Implementation:**
```typescript
// Add rate limiting middleware
import rateLimit from 'express-rate-limit'

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
})

app.use('/api', limiter)
```

**Benefits:**
- Protection from abuse/DDoS
- Compliance with security best practices
- Defense in depth

---

## Phase 4: Advanced Features

**Time Estimate:** 15-20 days
**Priority:** LOW (post-launch)

### 14. Messages System
**Status:** Stub Implementation
**Estimated Time:** 3-4 days

**Current:** Shows "under construction" page

**Tasks:**
- [ ] Create message submission form (contact page)
- [ ] Add `message` CRUD operations
- [ ] Admin dashboard to view messages
- [ ] Email notifications for new messages
- [ ] Mark as read/unread functionality
- [ ] Reply functionality (optional)

**Database Table Exists:**
```prisma
model ContactFormMessage {
  id        String   @id @default(uuid())
  name      String
  email     String
  message   String
  createdAt DateTime @default(now())
}
```

**Files to Create/Modify:**
- `app/src/messages/operations.ts` - CRUD operations
- `app/src/messages/MessagesForm.tsx` - User-facing form
- `app/src/admin/dashboards/messages/MessagesPage.tsx` - Admin view

**Benefits:**
- User support channel
- Lead generation
- Feature completion

---

### 15. OCR/AI Card Scanning
**Status:** Not Implemented
**Estimated Time:** 4-5 days

**Concept:** Upload business card photo → AI extracts fields → Auto-populate form

**Implementation:**
1. Use OpenAI Vision API (GPT-4 Vision)
2. Upload card image
3. API extracts: name, email, phone, company, title
4. Pre-populate contact form
5. User reviews and saves

**Database Ready:**
```prisma
sourceType: 'manual' | 'scanned'
```

**API Call:**
```typescript
const response = await openai.chat.completions.create({
  model: "gpt-4-vision-preview",
  messages: [{
    role: "user",
    content: [
      { type: "text", text: "Extract contact information from this business card" },
      { type: "image_url", image_url: cardImageUrl }
    ]
  }]
})
```

**Benefits:**
- Innovative feature
- Time-saving for users
- Differentiator from competitors

---

### 16. vCard File Storage (S3)
**Status:** Not Implemented
**Estimated Time:** 1-2 days

**Current:** vCard generated on-demand in memory

**Proposed:**
1. Generate vCard file when contact created/updated
2. Upload to S3
3. Store S3 key in `vcardKey` field
4. Serve pre-signed download URLs
5. Regenerate only when contact data changes

**Benefits:**
- Performance optimization
- Offload file generation
- Scalable architecture

---

### 17. Bulk Operations
**Status:** Not Implemented
**Estimated Time:** 2-3 days

**Features:**
- Select multiple contacts (checkboxes)
- Bulk delete
- Bulk export to CSV
- Bulk tag/categorize (requires tags feature)

**UI Mockup:**
```
┌──────────────────────────────────────────┐
│ [✓] Select All  [Delete] [Export CSV]   │
└──────────────────────────────────────────┘
[✓] John Doe
[ ] Jane Smith
[✓] Bob Johnson
```

**Benefits:**
- Power user feature
- Time-saving for large datasets
- Professional contact manager

---

## Phase 5: Testing & Quality

**Time Estimate:** 10-15 days
**Priority:** MEDIUM

### 18. Add Test Suite
**Status:** Zero Tests
**Estimated Time:** 5-7 days

**Current:** 0 test files

**Recommended:**
- Unit tests for operations (backend)
- Integration tests for API endpoints
- E2E tests for critical user flows
- Target: 70%+ code coverage

**Test Framework:** Vitest (already configured in Wasp)

**Example Tests:**
```typescript
// contacts/operations.test.ts
describe('createContact', () => {
  it('should create contact with valid data', async () => {
    const result = await createContact({
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      // ...
    }, mockContext)

    expect(result.firstName).toBe('John')
  })

  it('should reject invalid email', async () => {
    await expect(createContact({
      firstName: 'John',
      lastName: 'Doe',
      email: 'invalid',
    }, mockContext)).rejects.toThrow()
  })
})
```

**Benefits:**
- Prevent regressions
- Confidence in refactoring
- Documentation via tests

---

### 19. Accessibility Audit
**Status:** Not Started
**Estimated Time:** 2-3 days

**Tasks:**
- [ ] Add ARIA labels to all buttons
- [ ] Keyboard navigation (tab through forms)
- [ ] Focus management in modals
- [ ] Screen reader testing
- [ ] WCAG 2.1 AA compliance check
- [ ] Color contrast verification (already AAA on tiles)

**Tools:**
- axe DevTools
- Lighthouse
- NVDA/JAWS screen readers

**Benefits:**
- Inclusive design
- Legal compliance
- Better SEO

---

### 20. Performance Optimization
**Status:** Not Started
**Estimated Time:** 2-3 days

**Tasks:**
- [ ] Image lazy loading (tiles)
- [ ] Code splitting (React.lazy)
- [ ] Database query optimization
- [ ] React.memo for expensive components
- [ ] Bundle size analysis

**Tools:**
- Lighthouse
- React DevTools Profiler
- Webpack Bundle Analyzer

**Targets:**
- First Contentful Paint < 1.5s
- Time to Interactive < 3s
- Lighthouse score > 90

**Benefits:**
- Better user experience
- Improved SEO
- Lower server costs

---

## Critical Issues & Security

### 🔴 HIGH RISK

1. **No Input Validation** ✅ FIXED
   - ~~SQL injection risk~~
   - ~~Data quality issues~~
   - **Status:** COMPLETE (Zod validation added)

2. **Dummy Payment Keys**
   - Cannot process real payments
   - **Fix:** Configure Stripe with real API keys
   - **Phase:** 3

3. **CORS Allow All**
   - Security vulnerability in production
   - **Fix:** Restrict CORS to your domain
   - **Phase:** 1

### 🟡 MEDIUM RISK

1. **Local File Storage**
   - Not scalable
   - No disaster recovery
   - **Fix:** Move tiles to S3
   - **Phase:** 3

2. **No Rate Limiting**
   - Vulnerable to abuse
   - **Fix:** Add rate limiting middleware
   - **Phase:** 3

3. **No Tests**
   - High regression risk
   - **Fix:** Add test suite
   - **Phase:** 5

### 🟢 LOW RISK

1. **Missing Toasts**
   - Poor UX but not breaking
   - **Fix:** Add toast notifications
   - **Phase:** 1

2. **No Pagination**
   - Performance degrades with many contacts
   - **Fix:** Implement pagination
   - **Phase:** 2

3. **Template Meta Tags**
   - SEO impact only
   - **Fix:** Update branding
   - **Phase:** 3

---

## Environment Configuration

### Required Environment Variables

#### `.env.server`
```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/vcard_db

# Wasp
WASP_WEB_CLIENT_URL=http://localhost:3000
WASP_SERVER_URL=http://localhost:3001

# AWS S3 (REQUIRED FOR BUSINESS CARD UPLOAD)
AWS_S3_IAM_ACCESS_KEY=your-access-key-here
AWS_S3_IAM_SECRET_KEY=your-secret-key-here
AWS_S3_FILES_BUCKET=your-bucket-name
AWS_S3_REGION=us-east-1

# Stripe (for payments)
STRIPE_API_KEY=sk_test_your_key
STRIPE_WEBHOOK_SECRET=whsec_your_secret
PAYMENTS_HOBBY_SUBSCRIPTION_PLAN_ID=price_xxx
PAYMENTS_PRO_SUBSCRIPTION_PLAN_ID=price_xxx

# Email
EMAIL_PROVIDER=Dummy  # Change to SendGrid, Mailgun, etc.
EMAIL_FROM_ADDRESS=noreply@yourdomain.com

# OpenAI (for future OCR feature)
OPENAI_API_KEY=sk-proj-your-key

# Lemon Squeezy (alternative payment processor)
LEMONSQUEEZY_API_KEY=your-key
LEMONSQUEEZY_STORE_ID=your-store-id
```

#### `.env.client`
```bash
# Google Analytics
REACT_APP_GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX

# Tile Service URL (IMPORTANT!)
VITE_TILE_SERVICE_URL=http://localhost:8000

# Production: https://tiles.yourdomain.com
```

#### Docker Environment (`docker-compose.yml`)
```yaml
tile-service:
  environment:
    TILE_OUTPUT_DIR: "/tiles"
    ALLOWED_ORIGINS: "http://localhost:3000,http://localhost:3001"
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] Create `.env.server.example` and `.env.client.example`
- [ ] Remove all dummy credentials from `.env.server`
- [ ] Update CORS allowed origins in tile-service
- [ ] Set up production database (AWS RDS, Supabase, or Neon)
- [ ] Configure S3 bucket with proper IAM permissions
- [ ] Set up Stripe webhook endpoint
- [ ] Configure email provider (SendGrid, Mailgun)
- [ ] Update meta tags with real app information
- [ ] Set up SSL certificate
- [ ] Configure domain DNS
- [ ] Run all tests (once test suite exists)
- [ ] Check all environment variables on deployment platform

### Deployment

- [ ] Deploy database migrations
- [ ] Deploy tile-service (Docker container or serverless)
- [ ] Deploy Wasp app (follow Wasp deployment guide)
- [ ] Seed admin user
- [ ] Test critical user flows
- [ ] Set up monitoring (Sentry, LogRocket)
- [ ] Configure backups (database, S3)
- [ ] Set up uptime monitoring

### Post-Deployment

- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Verify email delivery
- [ ] Test payment flows with real Stripe
- [ ] Review security headers
- [ ] Run Lighthouse audit
- [ ] Document deployment process

---

## Infrastructure Costs (Monthly)

### Development
- **Database:** $0 (local PostgreSQL)
- **File Storage:** $0 (local filesystem)
- **Tile Service:** $0 (local Docker)
- **Total:** $0/month

### Production (Estimated)
- **Database:** $15-30 (Supabase/Neon/AWS RDS)
- **File Storage:** $5-10 (AWS S3 + CloudFront)
- **Hosting:** $20-50 (Wasp deployment + tile service)
- **Email:** $0-15 (SendGrid free tier or paid)
- **Domain/SSL:** $15/year (~$1.25/month)
- **Monitoring:** $0-30 (Sentry free tier or paid)
- **Total:** $40-135/month

---

## Development Time Estimates

### By Phase

| Phase | Description | Days | Developer |
|-------|-------------|------|-----------|
| Phase 1 | Critical Fixes (remaining) | 2-3 | 1 |
| Phase 2 | UX Improvements | 5-7 | 1 |
| Phase 3 | Production Ready | 10-15 | 1 |
| Phase 4 | Advanced Features | 15-20 | 1 |
| Phase 5 | Testing & Quality | 10-15 | 1 |
| **Total** | **Complete to Production** | **42-60 days** | **1 developer** |

### By Priority

| Priority | Tasks | Days |
|----------|-------|------|
| **HIGH** | Phase 1 + Phase 3 | 12-18 |
| **MEDIUM** | Phase 2 + Phase 5 | 15-22 |
| **LOW** | Phase 4 | 15-20 |

---

## Quick Start Guide

### For Developers Joining the Project

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd vCardApp
   ```

2. **Set up environment variables**
   ```bash
   # Copy examples
   cp app/.env.server.example app/.env.server
   cp app/.env.client.example app/.env.client

   # Edit with your credentials
   nano app/.env.server
   ```

3. **Start Docker services**
   ```bash
   docker-compose up -d
   ```

4. **Start Wasp development server**
   ```bash
   cd app
   wasp start
   ```

5. **Access the app**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001
   - Tile Service: http://localhost:8000

### Current State
- ✅ Contact CRUD works
- ✅ Tile generation works
- ✅ Validation works
- ⚠️ Business card upload needs S3 configuration
- ⚠️ Payments need Stripe configuration
- ⚠️ Emails won't send (using Dummy provider)

---

## Contact & Support

For questions about this roadmap or project:
- Review this document
- Check `app/README.md` for Wasp-specific docs
- See Wasp documentation: https://wasp-lang.dev/docs

---

## Revision History

| Date | Version | Changes |
|------|---------|---------|
| 2025-12-23 | 1.0 | Initial roadmap created after audit |
| 2025-12-23 | 1.1 | Updated with completed items (business card upload, validation) |

---

**End of Roadmap**

This document should be updated as tasks are completed and priorities shift.
