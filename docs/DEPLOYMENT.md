# Deployment guide

## Recommended services

- Application: Vercel, Render, Railway, Fly.io, or another Node.js host
- Database: Neon, Supabase Postgres, Railway Postgres, AWS RDS, or Prisma Postgres
- Images: Cloudinary or an S3-compatible object store

## Environment variables

Set all values shown in `.env.example`. Production values must use a production database, strong unique secrets, and the final public URL.

## Database deployment

```bash
npm install
npm run db:generate
npm run db:deploy
npm run db:seed
```

Only seed the demonstration accounts when they are needed. Change their passwords immediately.

## Application deployment

```bash
npm run build
npm start
```

## Domain

Add `littlebirdheavyskies.com` in the hosting provider, then follow the provider's DNS instructions. Set:

```text
NEXT_PUBLIC_SITE_URL=https://littlebirdheavyskies.com
```

## Scheduled publication

The included Vercel cron calls `/api/cron/publish` every 15 minutes. Set `CRON_SECRET` in production. On another platform, configure an equivalent scheduled request with:

```text
Authorization: Bearer YOUR_CRON_SECRET
```
