# Ecommerce Development and Production Guide

This repository contains a reusable single-shop ecommerce system:

- `backend`: Django, Django REST Framework, Django Admin and SQLite for local development.
- `frontend`: Next.js 16, React 19 and Tailwind CSS 4.
- One deployment represents one shop.
- Roles are limited to `SUPER_ADMIN`, `ADMIN` and `CUSTOMER`.

## 1. Local development

### Backend setup

From the repository root:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py migrate
python manage.py createcachetable
python manage.py seed_demo_data
python manage.py runserver
```

The backend runs at `http://127.0.0.1:8000`. Django Admin is available at `/admin/`.

`createcachetable` creates the database-backed cache used for low-cost request throttling. It is safe to run again; Django will report when the table already exists.

### Frontend setup

In a second terminal:

```powershell
cd frontend
npm ci
npm run dev
```

The frontend runs at `http://localhost:3000`.

The browser talks to same-origin Next.js route handlers. Those handlers communicate with Django using the server-only `API_URL`. This prevents the browser from handling JWT values or learning private service details.

### Development environment

Backend `.env` should use local-only values:

```env
DEBUG=True
SECRET_KEY=<generate-a-long-random-local-secret>
ALLOWED_HOSTS=127.0.0.1,localhost
CORS_ALLOWED_ORIGINS=http://localhost:3000
CSRF_TRUSTED_ORIGINS=http://localhost:3000
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://127.0.0.1:8000
COOKIE_SECURE=False
SECURE_SSL_REDIRECT=False
SECURE_HSTS_SECONDS=0
CACHE_TABLE=application_cache
MAX_IMAGE_BYTES=5242880
TRUST_PROXY_HEADERS=False
```

Frontend `.env.local`:

```env
API_URL=http://127.0.0.1:8000/api/
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_MEDIA_URL=http://127.0.0.1:8000
```

`API_URL` must remain server-only. Only the public media origin may use a `NEXT_PUBLIC_` name.

## 2. Production architecture

Deploy the frontend and backend as separate HTTPS services. Example:

```txt
Frontend: https://shop.example.com
Backend:  https://api.example.com
Media:    https://api.example.com/media/
```

The exact domains are configurable. Both must use HTTPS. CORS and CSRF lists must contain exact trusted origins—never `*`.

### Backend production environment

```env
DEBUG=False
SECRET_KEY=<long-random-production-secret>
ALLOWED_HOSTS=api.example.com
CORS_ALLOWED_ORIGINS=https://shop.example.com
CSRF_TRUSTED_ORIGINS=https://shop.example.com
FRONTEND_URL=https://shop.example.com
BACKEND_URL=https://api.example.com
COOKIE_SECURE=True
SECURE_SSL_REDIRECT=True
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=False
SECURE_HSTS_PRELOAD=False
CACHE_TABLE=application_cache
MAX_IMAGE_BYTES=5242880
TRUST_PROXY_HEADERS=False
```

Set email and payment credentials through the hosting platform. Never commit production secrets, database credentials, email passwords, M-Pesa keys, bank details or card-provider secrets.

For real production email, replace the console backend with SMTP values supplied by the chosen email provider:

```env
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.provider.example
EMAIL_PORT=587
EMAIL_HOST_USER=<provider-username>
EMAIL_HOST_PASSWORD=<provider-password>
EMAIL_USE_TLS=True
DEFAULT_FROM_EMAIL=orders@example.com
EMAIL_TIMEOUT=10
```

Local development intentionally uses `django.core.mail.backends.console.EmailBackend`; messages are printed in the backend terminal and no real email is sent. Production SMTP cannot send until real provider credentials are supplied.

### Frontend production environment

```env
API_URL=https://api.example.com/api/
FRONTEND_URL=https://shop.example.com
NEXT_PUBLIC_MEDIA_URL=https://api.example.com
```

Rebuild the frontend after changing public environment values.

### Automatic order cancellation

Schedule `python manage.py auto_cancel_orders` to run hourly in the backend environment. It cancels unpaid pending orders older than 48 hours and leaves cash-on-delivery orders pending.

