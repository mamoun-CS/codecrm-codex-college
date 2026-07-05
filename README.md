# Codex CRM

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/your-username/your-repository)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/your-username/your-repository)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

Codex CRM is a modern customer relationship management platform designed to help businesses centralize customer data, streamline sales operations, and automate everyday business workflows. Built for sales teams, managers, and organizations of all sizes, it improves collaboration, increases operational efficiency, and provides real-time insights for informed decision-making.

Project URL: Private Project
<!-- Replace with the live URL or "Private Project" -->

---

## 📚 Table of Contents
- [🔎 Overview](#-overview)
- [🎯 Project Goal](#-project-goal)
- [✨ Key Features](#-key-features)
- [🖼️ Screenshots](#️-screenshots)
- [🛠️ Technology Stack](#️-technology-stack)
- [🚀 Getting Started](#-getting-started)
- [📖 Usage](#-usage)
- [📁 Project Structure](#-project-structure)
- [⚙️ Configuration](#️-configuration)
- [🧩 Challenges and Solutions](#-challenges-and-solutions)
- [📈 Results and Impact](#-results-and-impact)
- [📋 Project Information](#-project-information)
- [👥 Team and Contributors](#-team-and-contributors)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [📬 Contact](#-contact)

---

## 🔎 Overview

Codex CRM is a modern Customer Relationship Management (CRM) platform designed to centralize customer data, sales operations, lead management, and business workflows within a secure, scalable, and easy-to-use environment.

The platform helps businesses streamline sales processes, improve customer relationships, automate repetitive tasks, and gain real-time insights into business performance, while providing administrators with powerful tools to manage users, monitor activities, configure workflows, analyze performance metrics, and maintain full control over the system.

Built using modern technologies and enterprise-grade architecture, Codex CRM delivers a fast, secure, and responsive experience across desktop, tablet, and mobile devices, enabling organizations to improve productivity, enhance collaboration, and support sustainable business growth.
---

## 🎯 Project Goal

The goal of Codex CRM is to streamline customer relationship management, optimize sales operations, and centralize business processes within a single intelligent platform. By combining automation, real-time analytics, and secure data management, the system enables organizations to improve productivity, strengthen customer engagement, and make data-driven decisions.

The system provides:

- ✅ A centralized workspace for managing leads, customers, sales pipelines, deals, tasks, and business operations.
- ✅ Reliable access to real-time customer, sales, and performance data from a unified dashboard.
- ✅ Automated handling of repetitive workflows, notifications, follow-ups, and business processes.
- ✅ Comprehensive reporting, KPI dashboards, and actionable business insights for informed decision-making.
- ✅ A fast, responsive, and consistent user experience across desktop, tablet, and mobile devices.
- ✅ Secure management of users, roles, permissions, and business data with enterprise-grade access control.
---

## ✨ Key Features

| Feature | Description |
|---------|-------------|
| 🔐 **Authentication & Authorization** | Secure login, session management, and role-based access control |
| 📊 **Admin Dashboard** | Centralized management of users, content, settings, and operations |
| 🤖 **AI Integration** | [Describe AI automation, recommendations, or assisted workflows] |
| 💳 **Payments** | [Describe subscriptions, payments, invoices, or transaction processing] |
| 🔔 **Notifications** | In-app, email, SMS, or push notifications |
| 📈 **Analytics & Reporting** | Metrics, filters, reports, and data exports |
| 💬 **Chat & Collaboration** | [Describe messaging or collaboration functionality] |
| 🌍 **Multi-language Support** | Localized content and language-aware layouts |
| 🔎 **SEO Optimization** | Metadata, semantic markup, and optimized public pages |
| 📱 **Responsive Design** | Optimized for desktop, tablet, and mobile devices |



---

## 🖼️ Screenshots

*Store screenshots under `docs/screenshots/` and replace the placeholder paths below.*

| Home | Dashboard |
|------|-----------|
| ![Home](docs/screenshots/home.png) | ![Dashboard](docs/screenshots/dashboard.png) |

| Management | Analytics |
|------------|-----------|
| ![Management](docs/screenshots/management.png) | ![Analytics](docs/screenshots/analytics.png) |

| Mobile Home | Mobile Dashboard |
|-------------|------------------|
| ![Mobile Home](docs/screenshots/mobile-home.png) | ![Mobile Dashboard](docs/screenshots/mobile-dashboard.png) |

---

## 🛠️ Technology Stack

### Frontend
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

# Codex College CRM — Backend API

[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Required-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/license-UNLICENSED-lightgrey.svg)](#license)

The NestJS backend for Codex College CRM. It provides authentication, role-based access, lead and campaign management, analytics, marketing integrations, communications, CSV ingestion, and real-time updates for the CRM frontend.

## Table of contents

- [Features](#features)
- [Technology](#technology)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Local setup](#local-setup)
- [Environment variables](#environment-variables)
- [Database migrations](#database-migrations)
- [Running the application](#running-the-application)
- [API overview](#api-overview)
- [Authentication](#authentication)
- [Real-time events](#real-time-events)
- [Testing](#testing)
- [Docker](#docker)
- [Security and operations](#security-and-operations)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Features

- JWT authentication using email and password
- Access control for `super_admin`, `admin`, `manager`, `sales`, and `marketing`
- Lead lifecycle, assignment, transfer, notes, and status tracking
- Campaign, advertising-spend, landing-page, deal, and activity management
- Dashboards and analytics for sources, conversion, teams, trends, and ROI
- Facebook/Meta, Google, TikTok, WordPress, and external website integrations
- Twilio calls, SMTP email, email tracking, and Wassenger WhatsApp support
- Admin-only CSV imports for leads and advertising spend
- Socket.IO events scoped by user, role, and country
- PostgreSQL persistence with TypeORM migrations
- Optional Redis caching and BullMQ background processing
- Validation, CORS, Helmet headers, compression, and global rate limiting

## Technology

| Area | Technology |
| --- | --- |
| Runtime | Node.js |
| Framework | NestJS 11 |
| Language | TypeScript 5.7 |
| Database | PostgreSQL, TypeORM 0.3 |
| Authentication | Passport, JWT, bcrypt |
| Real-time | Socket.IO, NestJS WebSockets |
| Cache and jobs | Redis, BullMQ, `cache-manager` |
| Communications | Nodemailer, Twilio, Wassenger |
| Testing | Jest, Supertest |

## Architecture

The application is grouped by business domain under `src/`. Controllers define HTTP routes, services implement business logic, and entities define the PostgreSQL model.

```text
backend/
├── src/
│   ├── auth/                # Login, registration, JWT strategies and guards
│   ├── users/               # Users, roles, teams and marketing accounts
│   ├── leads/               # Lead CRUD, routing, transfers and ingestion
│   ├── lead-notes/          # Notes attached to leads
│   ├── campaigns/           # Campaigns and advertising spend
│   ├── analytics/           # CRM and marketing analytics
│   ├── dashboard/           # Role-specific dashboards
│   ├── integrations/        # OAuth, providers, webhooks and synchronization
│   ├── landing-pages/       # Landing-page content and settings
│   ├── deals/               # Sales deals
│   ├── messages/            # CRM messaging
│   ├── calls/               # Twilio calls
│   ├── email/               # Email delivery and tracking
│   ├── csv-upload/          # CSV imports
│   ├── events/              # Authenticated Socket.IO events
│   ├── realtime/            # Additional real-time gateway support
│   ├── entities/            # TypeORM entities and enums
│   ├── migrations/          # TypeORM migrations
│   └── common/              # Shared guards, decorators and interceptors
├── uploads/                 # Temporary upload storage
├── migrations/              # Supplemental SQL migrations
├── Dockerfile
└── package.json
```

REST controllers use the `/api` prefix. `/` and `/health` are intentionally excluded.

## Prerequisites

- Node.js 18.19 or newer (the Dockerfile currently uses Node 18 Alpine)
- npm
- PostgreSQL
- Redis only when `REDIS_ENABLED=true`

Provider credentials are optional unless the corresponding integration is enabled.

## Local setup

From the `backend` directory:

```bash
npm install
cp .env.example .env
```

Windows PowerShell equivalent:

```powershell
npm install
Copy-Item .env.example .env
```

Update `.env` with local PostgreSQL credentials and a strong JWT secret, then create the configured database. Never commit `.env` or production credentials.

TypeORM runs pending migrations during startup. Schema synchronization is disabled.

## Environment variables

### Core, database, and authentication

| Variable | Required | Default | Description |
| --- | :---: | --- | --- |
| `NODE_ENV` | No | — | `development` or `production` |
| `PORT` | No | `3001` | Initial HTTP port |
| `FRONTEND_URL` | No | `http://localhost:3000` | Frontend redirects and WebSocket CORS |
| `CORS_ORIGINS` | No | Localhost pattern | Comma-separated REST API origins |
| `BACKEND_URL` | No | `http://localhost:3001` | Public backend URL for callbacks |
| `CRM_DOMAIN` | No | Varies | Public CRM/API base URL |
| `API_URL` | No | — | Fallback external API URL |
| `DB_HOST` | Yes | `localhost` | PostgreSQL host |
| `DB_PORT` | No | `5432` | PostgreSQL port |
| `DB_USERNAME` | Yes | `postgres` | PostgreSQL user |
| `DB_PASSWORD` | Yes | Development fallback | PostgreSQL password |
| `DB_NAME` | Yes | `crm_v2` | Application database |
| `JWT_SECRET` | Yes | Insecure fallback | Token signing secret |
| `JWT_EXPIRES_IN` | No | `24h` | Token lifetime |

The server retries the next five ports if `PORT` is occupied. Check the startup log for the actual port.

### Redis

| Variable | Required | Default | Description |
| --- | :---: | --- | --- |
| `REDIS_ENABLED` | No | `false` | Enables Redis cache and BullMQ |
| `REDIS_HOST` | When enabled | `127.0.0.1` | Redis host |
| `REDIS_PORT` | No | `6379` | Redis port |
| `REDIS_PASSWORD` | No | — | Redis password |

With Redis disabled, caching is in memory and CSV uploads run inline.

### Email and messaging

| Variables | Used for |
| --- | --- |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE` | CRM SMTP connection |
| `SMTP_USER`, `SMTP_PASSWORD` | CRM SMTP credentials |
| `SMTP_FROM_NAME`, `SMTP_FROM_EMAIL` | CRM sender identity |
| `WELCOME_EMAIL_USER`, `WELCOME_EMAIL_PASSWORD` | Welcome-email credentials |
| `WELCOME_EMAIL_HOST`, `WELCOME_EMAIL_PORT`, `WELCOME_EMAIL_FROM` | Welcome-email server and sender |
| `NOTIFICATION_EMAIL_USER`, `NOTIFICATION_EMAIL_PASSWORD` | System notifications |
| `EMAIL_USER`, `EMAIL_PASSWORD` | Legacy/general email configuration |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` | Calling |
| `WASSENGER_API_KEY` | WhatsApp |

### Marketing integrations

| Variables | Used for |
| --- | --- |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` | Meta application |
| `FACEBOOK_CLIENT_ID`, `FACEBOOK_CLIENT_SECRET` | Alternate Meta OAuth names |
| `FACEBOOK_REDIRECT_URI`, `FACEBOOK_SCOPES` | Meta OAuth configuration |
| `FACEBOOK_VERIFY_TOKEN` or `FB_VERIFY_TOKEN` | Meta webhook verification |
| `TIKTOK_CLIENT_ID`, `TIKTOK_CLIENT_SECRET` | TikTok OAuth |
| `TIKTOK_REDIRECT_URI`, `TIKTOK_STATE_SECRET` | TikTok OAuth configuration |
| `TIKTOK_WEBHOOK_SECRET` | TikTok webhook verification |
| `RECAPTCHA_SECRET_KEY` | Public form verification |

The checked-in `.env.example` is only a starting point; add variables required by enabled integrations.

## Database migrations

```bash
# Apply pending migrations
npm run migration:run

# Revert the latest migration
npm run migration:revert

# Generate from entity changes
npm run migration:generate -- src/migrations/DescribeChange

# Create an empty migration
npm run migration:create -- src/migrations/DescribeChange
```

Review generated migrations and back up production data before applying them. Do not enable TypeORM `synchronize` in production.

## Running the application

```bash
npm run start          # Standard development start
npm run start:dev      # Watch mode
npm run start:debug    # Watch mode with Node inspector
npm run start:prod     # Build and run compiled output
```

Default endpoints:

- API: `http://localhost:3001/api`
- Health: `http://localhost:3001/health`
- Root: `http://localhost:3001/`
- Socket.IO: `http://localhost:3001/`

## API overview

Swagger is not currently registered in `main.ts`; controller source is the authoritative API definition.

| Base path | Responsibility |
| --- | --- |
| `POST /api/auth/login` | Issue a JWT |
| `POST /api/auth/register` | Create a user; JWT required |
| `/api/users` | Users, roles, teams, and marketing accounts |
| `/api/leads` | Leads, assignment, transfer, sync, and public submission |
| `/api/leads/:leadId/notes` | Lead notes |
| `/api/campaigns` | Campaigns, statistics, leads, and advertising spend |
| `/api/deals` | Sales deals |
| `/api/analytics` | CRM and marketing analytics |
| `/api/dashboard` | Role-specific dashboard data |
| `/api/activity` | Activity feeds and entity history |
| `/api/landing-pages` | Landing-page management |
| `/api/landing/:slug` | Public landing-page retrieval |
| `/api/integrations` | Providers, OAuth, webhooks, and synchronization |
| `/api/integrations/google` | Google OAuth and status |
| `/api/integrations/facebook` | Facebook integration |
| `/api/integrations/tiktok` | TikTok OAuth and webhooks |
| `/api/csv-upload` | Admin CSV upload using multipart field `csvFile` |
| `/api/calls` | Twilio call initiation |
| `/api/twilio/settings` | Twilio configuration |
| `/api/messages` | CRM messages |
| `/api/email` | Email delivery and tracking |
| `/api/sync` | Lead synchronization |

```bash
# Health check
curl http://localhost:3001/health

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"your-password"}'

# Authenticated request
curl http://localhost:3001/api/leads \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Authentication

Protected endpoints expect:

```http
Authorization: Bearer <access-token>
```

Authorization combines JWT, role and permission guards with service-level data filtering. Supported roles are `super_admin`, `admin`, `manager`, `sales`, and `marketing`.

Integration callbacks, webhooks, public landing pages, and selected lead-submission routes use `@Public()`. Treat changes to those routes as security-sensitive and validate provider signatures or tokens.

## Real-time events

Socket.IO clients connect to the root namespace and pass a JWT in the authorization header or authentication payload:

```ts
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', {
  auth: { token: accessToken },
});
```

Authenticated clients join rooms for their user ID, role, and country. Events include `leadCreated`, `leadUpdated`, `leadDeleted`, `campaignCreated`, `campaignUpdated`, and `analyticsUpdated`.

## Testing

```bash
npm run test           # Unit tests
npm run test:watch     # Watch tests
npm run test:cov       # Coverage
npm run test:e2e       # End-to-end tests
npm run lint           # ESLint with fixes
npm run format         # Prettier
npm run build          # Compile
```

Automated coverage is currently limited. Add focused tests when changing authentication, permissions, lead routing, migrations, or webhooks.

## Docker

```bash
docker build -t codex-college-crm-backend .
docker run --rm -p 3001:3001 --env-file .env codex-college-crm-backend
```

The image uses a multi-stage Alpine build, production-only runtime dependencies, a non-root `nestjs` user, and port `3001`.

> The current Dockerfile health check requests `/api/health`, but the application exposes `/health`. Correct the Dockerfile path before relying on container health status.

## Security and operations

- Replace all example secrets and passwords before deployment.
- Generate a long random `JWT_SECRET`; source fallbacks are not production-safe.
- Restrict `CORS_ORIGINS` to trusted HTTPS origins.
- Keep PostgreSQL and Redis private and use TLS where available.
- Store credentials in a secret manager, not source control or image layers.
- Validate webhook signatures and audit every public integration route.
- Persist `uploads/` externally if files must survive container replacement.
- The database pool permits up to 100 connections per instance; size it for the deployment.
- The global rate limit is 120 requests per 60 seconds.
- Back up PostgreSQL before production migrations.

## Troubleshooting

### Database connection fails

Verify `DB_*`, PostgreSQL connectivity, and that the database exists. The application does not create the database.

### Server starts on an unexpected port

Startup increments the configured port on `EADDRINUSE`. Read the `Backend ready on port ...` log entry.

### Redis or CSV queue errors

Use `REDIS_ENABLED=false` for in-memory caching and inline CSV processing, or verify the Redis connection variables.

### OAuth callback fails

Confirm `BACKEND_URL`, `CRM_DOMAIN`, and provider redirect URLs are public and exactly match provider configuration.

### Browser requests fail due to CORS

Add the frontend's exact origin to the comma-separated `CORS_ORIGINS` value.

## License

This backend is private and marked `UNLICENSED` in `package.json`. No permission is granted to copy, distribute, or modify it outside terms established by the project owner.



### Database
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)](https://www.prisma.io/)

### Deployment
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://vercel.com/)

### Technology Overview

| Layer | Technology | Purpose |
|-------|------------|---------|
| **Frontend** | [Framework and UI libraries] | User interface and client-side workflows |
| **Backend** | [Runtime and framework] | Business logic and API services |
| **Database** | [Database and ORM] | Persistent storage and data access |
| **Authentication** | [Provider or library] | Identity, sessions, and access control |
| **Deployment** | [Hosting platform] | Build, delivery, and production hosting |
| **Monitoring** | [Monitoring tools] | Application health, errors, and diagnostics |

---

## 🚀 Getting Started

### Prerequisites

Install the following before running the project locally:
- **Node.js** 20 or later
- **npm** 10 or another supported package manager
- **[Database name]** and supported version
- **Docker** — optional

  RM
