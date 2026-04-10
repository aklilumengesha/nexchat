# NexChat Frontend

Next.js 14 frontend for NexChat real-time chat application.

## Setup

```bash
npm install
cp .env.example .env.local
# Set your backend URLs
npm run dev
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| NEXT_PUBLIC_API_URL | Backend API URL (e.g. http://localhost:3001/api) |
| NEXT_PUBLIC_WS_URL | WebSocket server URL (e.g. http://localhost:3001) |

## Scripts

```bash
npm run dev     # Development server
npm run build   # Production build
npm run start   # Run production build
```

## Pages

| Route | Description |
|-------|-------------|
| / | Redirects to /login |
| /login | Sign in page |
| /register | Create account page |
| /chat | Main chat interface |
