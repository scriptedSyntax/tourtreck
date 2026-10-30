# Ecommerce Storefront

Integrated customer storefront for the single-shop Django ecommerce backend.

## Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- npm

## Features

- Dynamic shop branding, contact information and SEO
- Homepage promotions, products and categories
- Product details, ratings and verified-purchase reviews
- Guest local cart and authenticated customer flow
- Checkout with server-controlled prices
- Customer registration, login and account dashboard
- Customer order history
- Newsletter subscription
- Secure HttpOnly authentication cookies and CSRF-protected mutations
- Friendly customer errors without exposing internal service details

## Run locally

Create `.env.local` from `.env.example`, then:

```powershell
npm ci
npm run dev
```

Open `http://localhost:3000` while the backend runs at `http://127.0.0.1:8000`.

## Validate and build

```powershell
npm run lint
npm run build
npm run start
```

Do not expose the server-only `API_URL` to browser code. Production deployment details are documented in the repository root `DEVELOPMENT_AND_PRODUCTION.md`.

The original visual template credits have been intentionally replaced in the storefront with the current integration credit.
