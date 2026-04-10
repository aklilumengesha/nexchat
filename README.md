# NexChat — Real-time Chat Application

A full-stack real-time chat application built with Next.js, NestJS, WebSockets, and Supabase.

![NexChat](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![NestJS](https://img.shields.io/badge/NestJS-10-red?style=flat-square&logo=nestjs)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green?style=flat-square&logo=supabase)

## Features

- Real-time messaging with WebSockets (Socket.io)
- JWT authentication — register & login
- Create and join chat rooms
- Typing indicators
- Online/offline user presence
- Message history with pagination
- Responsive dark UI

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, Zustand |
| Backend | NestJS, TypeScript, Socket.io, Prisma |
| Database | Supabase (PostgreSQL) |
| Auth | JWT + Passport |
| Deployment | Vercel (frontend) + Railway (backend) |

## Project Structure

```
nexchat/
├── frontend/          # Next.js 14 application
│   ├── app/
│   │   ├── login/     # Login page
│   │   ├── register/  # Register page
│   │   └── chat/      # Main chat page
│   ├── components/
│   │   ├── Sidebar.tsx    # Room list + navigation
│   │   └── ChatWindow.tsx # Real-time chat UI
│   ├── store/
│   │   ├── auth.store.ts  # Zustand auth state
│   │   └── rooms.store.ts # Zustand rooms/messages state
│   └── lib/
│       ├── api.ts         # Axios client with JWT
│       └── socket.ts      # Socket.io client
│
└── backend/           # NestJS REST API + WebSocket Gateway
    ├── src/
    │   ├── auth/      # JWT auth, register, login
    │   ├── rooms/     # Room CRUD + message history
    │   ├── chat/      # WebSocket gateway
    │   └── prisma/    # Database service
    └── prisma/
        └── schema.prisma  # Database schema
```

## Getting Started

### Prerequisites
- Node.js 18+
- A [Supabase](https://supabase.com) project

### 1. Clone the repository
```bash
git clone https://github.com/aklilumengesha/nexchat.git
cd nexchat
```

### 2. Backend setup
```bash
cd backend
npm install
cp .env.example .env
# Fill in your Supabase credentials in .env
npx prisma migrate deploy
npm run start:dev
```

### 3. Frontend setup
```bash
cd frontend
npm install
cp .env.example .env.local
# Set NEXT_PUBLIC_API_URL and NEXT_PUBLIC_WS_URL
npm run dev
```

### 4. Open the app
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001/api

## API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | /api/auth/register | Create account | No |
| POST | /api/auth/login | Sign in | No |
| GET | /api/auth/me | Current user | Yes |
| GET | /api/rooms | List public rooms | Yes |
| POST | /api/rooms | Create room | Yes |
| GET | /api/rooms/:id | Room details | Yes |
| POST | /api/rooms/:id/join | Join room | Yes |
| DELETE | /api/rooms/:id/leave | Leave room | Yes |
| GET | /api/rooms/:id/messages | Message history | Yes |

## WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| room:join | Client → Server | Subscribe to room |
| room:leave | Client → Server | Unsubscribe from room |
| message:send | Client → Server | Send a message |
| message:new | Server → Client | New message broadcast |
| typing:start | Client → Server | User started typing |
| typing:stop | Client → Server | User stopped typing |
| user:online | Server → Client | User came online |
| user:offline | Server → Client | User went offline |

## Author

Built by [Aklilu Mengesha](https://github.com/aklilumengesha)
