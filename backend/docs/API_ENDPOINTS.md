# Backend API endpoints

Local base URL: `http://127.0.0.1:8000/api/`

Direct backend clients use `Authorization: Bearer <access-token>`. The integrated Next.js storefront does not expose tokens to browser JavaScript; it uses same-origin route handlers and secure HttpOnly cookies.

## Public shop

| Method | URL | Access | Purpose |
|---|---|---|---|
| GET | `/api/shop/site/` | Public | Safe branding and default SEO values |
| GET | `/api/shop/profile/` | Public | Contact, location, currency, delivery and pickup information |
| GET | `/api/shop/homepage-sections/` | Public | Active homepage sections |
| GET | `/api/shop/ad-heroes/` | Public | Active promotional hero banners and safe links |
| POST | `/api/shop/newsletter/` | Public | Subscribe an email address to shop updates |
| GET | `/api/shop/categories/` | Public | Active categories |
| GET | `/api/shop/products/` | Public | Active products; supports `category`, `featured`, `search`, and `page` query parameters |
| GET | `/api/shop/products/<slug>/` | Public | One active product and its images |
| GET | `/api/shop/products/<slug>/reviews/` | Public | Approved product reviews |
| POST | `/api/shop/products/<slug>/reviews/` | Customer | Add one verified review after a delivered purchase |

## Authentication and customer account 

| Method | URL | Access | Purpose |
|---|---|---|---|
| POST | `/api/auth/register/` | Public | Create a customer account only |
| POST | `/api/auth/login/` | Public | Log in with email and password; returns access and refresh tokens |
| POST | `/api/auth/refresh/` | Public | Exchange a valid refresh token for fresh tokens |
| POST | `/api/auth/logout/` | Authenticated | Invalidate the active login and optionally blacklist its refresh token |
| GET | `/api/auth/me/` | Authenticated | Return the current user profile |
| PATCH | `/api/auth/me/` | Authenticated | Update email, full name, or phone |
| GET | `/api/customer/orders/` | Customer | List the current customer's orders |
| GET | `/api/customer/orders/<id>/` | Customer | Retrieve one order belonging to the current customer |

Login body:

```json
{"email": "your-email@example.com", "password": "your-password"}
```

Registration body:

```json
{
  "email": "buyer@example.com",
  "full_name": "Demo Buyer",
  "phone": "0700000000",
  "password": "a-strong-password"
}
```

Newsletter body:

```json
{"email": "buyer@example.com"}
```

Review body:

```json
{"rating": 5, "title": "Great bicycle", "comment": "Exactly what I needed."}
```

Review creation requires an authenticated customer with a delivered order containing the product. The response includes `verified_purchase: true`.

Refresh and logout bodies:

```json
{"refresh": "<refresh-token>"}
```

Profile update example:

```json
{"full_name": "Updated Name", "phone": "0700000000"}
```

## Cart and checkout

| Method | URL | Access | Purpose |
|---|---|---|---|
| POST | `/api/cart/` | Public | Create a guest or customer cart |
| GET | `/api/cart/<cart_id>/` | Public | Retrieve a cart and its items |
| POST | `/api/cart/<cart_id>/items/` | Public | Add a product to a cart |
| PATCH | `/api/cart/<cart_id>/items/<item_id>/` | Public | Change an item's product or quantity |
| DELETE | `/api/cart/<cart_id>/items/<item_id>/` | Public | Remove a cart item |
| POST | `/api/checkout/` | Public | Create an order, snapshot items, and create a pending payment transaction |

Guest cart creation sets an HttpOnly `guest_cart_token` cookie. Clients that do
not use cookies must send the returned `session_key` as the `X-Cart-Token`
header on every later cart and checkout request. A cart ID without its matching
token cannot access the cart.

Cart item body:

```json
{"product": 1, "quantity": 2}
```

Checkout body:

```json
{
  "cart_id": 1,
  "customer_name": "Guest Buyer",
  "customer_phone": "0712345678",
  "customer_email": "buyer@example.com",
  "delivery_method": "DELIVERY",
  "delivery_location": "Nairobi CBD",
  "notes": "Optional order note",
  "payment_method": 1
}
```

For `PICKUP`, `delivery_location` may be blank. Prices and delivery fees are calculated by the backend. Quantities above current stock are rejected.

After a committed checkout, the system sends a customer confirmation and a new-order alert to the configured ShopProfile email. Later status changes send a customer update. Email failures are logged and do not cancel valid orders.

## Public payment methods

| Method | URL | Access | Purpose |
|---|---|---|---|
| GET | `/api/shop/payment-methods/` | Public | List active methods available during checkout |

## Admin operations

Requires an authenticated `ADMIN` or `SUPER_ADMIN`.

| Method | URL | Purpose |
|---|---|---|
| GET, POST | `/api/admin/categories/` | List or create categories |
| GET, PUT, PATCH, DELETE | `/api/admin/categories/<id>/` | Retrieve, update, or delete a category |
| GET, POST | `/api/admin/products/` | List or create products |
| GET, PUT, PATCH, DELETE | `/api/admin/products/<id>/` | Retrieve, update, or delete a product |
| GET | `/api/admin/orders/` | List orders |
| GET, PATCH | `/api/admin/orders/<id>/` | Retrieve an order or update status, notes, or delivery location |
| GET | `/api/admin/payments/` | List payment transactions |
| GET, PATCH | `/api/admin/payments/<id>/` | Retrieve or update payment status, reference, paid date, or notes |
| GET | `/api/admin/summary/` | Simple order, sales, paid, balance, pending and delivered totals |

Category creation example:

```json
{"name": "Clothing", "is_active": true}
```

Product creation example:

```json
{
  "category": 1,
  "name": "Sample Product",
  "description": "Product description",
  "price": "2500.00",
  "old_price": null,
  "stock": 10,
  "is_active": true,
  "is_featured": false,
  "seo_title": "Sample Product",
  "seo_description": "Sample product description"
}
```

Order update example:

```json
{"status": "DELIVERED", "notes": "Collected by customer"}
```

Payment update example:

```json
{"status": "PAID", "reference": "PAYMENT123", "paid_at": "2026-06-28T12:00:00Z"}
```

## Super-admin branding

| Method | URL | Access | Purpose |
|---|---|---|---|
| GET, PUT, PATCH | `/api/admin/site/` | Super admin only | Read or update hidden branding and system settings |
# Security and deployment notes

- Production frontend and backend URLs must be exact HTTPS origins.
- Browser authentication uses secure HttpOnly cookies through the frontend server layer.
- Run `python manage.py createcachetable` once after deployment to enable persistent throttling.
- Keep `TRUST_PROXY_HEADERS=False` unless the hosting proxy strips incoming forwarded headers and sets its own trusted value.
- Public errors contain a safe code, message, and request ID; technical details are logged only on the server.
- Login rotates the API-session version, invalidating the user's previous API login.
- Sensitive frontend mutations require exact Origin and CSRF validation.
- Payment methods and transaction records are functional, while real external payment gateways remain intentionally deferred.
