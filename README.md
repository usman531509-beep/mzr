# MZR Parts — Motorbike Spare Parts Store

Next.js 15 (App Router) + Prisma + Supabase Postgres + Cloudinary + NextAuth v5..

## Features

**Storefront**
- Home page with featured products, categories, brand grid
- Product listing with bike-model + year compatibility filter
- Product detail page (image gallery, fitment list, add to cart)
- Cart (localStorage-persisted) and Checkout (Cash on Delivery)
- User registration, login, account, order history
- ISR caching (`revalidate = 3600`) for fast loads + SEO

**Admin (`/admin`)**
- Dashboard with revenue/orders/products/customers stats
- Product CRUD with Cloudinary image upload + compatibility editor
- Brands, Categories, Bike Models CRUD
- Orders list with status updates (PENDING → PAID → SHIPPED → DELIVERED)

**Stack**
- **DB**: Supabase Postgres (free tier — 500 MB, 50k MAU)
- **Images**: Cloudinary (free — 25 GB storage + 25 GB bandwidth/mo, auto WebP/AVIF)
- **Auth**: NextAuth v5 (credentials, JWT sessions, role-based)
- **ORM**: Prisma 5

---

## Local setup (zero cloud accounts needed)

The project runs fully locally: **Postgres in Docker** + **uploads on disk** in `public/uploads/`. Cloudinary and Supabase are wired in but stay disabled until you fill in real creds for deployment.

### 1. Install
```bash
cd /Users/usmanahmad/mzr
npm install
```

### 2. Start local Postgres
```bash
docker compose up -d        # starts Postgres on localhost:5432
```
No Docker? Use any local Postgres and edit `DATABASE_URL` in `.env` to match.

### 3. Environment variables
```bash
cp .env.example .env
```
The defaults already point at the local Docker DB. `AUTH_SECRET` is preset for dev — regenerate with `openssl rand -base64 32` before deploying.

### 4. Push schema + seed
```bash
npx prisma db push          # creates all tables
npx prisma db seed          # demo accounts + sample catalog
```

### 5. Run
```bash
npm run dev
```
Open <http://localhost:3000>.

### Image uploads in dev
The `/api/upload` route auto-detects: if `CLOUDINARY_CLOUD_NAME` is empty, files are saved to `public/uploads/` and served at `/uploads/<filename>`. No CDN account needed locally.

---

## Switching to production

When ready to deploy, just change `.env`:

**Database** — swap `DATABASE_URL` to your Supabase URI (Project Settings → Database → Connection string → URI, port 5432).

**Images** — fill in the four `CLOUDINARY_*` vars. The upload route automatically switches to Cloudinary on the next restart. Existing local uploads in `public/uploads/` stay served as-is.

**Auth** — regenerate `AUTH_SECRET` with `openssl rand -base64 32` and set `AUTH_URL` to your production URL.

---

## Demo accounts

| Role     | Email                  | Password   |
|----------|------------------------|------------|
| **Admin**    | `admin@mzrparts.com`  | `admin123` |
| **Customer** | `user@mzrparts.com`   | `user123`  |

The login page has one-click buttons to fill these in.

Sample data: 5 brands (Honda, Yamaha, Suzuki, Kawasaki, KTM), 6 categories, 11 bike models, 8 sample products with compatibility rules.

---

## Deployment

### Hostinger VPS (Node.js)
```bash
# on the server
git clone <repo> /var/www/mzr
cd /var/www/mzr
npm ci
cp .env.example .env  # edit with real creds
npx prisma db push
npx prisma db seed
npm run build
npm i -g pm2
pm2 start npm --name mzr -- start
pm2 save
```
Then point Nginx → `localhost:3000` and run Certbot for HTTPS.

### Hostinger Shared (PHP-only)
Next.js with ISR + API routes does **not** run on shared/PHP hosting. Two options:
- Use Hostinger only for the domain — point DNS to Vercel (free).
- Switch the project to `output: "export"` (loses ISR + API routes; you'd need Supabase Edge Functions for the upload route).

### Vercel (recommended free tier)
```bash
npx vercel
```
Add env vars in the Vercel dashboard. Deploys auto on `git push`.

---

## Project layout

```
prisma/
  schema.prisma       # User, Brand, Category, BikeModel, Product, Compatibility, Order
  seed.ts             # demo accounts + sample catalog
src/
  app/
    page.tsx          # home (revalidate 1h)
    products/         # listing + detail with ISR
    cart/, checkout/  # client cart + COD checkout
    login/, register/, account/
    admin/            # role-protected admin panel
    api/
      auth/[...nextauth]/route.ts
      register/route.ts
      orders/route.ts
      filters/route.ts            # cascading brand→model dropdown
      upload/route.ts             # Cloudinary signed upload (admin only)
      admin/products/             # POST + PATCH/DELETE [id]
      admin/brands/, categories/, bike-models/, orders/[id]/
  components/
    Header.tsx, Footer.tsx
    ProductCard.tsx, ProductFilters.tsx, AddToCartButton.tsx
    admin/ProductForm.tsx, DeleteButton.tsx
  lib/
    prisma.ts, cloudinary.ts, cart-store.ts (Zustand), format.ts
  auth.ts             # NextAuth (Node runtime, bcrypt)
  auth.config.ts      # edge-safe config for middleware
  middleware.ts       # protects /admin and /account
```

## How the bike-model filter works

`Product` ↔ `BikeModel` is M:N through `ProductCompatibility`, which stores
`yearFrom` / `yearTo` per row. So one part can fit many bikes across year
ranges — exactly what you specified. The `/products` page filters by:

```ts
where: {
  compatibilities: {
    some: {
      bikeModelId,
      yearFrom: { lte: year },
      yearTo:   { gte: year },
    }
  }
}
```

URLs are bookmarkable: `/products?brand=honda&model=<id>&year=2020`.

## Cost summary (free-tier limits)

| Service     | Free tier                                   |
|-------------|---------------------------------------------|
| Supabase    | 500 MB DB, 50k MAU, auto-pauses after 1 wk inactive |
| Cloudinary  | 25 GB storage, 25 GB/mo bandwidth, auto-format |
| Vercel      | 100 GB bandwidth/mo, ISR included           |

For a small/medium parts catalog this is **$0/month**. Scale to paid only when needed.
