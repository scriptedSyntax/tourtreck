# Frontend Run Guide

The integrated storefront uses Next.js 16, React 19, TypeScript, Tailwind CSS 4 and npm.

## Development

Start Django first:

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
python manage.py migrate
python manage.py createcachetable
python manage.py runserver
```

Then start the frontend in another terminal:

```powershell
cd frontend
npm ci
npm run dev
```

- Storefront: `http://localhost:3000`
- Backend: `http://127.0.0.1:8000`
- Admin: `http://127.0.0.1:8000/admin/`

The browser uses same-origin Next.js routes for authentication, checkout, customer orders, newsletter subscriptions and reviews. JWT values remain in HttpOnly cookies.

## Frontend environment

```env
API_URL=http://127.0.0.1:8000/api/
FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_MEDIA_URL=http://127.0.0.1:8000
```

`API_URL` is server-only. Do not rename it to a `NEXT_PUBLIC_` value.

## Checks and production build

```powershell
cd frontend
npm run lint
npm run build
npm run start
```

Production requires exact HTTPS frontend, backend and media origins. See the root `DEVELOPMENT_AND_PRODUCTION.md` guide.
