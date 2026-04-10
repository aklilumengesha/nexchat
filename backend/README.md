# NexChat Backend

NestJS REST API + WebSocket Gateway for NexChat.

## Setup

```bash
npm install
cp .env.example .env
# Fill in your Supabase credentials
npx prisma migrate deploy
npm run start:dev
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| DATABASE_URL | Supabase transaction pooler URL |
| DIRECT_URL | Supabase session pooler URL |
| JWT_SECRET | Secret key for JWT signing |
| PORT | Server port (default: 3001) |
| FRONTEND_URL | Frontend URL for CORS |
| SUPABASE_URL | Supabase project URL |
| SUPABASE_ANON_KEY | Supabase anon public key |

## Scripts

```bash
npm run start:dev   # Development with hot reload
npm run build       # Production build
npm run start:prod  # Run production build
```
