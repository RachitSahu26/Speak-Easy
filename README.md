# SpeakEasy (Next.js + shadcn + Auth.js + Drizzle + Neon)

This project contains:

- Landing page UI built with shadcn components
- Credentials authentication using **NextAuth/Auth.js**
- Database access via **Drizzle ORM** and **Neon Postgres**

## 1) Setup environment variables

Copy `.env.example` to `.env.local` and fill values:

```bash
cp .env.example .env.local
```

Required variables:

```env
DATABASE_URL=postgres://...
NEXTAUTH_SECRET=your-random-long-secret
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

> Generate a secret quickly:
>
> ```bash
> npx auth secret
> ```

## 2) Create database schema

After setting `DATABASE_URL`, run:

```bash
npm run db:generate
npm run db:push
```

This creates/syncs the `users` table in Neon.

## 3) Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 4) Socket.io local test

This project includes a simple Socket.io matchmaking setup:

- Socket server: `socket-server.js` (runs on `http://localhost:3001`)
- Client test page: `/socket-test`

When you run `npm run dev`, it starts both:

- Next.js web server (`dev:web`)
- Socket server (`dev:socket`)

To verify:

1. Open [http://localhost:3000/socket-test](http://localhost:3000/socket-test)
2. Confirm status changes to **Connected**
3. Open the same page in another browser/incognito window (2 users)
4. Click **Find Match** in both windows
5. Confirm both receive **Matched** state with a room ID and partner socket ID

Event flow:

- Client → `client:find-match`
- Server queues users
- When queue has 2 users, server emits `server:matched` to both users
- Optional cancel: Client → `client:leave-queue`

UI routes:

- `/find-partner` → shadcn-based partner search page
- `/call/[roomId]` → simple redirected call room placeholder after match

Optional envs:

- `NEXT_PUBLIC_SOCKET_URL` (client socket endpoint)
- `SOCKET_PORT` (socket server port, defaults to `3001`)

## Auth routes and pages

- `GET/POST /api/auth/[...nextauth]` → NextAuth handler
- `POST /api/auth/register` → register user with hashed password
- `/sign-in` → credentials sign in page
- `/sign-up` → account creation page
- `/dashboard` → protected page (requires session)

## Notes

- Landing page CTA/buttons route to sign-in/sign-up.
- Session strategy is JWT.
- Passwords are hashed using `bcryptjs`.
