# LoopLayer Designs — Enterprise Backend Architecture

A production-ready, clean-architecture backend engine powering the **LoopLayer Designs** custom vector art, embroidery digitizing, and patches quoting platform.

Built with **Node.js (ES Modules)**, **Express.js**, **MongoDB Atlas (Mongoose)**, **JWT + bcrypt**, **Cloudinary**, and **Zoho Mail SMTP**.

---

## Table of Contents

1. [Architectural Overview](#architectural-overview)
2. [Folder & Project Structure](#folder--project-structure)
3. [Database Architecture & Schemas](#database-architecture--schemas)
4. [Atomic Request ID Generation](#atomic-request-id-generation)
5. [Environment Variables Matrix](#environment-variables-matrix)
6. [Third-Party Integrations](#third-party-integrations)
   - [MongoDB Atlas](#1-mongodb-atlas)
   - [Cloudinary File Storage](#2-cloudinary-file-storage)
   - [Zoho Mail SMTP](#3-zoho-mail-smtp)
   - [JWT & Security Controls](#4-jwt--security-controls)
7. [Dynamic ZIP Streaming](#dynamic-zip-streaming)
8. [API Endpoints Reference](#api-endpoints-reference)
   - [Health & Diagnostics](#health--diagnostics)
   - [Authentication API](#authentication-api)
   - [Public Quote API](#public-quote-api)
   - [Public Contact API](#public-contact-api)
   - [Admin Dashboard & Quotes API](#admin-dashboard--quotes-api)
   - [Admin Contacts API](#admin-contacts-api)
9. [Error Handling & Response Specification](#error-handling--response-specification)
10. [Logging & Auditing](#logging--auditing)
11. [Installation & Operational Commands](#installation--operational-commands)

---

## Architectural Overview

The backend is structured according to **Clean Architecture** and **Separation of Concerns (SoC)**:

```
[ HTTP Client / Browser / Admin SPA ]
                 │
                 ▼
     [ Helmet, CORS, Compression ]
                 │
                 ▼
       [ Rate Limiters & HPP ]
                 │
                 ▼
        [ Morgan Request Logger ]
                 │
                 ▼
      [ Routes & Middleware ]
    (Upload, Validation, Auth)
                 │
                 ▼
           [ Controllers ]
     (Request / Response Handling)
                 │
                 ▼
         [ Service Layer ]
  (Business Logic, Cloudinary, Mail, ZIP)
                 │
                 ▼
        [ Mongoose Models ]
    (Atomic Counter, Quotes, Contacts)
                 │
                 ▼
        [ MongoDB Atlas DB ]
```

### Key Production Features
- **Stateless Authentication**: Single-admin access token model using signed JSON Web Tokens (JWT) and bcrypt (salt rounds: 12) with zero public registration.
- **Atomic Sequential Request IDs**: Strictly ordered IDs (`LLD-2026-000001`, `LLD-2026-000002`...) backed by MongoDB atomic `$inc` operations that eliminate race conditions under concurrent submissions.
- **Hybrid Storage & Stream Processing**: Multer disk buffering prevents memory exhaustion when receiving up to 10 files (20MB each, total 200MB). Files are streamed to Cloudinary with automatic type classification (`image` vs `raw` for vector/embroidery formats `.ai`, `.eps`, `.dst`, `.pes`, `.zip`).
- **Zero-Storage Dynamic ZIP Streaming**: Admins can download all uploaded assets belonging to a request as a single ZIP file. Archives are assembled dynamically in-memory and piped directly into the HTTP response stream without saving temporary archives to disk.
- **Fail-Safe Asynchronous Email Notification**: Nodemailer connection-pooled transport configured for Zoho Mail SMTP. If email delivery encounters downtime or throttling, errors are captured in Winston logs without failing the customer's HTTP submission.
- **Strict Response Envelopes**: Consistent `{ success, message, data }` and `{ success, message, errors }` shapes across 100% of endpoints.

---

## Folder & Project Structure

```
server/
├── src/
│   ├── config/
│   │   ├── env.js                # Environment loading & fail-fast validation
│   │   ├── database.js           # Mongoose connection pooling & lifecycle hooks
│   │   ├── cloudinary.js         # Cloudinary SDK credentials & configuration
│   │   └── mail.js               # Zoho Mail SMTP Nodemailer pool configuration
│   ├── middleware/
│   │   ├── auth.middleware.js        # Admin JWT Bearer token authentication
│   │   ├── upload.middleware.js      # Multer file limits, type filters & disk buffering
│   │   ├── validation.middleware.js  # Express-validator schemas & HTML sanitization
│   │   ├── error.middleware.js       # Centralized error handler & 404 router
│   │   └── rateLimiter.middleware.js # Express-rate-limit instances per route tier
│   ├── services/
│   │   ├── auth.service.js       # Admin creation, password verification & JWT issue
│   │   ├── quote.service.js      # Quote lifecycle, queries, ZIP bundling & replies
│   │   ├── contact.service.js    # Contact lifecycle, search, replies & archiving
│   │   ├── cloudinary.service.js # Cloudinary upload, delete & file streaming
│   │   └── mail.service.js       # Branded HTML email templates & zero-throw dispatcher
│   ├── controllers/
│   │   ├── auth.controller.js    # Login, setup, logout, and profile handlers
│   │   ├── quote.controller.js   # Public quote intake & ZIP triggers
│   │   ├── contact.controller.js # Public inquiry intake
│   │   └── admin.controller.js   # Metrics, quote CRUD, email reply & contact management
│   ├── routes/
│   │   ├── auth.routes.js        # /api/auth routes
│   │   ├── quote.routes.js       # /api/quote routes
│   │   ├── contact.routes.js     # /api/contact routes
│   │   └── admin.routes.js       # /api/admin & /quotes routes
│   ├── models/
│   │   ├── Admin.js              # Admin schema with bcrypt hooks & credential masking
│   │   ├── Quote.js              # Comprehensive Quote document schema & indexes
│   │   ├── Contact.js            # Contact inquiry schema & reply history
│   │   └── Counter.js            # Atomic sequence tracker for Request IDs
│   ├── utils/
│   │   ├── generateRequestId.js  # Atomic counter incrementer (LLD-YYYY-XXXXXX)
│   │   ├── logger.js             # Winston structured logging & Morgan stream
│   │   └── response.js           # ApiError, sendSuccess, and sendError standardizers
│   ├── uploads/
│   │   └── temp/                 # Ephemeral staging for incoming multipart uploads
│   ├── logs/
│   │   ├── error.log             # Rotating error log file
│   │   └── combined.log          # Rotating audit & operational log file
│   ├── app.js                    # Express application mounting & security stack
│   └── server.js                 # HTTP listener & graceful shutdown handlers
├── tests/
│   ├── unit/                     # Unit test suites (Response, Validation, IDs)
│   └── integration/              # Supertest integration test suites
├── .env.example                  # Environment template
├── package.json                  # Dependencies & scripts
└── README.md                     # Technical architecture documentation
```

---

## Database Architecture & Schemas

### 1. `Admin` Collection
Enforces single-admin architecture with zero public registration:
- `username`: String (Unique, Lowercase, Trimmed, Min: 3, Max: 50)
- `password`: String (Hashed with bcrypt salt rounds 12, `select: false` so it is never exposed in queries)
- `role`: String (`'admin'`, `'superadmin'`, Default: `'admin'`)
- `lastLogin`: Date (Updated on every successful authentication)
- `createdAt` / `updatedAt`: Automatic ISO 8601 Timestamps

### 2. `Quote` Collection
Stores full customer specs, dimensions, uploaded files, status, and communication history:
- `requestId`: String (Unique, Indexed, e.g. `LLD-2026-000001`)
- `customer`:
  - `firstName`: String (Required, Trimmed)
  - `lastName`: String (Required, Trimmed)
  - `email`: String (Required, Lowercase, Trimmed, Indexed)
  - `phone`: String (Required, Trimmed)
  - `country`: String (Required, Trimmed, Indexed)
- `service`: String (Required, Indexed, e.g. "Vector Art Conversion", "Embroidery Digitizing")
- `dimensions`:
  - `width`: Number (Optional)
  - `height`: Number (Optional)
  - `unit`: String (`'in'`, `'cm'`, `'mm'`, `'px'`, Default: `'in'`)
- `projectRequirements`: String (Required, Max 5000 characters)
- `uploadedFiles`: Subdocument array containing:
  - `publicId`: String (Cloudinary identifier)
  - `url`: String (HTTPS secure Cloudinary delivery URL)
  - `originalName`: String (Original filename uploaded by user)
  - `fileSize`: Number (Size in bytes)
  - `format`: String (File extension)
  - `resourceType`: String (`'image'` or `'raw'`)
- `status`: String (`'Pending'`, `'Reviewing'`, `'In Progress'`, `'Completed'`, `'Rejected'`, Default: `'Pending'`, Indexed)
- `internalNotes`: Subdocument array `[{ note, author, createdAt }]`
- `emailHistory`: Subdocument array `[{ subject, message, recipient, attachments, sentBy, sentAt, messageId }]`
- `createdAt` / `updatedAt`: Automatic Timestamps

#### Indexes:
- Compound: `{ status: 1, createdAt: -1 }`
- Compound: `{ service: 1, createdAt: -1 }`
- Text search: `{ requestId: 'text', 'customer.firstName': 'text', 'customer.lastName': 'text', 'customer.email': 'text', service: 'text', projectRequirements: 'text' }`

### 3. `Contact` Collection
- `name`: String (Required, Max 100)
- `email`: String (Required, Lowercase, Indexed)
- `phone`: String (Optional)
- `subject`: String (Required, Max 200)
- `message`: String (Required, Max 5000)
- `status`: String (`'New'`, `'Read'`, `'Replied'`, `'Archived'`, Default: `'New'`, Indexed)
- `replies`: Subdocument array `[{ subject, message, sentBy, sentAt, messageId }]`
- `internalNotes`: Subdocument array `[{ note, author, createdAt }]`

### 4. `Counter` Collection
- `_id`: String (Key identifier, e.g., `quote_request_2026`)
- `seq`: Number (Current incremental sequence counter)

---

## Atomic Request ID Generation

The system never exposes internal MongoDB `_id` hashes to clients. Instead, human-readable IDs are generated using an atomic sequence pattern:

```
Pattern: LLD-<YEAR>-<6-DIGIT SEQUENCE>
Example: LLD-2026-000001, LLD-2026-000002, LLD-2026-000003 ...
```

### Concurrency Protection:
```javascript
const counter = await Counter.findByIdAndUpdate(
  `quote_request_${year}`,
  { $inc: { seq: 1 } },
  { new: true, upsert: true, setDefaultsOnInsert: true }
);
const paddedSeq = String(counter.seq).padStart(6, '0');
return `LLD-${year}-${paddedSeq}`;
```
This guarantees strict monotonicity and zero duplicates even under extreme concurrent submission spikes.

---

## Environment Variables Matrix

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | String | `development` | Runtime environment (`development` or `production`) |
| `PORT` | Number | `5000` | HTTP listener port |
| `CLIENT_URL` | String | `http://localhost:3000` | Base URL of frontend client |
| `ALLOWED_ORIGINS` | String | `http://localhost:3000,http://localhost:5173` | Comma-delimited list of CORS allowed origins |
| `MONGODB_URI` | String | *Required* | MongoDB Atlas connection string |
| `JWT_SECRET` | String | *Required* | Cryptographic signing key for JWT tokens |
| `JWT_EXPIRES_IN` | String | `24h` | Access token lifespan (e.g. `24h`, `7d`) |
| `ADMIN_SETUP_SECRET` | String | *Required* | One-time passkey used to initialize the admin account |
| `CLOUDINARY_CLOUD_NAME` | String | *Required* | Cloudinary cloud identifier |
| `CLOUDINARY_API_KEY` | String | *Required* | Cloudinary API Key |
| `CLOUDINARY_API_SECRET` | String | *Required* | Cloudinary API Secret |
| `CLOUDINARY_FOLDER` | String | `looplayer/quotes` | Cloudinary asset folder prefix |
| `SMTP_HOST` | String | `smtp.zoho.com` | Zoho SMTP host (`smtp.zoho.com` or `smtppro.zoho.com`) |
| `SMTP_PORT` | Number | `465` | SMTP port (`465` for SSL, `587` for STARTTLS) |
| `SMTP_SECURE` | Boolean | `true` | `true` for port 465, `false` for port 587 |
| `SMTP_USER` | String | *Required* | Zoho mailbox address (e.g. `orders@looplayerdesign.com`) |
| `SMTP_PASS` | String | *Required* | Zoho mailbox or 2FA App-specific password |
| `FROM_NAME` | String | `LoopLayer Designs` | Display name for outbound sender headers |
| `FROM_EMAIL` | String | `orders@looplayerdesign.com` | Return mailbox address for customer replies |
| `SMTP_FROM` | String | `"LoopLayer Designs" <...>` | Sender header address |
| `ADMIN_NOTIFICATION_EMAIL`| String | `orders@looplayerdesign.com`| Target inbox for quote/contact alerts |
| `MAX_FILE_SIZE_MB` | Number | `20` | Max file size per upload in MB |
| `MAX_FILE_COUNT` | Number | `10` | Max files per quote request |
| `RATE_LIMIT_GLOBAL_MAX` | Number | `300` | Max requests per 15 min per IP across the API |
| `RATE_LIMIT_PUBLIC_MAX` | Number | `10` | Max quote/contact submissions per hour per IP |
| `RATE_LIMIT_AUTH_MAX` | Number | `5` | Max failed login attempts per 15 min per IP |

---

## Third-Party Integrations

### 1. MongoDB Atlas
1. Create a cluster on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Under **Network Access**, add your server's IP address (or `0.0.0.0/0` during development).
3. Under **Database Access**, create an application user with Read/Write privileges.
4. Copy your connection string into `MONGODB_URI`:
   ```env
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/looplayer_designs?retryWrites=true&w=majority
   ```

### 2. Cloudinary File Storage
Vector design and embroidery digitizing files require special storage treatment:
- Web image formats (`jpg`, `jpeg`, `png`, `svg`): uploaded with `resource_type: "image"`
- Embroidery stitch files (`.dst`, `.pes`), vector binaries (`.ai`, `.eps`), documents (`.pdf`), and archives (`.zip`): uploaded with `resource_type: "raw"` to prevent Cloudinary from attempting image conversions on binary stitch data.

Configured in `src/config/cloudinary.js` and managed in `src/services/cloudinary.service.js`.

### 3. Zoho Mail SMTP & Email Infrastructure
LoopLayer Designs features an enterprise email platform with:
- **Connection Pooling**: Persistent SMTP connections with rate throttling (10 emails/sec) to comply with Zoho's sending policies and avoid reconnecting on every email.
- **Fail-Safe Asynchronous Dispatch**: Outbound emails are non-blocking. If SMTP credentials are misconfigured or Zoho experiences an outage, the API request continues uninterrupted while failure diagnostics are logged to the `EmailLog` collection and Winston.
- **Delivery Logging & Auditing**: Every email is captured in MongoDB with recipient, subject, status (`Delivered` or `Failed`), error reasons, timestamp, and message ID.
- **Manual Retry Strategy**: Admins can retry failed emails directly from the admin dashboard via `POST /api/admin/emails/:id/retry`.
- **Live SMTP Diagnostics**: Real-time status reporting on the dashboard settings page (`GET /api/admin/settings/smtp-status`).

#### Zoho Mail SMTP Setup Steps:
1. Log in to [Zoho Mail](https://mail.zoho.com) or Zoho Workplace.
2. If Two-Factor Authentication (2FA/TFA) is enabled on your Zoho account, go to **My Account -> Security -> App Passwords** and generate a dedicated app password.
3. In Zoho Mail **Settings -> Mail Accounts -> POP/IMAP and SMTP Configuration**, ensure SMTP access is enabled.
4. Configure `.env`:
   ```env
   SMTP_HOST=smtp.zoho.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=orders@looplayerdesign.com
   SMTP_PASS=your_zoho_app_password
   FROM_NAME="LoopLayer Designs"
   FROM_EMAIL=orders@looplayerdesign.com
   ADMIN_NOTIFICATION_EMAIL=orders@looplayerdesign.com
   ```
   *(For organization accounts on Zoho Workplace, `SMTP_HOST` may alternatively be `smtppro.zoho.com`.)*

#### Troubleshooting Zoho SMTP:
- **Error: 535 Authentication Failed**: The password provided is incorrect, or 2FA is active requiring an App-specific password instead of the account login password.
- **Error: Connection Timeout (Port 465)**: Cloud providers or local firewalls may block outbound port 465. In that case, switch to port `587` with `SMTP_SECURE=false`.
- **Error: 553 Relaying Disallowed**: The `FROM_EMAIL` header does not match the authenticated `SMTP_USER` mailbox or an authorized alias in Zoho. Ensure `FROM_EMAIL` matches `SMTP_USER`.

---

## Branded Email Design System & Components

Every email strictly complies with the LoopLayer Designs design system:
- **Typography Only Header**: Features "LoopLayer Designs" + "Professional embroidery digitizing and vector artwork solutions." Pure typography hierarchy with zero external image requests.
- **Brand Palette**:
  - Primary: `#0F172A` (Deep Slate)
  - Secondary: `#2563EB` (Royal Blue)
  - Accent: `#F97316` (Warm Amber)
  - Background: `#F8FAFC` (Clean Canvas)
  - Cards: `#FFFFFF` with `#E2E8F0` borders and soft shadows
- **Typography**: Inter with cross-platform native fallbacks (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`).
- **Layout Constraints**: Max width `640px`, centered, 100% mobile responsive.
- **Consistent Footer**:
  - LoopLayer Designs
  - Nagpur, Maharashtra &bull; orders@looplayerdesign.com
  - Website & Social Links placeholders
  - Copyright & Privacy Notice

### Modular Component Library (`src/templates/components/`):
- `EmailLayout`: Responsive master container table with reset styles, Inter webfont, preheader text, header, and footer.
- `Header`: Pure typography header block with brand tagline.
- `Footer`: Physical location, contact email, navigation links, copyright, and privacy statement.
- `PrimaryButton`: Table-based bulletproof primary action CTA button.
- `SecondaryButton`: Subtle secondary button for dashboard navigation.
- `Divider`: Minimal 1px border line separator with customizable vertical margin.
- `InfoCard`: Soft rounded card with left border color accent and optional title badge.
- `Table`: Key-value grid for project specifications, customer details, and dimensions.

### Handcrafted Templates (`src/templates/`):
1. **`quoteConfirmation.template.js`**: Sent to customer upon quote submission. Confirms request receipt, provides Request ID, details selected service, submission date, customer info, and next steps timeline.
2. **`quoteNotification.template.js`**: Alert sent to admin. Includes customer contact details, country, service, dimensions, requirements, direct links to uploaded artwork files, and an "Open In Dashboard" button.
3. **`contactConfirmation.template.js`**: Sent to customer upon submitting contact inquiry. Acknowledges receipt and provides expected 1 business day turnaround.
4. **`contactNotification.template.js`**: Alert sent to admin with sender details, subject, full message content, and dashboard link.
5. **`reply.template.js`**: Sent to customer directly from the dashboard composer. Maintains branded styling, inserts sanitized rich text message, displays attachments, and preserves full conversation thread history.

### 4. JWT & Security Controls
- **JWT**: Signed with HMAC-SHA256 containing `{ id, username, role }`. Verified via `authenticateAdmin` middleware.
- **bcrypt**: 12 salt rounds for hash generation.
- **Helmet**: Disables `x-powered-by`, enforces strict Content-Security-Policy (CSP) with Cloudinary image source exceptions.
- **CORS**: Whitelists frontend client domains, allows Authorization headers, and exposes `Content-Disposition` for file downloads.
- **HPP**: Protects against HTTP Parameter Pollution attacks.
- **Sanitization**: All rich-text email replies sent by admins are sanitized via `sanitize-html` to prevent stored XSS attacks.

---

## Dynamic ZIP Streaming

When an admin clicks **Download All Files as ZIP** on a quote details page:
1. The server queries the quote's uploaded files.
2. An `archiver('zip')` stream is created.
3. Response headers are set:
   ```http
   Content-Type: application/zip
   Content-Disposition: attachment; filename="LLD-2026-000001-files.zip"
   ```
4. For each file, an HTTP readable stream is fetched from Cloudinary via `axios` and piped directly into the archive.
5. The archive stream is piped directly into Express `res`.
6. **Zero disk storage**: Files are never written to the server's filesystem or stored permanently as zip files.

---

## API Endpoints Reference

All responses follow the unified standard response envelope.

---

### Health & Diagnostics API

#### `GET /health` or `GET /api/health`
Deep health check inspecting MongoDB Atlas connection & latency, Zoho SMTP health, Cloudinary storage configuration, system memory (heap & RSS), CPU architecture, and process uptime.
- **Access**: Public
- **Response (200 OK / 503 Service Unavailable)**:
```json
{
  "success": true,
  "message": "System status: UP",
  "data": {
    "status": "UP",
    "service": "LoopLayer Designs Backend API",
    "environment": "development",
    "timestamp": "2026-11-03T16:50:00.000Z",
    "uptime": {
      "seconds": 342,
      "formatted": "5m 42s"
    },
    "latencyMs": 4,
    "dependencies": {
      "database": {
        "provider": "MongoDB Atlas",
        "status": "CONNECTED",
        "healthy": true,
        "latencyMs": 2,
        "host": "cluster0.jq8vqvt.mongodb.net",
        "name": "looplayer"
      },
      "smtp": {
        "provider": "Zoho Mail",
        "status": "SMTP Connected",
        "host": "smtp.zoho.com",
        "port": 465,
        "secure": true,
        "account": "or****@looplayerdesign.com"
      },
      "storage": {
        "provider": "Cloudinary",
        "status": "CONFIGURED",
        "cloudName": "doqjjtzn",
        "folder": "looplayer"
      }
    },
    "system": {
      "nodeVersion": "v22.18.0",
      "platform": "darwin",
      "arch": "arm64",
      "cpuCores": 8,
      "memory": {
        "heapUsed": "48.20 MB",
        "heapTotal": "62.50 MB",
        "rss": "95.12 MB"
      }
    }
  }
}
```

#### `GET /health/live` or `GET /api/health/live`
Ultra-fast liveness probe for Kubernetes, Docker, and uptime monitoring services.
- **Access**: Public
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Process is alive",
  "data": {
    "status": "ALIVE",
    "uptime": 342,
    "timestamp": "2026-11-03T16:50:00.000Z"
  }
}
```

#### `GET /health/ready` or `GET /api/health/ready`
Readiness probe verifying that the database connection is established before routing live traffic.
- **Access**: Public
- **Response (200 OK / 503 Service Unavailable)**:
```json
{
  "success": true,
  "message": "Service is ready to handle traffic",
  "data": {
    "status": "READY",
    "database": "CONNECTED",
    "timestamp": "2026-11-03T16:50:00.000Z"
  }
}
```

---

### Authentication API

#### `POST /api/auth/setup-admin`
Create the sole administrator account. Locked once an admin exists.
- **Access**: Restricted by `setupSecret`
- **Request Body**:
```json
{
  "username": "loopadmin",
  "password": "SecurePassword123!",
  "setupSecret": "dev_admin_setup_secret_key_2026"
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "message": "Administrator account created successfully",
  "data": {
    "id": "672740a1b2c3d4e5f6a7b8c9",
    "username": "loopadmin",
    "role": "superadmin",
    "createdAt": "2026-11-03T10:00:00.000Z"
  }
}
```

#### `POST /api/auth/login`
- **Access**: Public (Rate limited: 5 attempts / 15 min)
- **Request Body**:
```json
{
  "username": "loopadmin",
  "password": "SecurePassword123!"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Authentication successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "admin": {
      "id": "672740a1b2c3d4e5f6a7b8c9",
      "username": "loopadmin",
      "role": "superadmin",
      "lastLogin": "2026-11-03T10:05:00.000Z"
    }
  }
}
```

#### `POST /api/auth/logout`
- **Access**: Public
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Logged out successfully. Invalidate session on client.",
  "data": { "loggedOut": true }
}
```

#### `GET /api/auth/me`
- **Access**: Private (Admin Bearer token required)
- **Headers**: `Authorization: Bearer <token>`
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Current administrator profile retrieved",
  "data": {
    "_id": "672740a1b2c3d4e5f6a7b8c9",
    "username": "loopadmin",
    "role": "superadmin",
    "lastLogin": "2026-11-03T10:05:00.000Z"
  }
}
```

---

### Public Quote API

#### `POST /api/quote`
Submit a new quote request with artwork files.
- **Access**: Public (Rate limited: 10 requests / hr)
- **Content-Type**: `multipart/form-data`
- **Form Fields**:
  - `firstName` (String, Required)
  - `lastName` (String, Required)
  - `email` (String, Required)
  - `phone` (String, Required)
  - `country` (String, Required)
  - `service` (String, Required, e.g. "Embroidery Digitizing", "Vector Art")
  - `width` (Number, Optional)
  - `height` (Number, Optional)
  - `unit` (String, Optional: `in`, `cm`, `mm`, `px`)
  - `projectRequirements` (String, Required)
  - `files` (Files, up to 10 files, max 20MB each. Formats: `jpg, jpeg, png, pdf, ai, eps, svg, dst, pes, zip`)
- **Response (201 Created)**:
```json
{
  "success": true,
  "message": "Your quote request has been submitted successfully. A confirmation email has been sent.",
  "data": {
    "requestId": "LLD-2026-000001",
    "status": "Pending",
    "service": "Embroidery Digitizing",
    "createdAt": "2026-11-03T10:10:00.000Z",
    "fileCount": 2
  }
}
```

---

### Public Contact API

#### `POST /api/contact`
Submit a public contact inquiry form.
- **Access**: Public (Rate limited: 10 requests / hr)
- **Content-Type**: `application/json`
- **Request Body**:
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "+1 555-0199",
  "subject": "Bulk Ordering for School Patches",
  "message": "We need 500 custom embroidered patches by the end of next month. Can you provide a turnaround estimate?"
}
```
- **Response (201 Created)**:
```json
{
  "success": true,
  "message": "Thank you for reaching out! Your message has been received and our team will get back to you shortly.",
  "data": {
    "id": "672740a1b2c3d4e5f6a7b8d1",
    "status": "New",
    "name": "Jane Doe",
    "subject": "Bulk Ordering for School Patches",
    "createdAt": "2026-11-03T10:12:00.000Z"
  }
}
```

---

### Admin Dashboard & Quotes API

All endpoints require `Authorization: Bearer <token>`.

#### `GET /api/admin/dashboard`
Returns overview counter cards and recent activity.
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Dashboard overview data retrieved successfully",
  "data": {
    "overview": {
      "totalQuotes": 154,
      "pending": 12,
      "reviewing": 8,
      "inProgress": 24,
      "completed": 105,
      "rejected": 5,
      "todayRequests": 9
    },
    "contactsSummary": {
      "totalContacts": 42,
      "newInquiries": 4
    },
    "recentRequests": [...],
    "recentContacts": [...]
  }
}
```

#### `GET /api/admin/quotes`
Paginated search, filter, and sorting.
- **Query Parameters**:
  - `page` (Default: `1`)
  - `limit` (Default: `10`, Max: `100`)
  - `search` (Search across Request ID, name, email, country, service)
  - `status` (`Pending`, `Reviewing`, `In Progress`, `Completed`, `Rejected`, or `All`)
  - `country` (Filter by country string)
  - `service` (Filter by service string)
  - `dateFrom` (ISO date `YYYY-MM-DD`)
  - `dateTo` (ISO date `YYYY-MM-DD`)
  - `sortBy` (Default: `createdAt`)
  - `sortOrder` (`desc` or `asc`)
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Quotes retrieved successfully",
  "data": {
    "quotes": [
      {
        "_id": "672740a1b2c3d4e5f6a7b8e2",
        "requestId": "LLD-2026-000001",
        "customer": {
          "firstName": "John",
          "lastName": "Smith",
          "email": "john@smithdesigns.com",
          "phone": "+1 415-555-0132",
          "country": "United States"
        },
        "service": "Embroidery Digitizing",
        "dimensions": { "width": 4, "height": 3, "unit": "in" },
        "status": "Pending",
        "uploadedFiles": [
          {
            "publicId": "looplayer/quotes/sample_embroidery",
            "url": "https://res.cloudinary.com/demo/raw/upload/v1/sample.dst",
            "originalName": "jacket_logo.dst",
            "fileSize": 45020,
            "format": "dst",
            "resourceType": "raw"
          }
        ],
        "createdAt": "2026-11-03T10:10:00.000Z"
      }
    ],
    "pagination": {
      "total": 154,
      "page": 1,
      "limit": 10,
      "totalPages": 16
    }
  }
}
```

#### `GET /quotes/:id` or `GET /api/admin/quotes/:id`
Retrieve full quote record by Request ID (`LLD-2026-000001`) or MongoDB ObjectId.
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Quote details retrieved successfully",
  "data": {
    "_id": "672740a1b2c3d4e5f6a7b8e2",
    "requestId": "LLD-2026-000001",
    "customer": { ... },
    "service": "Embroidery Digitizing",
    "dimensions": { "width": 4, "height": 3, "unit": "in" },
    "projectRequirements": "Need clean flat stitch for left chest placement on navy caps.",
    "uploadedFiles": [ ... ],
    "status": "Pending",
    "internalNotes": [
      {
        "note": "Customer called asking for sample sewout.",
        "author": "loopadmin",
        "createdAt": "2026-11-03T11:00:00.000Z"
      }
    ],
    "emailHistory": []
  }
}
```

#### `PATCH /quotes/:id` or `PATCH /api/admin/quotes/:id`
Update status and/or append internal notes.
- **Request Body**:
```json
{
  "status": "In Progress",
  "internalNotes": "Digitizer assigned to recreate vector outline."
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Quote updated successfully",
  "data": {
    "requestId": "LLD-2026-000001",
    "status": "In Progress"
  }
}
```

#### `DELETE /quotes/:id` or `DELETE /api/admin/quotes/:id`
Permanently delete request and clean up associated Cloudinary files.
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Quote 'LLD-2026-000001' deleted successfully",
  "data": {
    "requestId": "LLD-2026-000001",
    "deleted": true
  }
}
```

#### `GET /quotes/:id/download-zip` or `GET /api/admin/quotes/:id/download-zip`
- **Output**: Binary ZIP stream
- **Header**: `Content-Disposition: attachment; filename="LLD-2026-000001-files.zip"`

#### `POST /quotes/:id/reply` or `POST /api/admin/quotes/:id/reply`
Send email directly to customer from dashboard and record in quote history.
- **Request Body**:
```json
{
  "subject": "Your Digitized Proof is Ready for Review",
  "message": "<p>Hello John,</p><p>We have completed your design preview. Please review the attached stitch map.</p>"
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Reply email dispatched and recorded in quote history",
  "data": {
    "requestId": "LLD-2026-000001",
    "emailResult": { "success": true, "messageId": "<...>" },
    "emailHistoryCount": 1
  }
}
```

---

### Admin Contacts API

#### `GET /api/admin/contacts`
- **Query Parameters**: `page`, `limit`, `status` (`New`, `Read`, `Replied`, `Archived`), `search`
- **Response**: Paginated list of inquiries

#### `GET /api/admin/contacts/:id`
- **Response**: Contact message details and reply log

#### `PATCH /api/admin/contact/:id`
- **Request Body**:
```json
{
  "status": "Archived",
  "note": "Resolved via telephone inquiry."
}
```

#### `POST /api/admin/contact/:id/reply`
- **Request Body**:
```json
{
  "subject": "Regarding Your Wholesale Inquiry",
  "message": "<p>Thank you for inquiring. Our bulk pricing tier is attached.</p>"
}
```

#### `DELETE /api/admin/contact/:id`
- **Response**: Deletion confirmation

---

### Admin Email Management & Diagnostics API

All endpoints require `Authorization: Bearer <token>`.

#### `GET /api/admin/settings/smtp-status`
Retrieve real-time SMTP connection health, host, port, secure mode, and masked authentication identity.
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "SMTP diagnostics retrieved",
  "data": {
    "status": "SMTP Connected",
    "lastVerificationTime": "2026-11-03T16:00:00.000Z",
    "host": "smtp.zoho.com",
    "port": 465,
    "secure": true,
    "user": "or****@looplayerdesign.com",
    "fromName": "LoopLayer Designs",
    "fromEmail": "orders@looplayerdesign.com",
    "lastError": null
  }
}
```

#### `POST /api/admin/settings/smtp-test`
Trigger an active live socket and handshake verification test to Zoho SMTP servers.
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "SMTP Verification: SMTP Connected",
  "data": {
    "status": "SMTP Connected",
    "lastVerificationTime": "2026-11-03T16:05:00.000Z",
    "verification": {
      "connected": true,
      "simulated": false,
      "status": "SMTP Connected",
      "lastVerificationTime": "2026-11-03T16:05:00.000Z"
    }
  }
}
```

#### `GET /api/admin/emails`
Paginated email delivery history and audit trail.
- **Query Parameters**:
  - `page` (Default: `1`)
  - `limit` (Default: `20`)
  - `status` (`Delivered`, `Failed`, or `All`)
  - `type` (`quote_confirmation`, `quote_notification`, `contact_confirmation`, `contact_notification`, `admin_reply`, `custom`)
  - `search` (Search across recipient, recipientName, subject, or relatedId)
  - `recipient` (Filter by recipient email)
  - `relatedId` (Filter by Request ID e.g. `LLD-2026-000001`)
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Email delivery logs retrieved successfully",
  "data": {
    "logs": [
      {
        "_id": "672740a1b2c3d4e5f6a7b901",
        "recipient": "customer@example.com",
        "recipientName": "Marcus Vance",
        "subject": "We've Received Your Project Request [LLD-2026-000001]",
        "type": "quote_confirmation",
        "relatedId": "LLD-2026-000001",
        "relatedType": "Quote",
        "status": "Delivered",
        "attemptCount": 1,
        "sentAt": "2026-11-03T10:10:02.000Z",
        "messageId": "<c28f-4a0b-93f1@looplayerdesign.com>",
        "createdAt": "2026-11-03T10:10:01.000Z"
      }
    ],
    "pagination": {
      "total": 48,
      "page": 1,
      "limit": 20,
      "totalPages": 3
    }
  }
}
```

#### `GET /api/admin/emails/:id`
Retrieve full email delivery log record, including complete rendered HTML content and failure error stack (if any).
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Email log details retrieved",
  "data": {
    "_id": "672740a1b2c3d4e5f6a7b901",
    "recipient": "customer@example.com",
    "subject": "We've Received Your Project Request [LLD-2026-000001]",
    "status": "Delivered",
    "htmlContent": "<!DOCTYPE html><html>...",
    "textContent": "Hello Marcus..."
  }
}
```

#### `POST /api/admin/emails/:id/retry`
Manually trigger a delivery retry for a previously failed email.
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Email retried and delivered successfully",
  "data": {
    "success": true,
    "messageId": "<new-message-id@looplayerdesign.com>",
    "emailLog": {
      "_id": "672740a1b2c3d4e5f6a7b901",
      "status": "Delivered",
      "attemptCount": 2,
      "lastAttemptAt": "2026-11-03T16:10:00.000Z"
    }
  }
}
```

#### `POST /api/admin/emails/preview`
Generate real-time HTML preview of any template before sending.
- **Request Body**:
```json
{
  "type": "admin_reply",
  "data": {
    "recipientName": "Marcus Vance",
    "subject": "Proof Approval Required",
    "message": "<p>Please verify your color palette.</p>",
    "referenceId": "LLD-2026-000001"
  }
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Email preview rendered successfully",
  "data": {
    "subject": "[LLD-2026-000001] Proof Approval Required",
    "html": "<!DOCTYPE html><html>...",
    "text": "Hello Marcus Vance..."
  }
}
```

#### `POST /api/admin/emails/send`
Dashboard Email Composer: Compose and dispatch a new branded email or reply to a customer.
- **Request Body**:
```json
{
  "to": "client@example.com",
  "recipientName": "Elena Rostova",
  "subject": "Update on Your Embroidery Digitizing Proof",
  "message": "<p>Hello Elena,</p><p>We have adjusted the underlay density for pique knit.</p>",
  "relatedId": "LLD-2026-000042",
  "relatedType": "Quote",
  "threadHistory": [
    {
      "author": "Elena Rostova",
      "role": "customer",
      "message": "Can you make sure it does not pucker on lightweight polos?",
      "date": "2026-11-03T09:00:00.000Z"
    }
  ],
  "attachments": [
    {
      "filename": "proof_v2.pdf",
      "url": "https://res.cloudinary.com/demo/raw/upload/v1/proof_v2.pdf",
      "size": 524288
    }
  ]
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "message": "Email dispatched successfully",
  "data": {
    "success": true,
    "messageId": "<reply-msg-id@looplayerdesign.com>",
    "emailLogId": "672740a1b2c3d4e5f6a7b955"
  }
}
```

---

## Error Handling & Response Specification

The backend adheres strictly to the defined schema:

### Success Template
```json
{
  "success": true,
  "message": "Descriptive success statement",
  "data": {}
}
```

### Error Template
```json
{
  "success": false,
  "message": "High-level summary of the issue",
  "errors": [
    {
      "field": "email",
      "message": "A valid email address is required"
    }
  ]
}
```

### Common HTTP Status Codes
- `200 OK`: Request succeeded.
- `201 Created`: Resource successfully created.
- `400 Bad Request`: Malformed payload, invalid format, or Multer file limit exceeded.
- `401 Unauthorized`: Missing or expired Bearer JWT token.
- `403 Forbidden`: Admin setup secret incorrect or single-admin creation locked.
- `404 Not Found`: Target route, quote, or contact could not be found.
- `409 Conflict`: Duplicate entry or unique constraint violation.
- `422 Unprocessable Entity`: Input validation failure from `express-validator`.
- `429 Too Many Requests`: Rate limiter triggered.
- `500 Internal Server Error`: Unhandled system exception.

---

## Logging & Auditing

Winston + Morgan provide multi-tier structured logging:
- `server/logs/error.log`: Captures all 4xx/5xx errors with stack traces.
- `server/logs/combined.log`: Full audit trail of HTTP requests, authentication attempts, file uploads, and email dispatches.
- Console output: Colorized in development, JSON formatted in production.

---

## Installation & Operational Commands

### 1. Requirements
- Node.js LTS (>= 18.0.0, tested on v22.18.0)
- MongoDB Atlas cluster or local MongoDB instance (>= 6.0)

### 2. Install Dependencies
```bash
# From repository root:
npm install

# Or inside the server folder:
cd server && npm install
```

### 3. Setup Environment
```bash
cp server/.env.example server/.env
# Edit server/.env with your MongoDB, Cloudinary, Zoho, and JWT credentials
```

### 4. Run Development Server
```bash
# Auto-restarts on code changes
npm run dev

# Or directly in server/:
cd server && npm run dev
```

### 5. Run Automated Tests
```bash
npm test

# Or directly in server/:
cd server && npm test
```

### 6. Initialize Administrator Account
Execute a POST request to `/api/auth/setup-admin` (e.g. using curl or Postman):
```bash
curl -X POST http://localhost:5000/api/auth/setup-admin \
  -H "Content-Type: application/json" \
  -d '{
    "username": "loopadmin",
    "password": "SuperSecretPassword2026!",
    "setupSecret": "dev_admin_setup_secret_key_2026"
  }'
```

### 7. Production Start
```bash
npm start
```
