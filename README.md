# Tourtreck

A single-shop ecommerce application with a Django REST backend and a Next.js storefront. Each deployment represents one shop.

## Stack

- **Backend:** Django, Django REST Framework, Django Admin
- **Frontend:** Next.js, React, Tailwind CSS
- **Roles:** `SUPER_ADMIN`, `ADMIN`, and `CUSTOMER`

## Features

- Product catalog, categories, shop branding, and content management
- Customer accounts, cart, checkout, order history, and verified product reviews
- Admin tools for products, customers, orders, and shop content
- API-backed storefront and transactional order email hooks

Payment provider integrations are not implemented; payment methods are currently placeholders.

## Run locally

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python manage.py migrate
python manage.py createcachetable
python manage.py runserver
```

The API runs at `http://127.0.0.1:8000`; Django Admin is at `http://127.0.0.1:8000/admin/`.

### Frontend

In another terminal:

```powershell
cd frontend
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. The checked-in environment examples use local development defaults only. Replace the Django `SECRET_KEY` before deploying and configure real secrets through the deployment environment.

## Documentation

- [Development and production guide](DEVELOPMENT_AND_PRODUCTION.md)
- [Backend API endpoints](backend/docs/API_ENDPOINTS.md)
- [Frontend run notes](backend/docs/FRONTEND_RUN.md)

## License

No license is currently specified. All rights reserved. See [LICENSE](LICENSE) if one is added. Public availability on GitHub does not grant permission to reuse or redistribute the code; add a suitable license if reuse is intended.