## 3. Production deployment commands

Backend:

```powershell
pip install -r requirements.txt
python manage.py migrate
python manage.py createcachetable
python manage.py collectstatic --noinput
python manage.py check --deploy
```

Frontend:

```powershell
npm ci
npx eslint . --ignore-pattern node_modules --ignore-pattern .next
npm run build
npm run start
```

The lint script runs ESLint directly because Next.js 16 no longer provides the old `next lint` command.

## 4. Security behavior and reasons

- JWT access and refresh tokens are stored in HttpOnly, secure, host-only cookies so browser JavaScript cannot read them.
- Production cookies use the `__Host-` prefix, HTTPS, `SameSite=Lax` and root paths.
- A new login rotates the user API-session version. Older access and refresh tokens then stop working, enforcing one active API login per user.
- Sensitive browser mutations require an exact trusted Origin and a matching CSRF cookie/header.
- Route handlers accept JSON with size limits to reduce malformed and oversized-request abuse.
- Public errors contain only a safe message, code and request ID. Stack traces, database errors, serializer internals, internal URLs and raw upstream bodies are not shown to customers.
- Authentication and customer responses use `Cache-Control: no-store`.
- Throttling is stored in the database and keyed by account, cart or operation rather than treating the shared Next.js server IP as every customer.
- `TRUST_PROXY_HEADERS` stays disabled unless the hosting proxy removes user-supplied forwarding headers and supplies its own trusted values.
- CSP, frame denial, MIME sniffing prevention, referrer restrictions and browser permission restrictions reduce injection and browser abuse.
- Next.js private-IP image optimization remains disabled. Development media is served without optimization; production optimization accepts only configured public HTTPS media hosts.
- Uploaded images are content-verified, size/dimension limited and re-encoded before storage. Product branding is permanently embedded during processing.
- Promotional links accept relative paths, anchors or HTTPS URLs only.
- Customers may review only products present in their delivered orders. Reviews are marked as verified purchases.
- Checkout sends an order confirmation to the customer and a new-order alert to the ShopProfile email. Order status changes send a customer update. Email failures are logged without cancelling an otherwise valid order.

## 5. HSTS rollout

Start with `SECURE_HSTS_INCLUDE_SUBDOMAINS=False` and `SECURE_HSTS_PRELOAD=False`. Enable them only after every subdomain is permanently available through HTTPS. Enabling them too early can make an HTTP-only subdomain inaccessible to browsers.

## 6. Media and static files

- Configure persistent production storage for uploaded media. Container-local disks may be erased during redeployment.
- Serve media from the configured HTTPS backend/media origin.
- Serve collected static files through the application host or a trusted static-file service.
- Do not allow arbitrary remote image hosts in Next.js configuration.

## 7. Release verification checklist

Before each production release:

```powershell
cd backend
.\.venv\Scripts\python.exe manage.py check
.\.venv\Scripts\python.exe manage.py makemigrations --check --dry-run
.\.venv\Scripts\python.exe manage.py showmigrations

cd ..\frontend
npx eslint . --ignore-pattern node_modules --ignore-pattern .next
npm run build
```

Manually confirm:

- Public shop pages and media load over HTTPS.
- Login, logout and registration show customer-friendly errors.
- A second login invalidates the first API session.
- Guest and signed-in checkout work.
- Admin and super-admin visibility rules remain correct.
- Customers cannot access Django Admin or admin APIs.
- Reviews require a delivered purchase.
- Cross-origin mutations fail.
- Responses include the expected security headers.
- No secrets or technical exception details appear in browser pages.

## 8. Operational cautions

- Back up the production database and media before migrations or releases.
- Do not use the local SQLite database as a shared high-traffic production database. `DATABASE_URL` is reserved for moving to a managed database when required.
- Keep dependencies patched and rerun builds after upgrades.
- Request IDs may be used to correlate customer reports with server logs; logs must not contain passwords, tokens, cookies or payment secrets.
- Real payment-gateway integrations remain placeholders until their providers are implemented and audited.
