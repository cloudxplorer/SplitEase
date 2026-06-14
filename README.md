# SplitEase — Split Expenses with Friends

A simplified Splitwise-inspired expense splitting application built with Next.js, featuring real-time chat, multiple split types, group balance management, and Indian Rupee (₹/INR) currency support.

> **Internship Assignment**: This project was built as part of an internship assignment to reverse engineer Splitwise and build a working deployed app using AI as the primary development collaborator.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 16 + Tailwind CSS v4 + shadcn/ui |
| **Backend** | Next.js API Routes |
| **Database** | Neon PostgreSQL (Serverless) |
| **ORM** | Prisma v6 |
| **Authentication** | NextAuth.js v4 (Credentials provider) |
| **Real-time** | Scaledrone (WebSocket) + 3s polling fallback |
| **State Management** | Zustand |
| **Validation** | Zod v4 |
| **Deployment** | Vercel |

## Features

### 1. Authentication
- Sign up with name, email, and password (Zod v4 validation)
- Sign in with email and password (NextAuth.js credentials provider)
- JWT-based session management (30-day expiry)
- Secure password hashing with bcryptjs (12 salt rounds)

### 2. Group Management
- Create groups with a name, description, and invite members by email
- View all groups you belong to on the dashboard
- Add new members to existing groups
- Remove members from groups (admin only)
- View group details with member list and expense history

### 3. Expense Management
- Create expenses within a group
- **4 Split Types**:
  - **Equal**: Split evenly among selected members (with rounding adjustment)
  - **Unequal**: Assign specific amounts to each member
  - **Percentage**: Allocate by percentage (must sum to 100%)
  - **Shares**: Distribute based on share ratios (proportional calculation)
- Select who paid for the expense
- Delete expenses (payer or admin only)
- View detailed expense breakdown with per-user amounts

### 4. Real-time Chat
- Chat within each expense using Scaledrone (WebSocket)
- Messages are persisted in the Neon PostgreSQL database
- Real-time updates via Scaledrone channels (room: `expense-{id}`)
- 3-second polling fallback ensures messages always arrive
- Chat messages include user info (avatar with initials) and timestamps
- Auto-scroll to latest message
- Responsive chat height: compact on mobile, taller on desktop

### 5. Balance & Settlement
- Automatic balance calculation per group (and overall across all groups)
- Simplified debt algorithm (greedy: minimizes number of transactions)
- View overall balance across all groups on dashboard
- Record settlements/payments between group members
- View settlement history
- Suggested settlements based on simplified debts

### 6. Responsive Design
- Mobile-first responsive design with Tailwind CSS breakpoints
- Single column on mobile, multi-column grids on desktop
- Dashboard: 3-column balance cards + groups + sidebar on lg+
- Expense detail: Side-by-side info + chat on lg+
- Group members: 1/2/3-column responsive grid
- Sticky header with backdrop blur
- Sticky footer (pushes down on long pages, sticks on short pages)
- Touch-friendly sizing (min 44px interactive targets)

### 7. Indian Rupee (₹/INR) Currency
- All amounts displayed in ₹ (Indian Rupees)
- Database `currency` field defaults to `"INR"` on Expense and Settlement models

## Getting Started

### Prerequisites
- Node.js 18+ or Bun
- A Neon PostgreSQL database
- A Scaledrone account (free tier works)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/cloudxplorer/SplitEase
   cd SplitEase
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   bun install
   ```

3. **Set up environment variables**
   Copy the example env file and fill in your values:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env` with your actual values:
   ```env
   DATABASE_URL=postgresql://username:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   NEXTAUTH_SECRET=your-secret-key-here
   NEXTAUTH_URL=http://localhost:3000
   SCALEDRONE_CHANNEL_ID=your-scaledrone-channel-id
   ```

4. **Push database schema**
   ```bash
   npx prisma db push
   ```

5. **Generate Prisma client**
   ```bash
   npx prisma generate
   ```

6. **Start development server**
   ```bash
   npm run dev
   # or
   bun run dev
   ```

7. **Open** [http://localhost:3000](http://localhost:3000)

## Database Schema

### User
- `id` (CUID, primary key)
- `name` (string, required)
- `email` (string, unique, required)
- `password` (string, hashed with bcryptjs)
- `createdAt`, `updatedAt` (timestamps)

### Group
- `id` (CUID, primary key)
- `name` (string, required)
- `description` (string, optional)
- `createdBy` (FK → User.id)
- `createdAt`, `updatedAt` (timestamps)

### GroupMember
- `id` (CUID, primary key)
- `groupId` (FK → Group.id, cascade delete)
- `userId` (FK → User.id, cascade delete)
- `role` (string: "admin" | "member", default: "member")
- `joinedAt` (timestamp)
- Unique constraint on `[groupId, userId]`

### Expense
- `id` (CUID, primary key)
- `groupId` (FK → Group.id, cascade delete)
- `description` (string, required)
- `amount` (float, required)
- `currency` (string, default: "INR")
- `splitType` (string: "equal" | "unequal" | "percent" | "shares", default: "equal")
- `paidById` (FK → User.id)
- `createdAt`, `updatedAt` (timestamps)

### ExpenseSplit
- `id` (CUID, primary key)
- `expenseId` (FK → Expense.id, cascade delete)
- `userId` (FK → User.id, cascade delete)
- `amount` (float, required)
- `percent` (float, optional)
- `shares` (int, optional)
- Unique constraint on `[expenseId, userId]`

### Settlement
- `id` (CUID, primary key)
- `groupId` (FK → Group.id)
- `fromUserId` (FK → User.id)
- `toUserId` (FK → User.id)
- `amount` (float, required)
- `currency` (string, default: "INR")
- `note` (string, optional)
- `createdAt` (timestamp)

### ChatMessage
- `id` (CUID, primary key)
- `expenseId` (FK → Expense.id, cascade delete)
- `userId` (FK → User.id, cascade delete)
- `message` (string, required)
- `createdAt` (timestamp)

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create new account |
| POST | `/api/auth/[...nextauth]` | Sign in / NextAuth.js |
| GET | `/api/groups` | Get user's groups |
| POST | `/api/groups` | Create a group |
| GET | `/api/groups/[groupId]` | Get group details |
| POST | `/api/groups/[groupId]/members` | Add member to group |
| DELETE | `/api/groups/[groupId]/members` | Remove member from group |
| GET | `/api/expenses?groupId=` | Get group expenses |
| POST | `/api/expenses` | Create expense |
| GET | `/api/expenses/[expenseId]` | Get expense details |
| DELETE | `/api/expenses/[expenseId]` | Delete expense |
| GET | `/api/expenses/[expenseId]/chat` | Get expense chat messages |
| POST | `/api/expenses/[expenseId]/chat` | Send chat message |
| GET | `/api/balances` | Get overall balance |
| GET | `/api/balances/[groupId]` | Get group balance |
| POST | `/api/settlements` | Record settlement |
| GET | `/api/settlements?groupId=` | Get settlements |

## Project Structure

```
src/
├── app/
│   ├── page.tsx                          # Root page (conditional view rendering)
│   ├── layout.tsx                        # Root layout with SessionProvider + Toaster
│   └── api/
│       ├── auth/
│       │   ├── signup/route.ts           # POST signup
│       │   └── [...nextauth]/route.ts    # NextAuth handler
│       ├── groups/
│       │   ├── route.ts                  # GET/POST groups
│       │   └── [groupId]/
│       │       ├── route.ts              # GET group detail
│       │       └── members/route.ts      # POST/DELETE members
│       ├── expenses/
│       │   ├── route.ts                  # GET/POST expenses
│       │   └── [expenseId]/
│       │       ├── route.ts              # GET/DELETE expense
│       │       └── chat/route.ts         # GET/POST chat messages
│       ├── balances/
│       │   ├── route.ts                  # GET overall balance
│       │   └── [groupId]/route.ts        # GET group balance
│       └── settlements/route.ts          # GET/POST settlements
├── components/
│   ├── auth/auth-page.tsx                # Login/Signup page
│   ├── dashboard/dashboard.tsx           # Main dashboard
│   ├── groups/
│   │   ├── group-detail.tsx              # Group detail with tabs
│   │   └── add-group-dialog.tsx          # Create group form
│   ├── expenses/
│   │   ├── expense-detail.tsx            # Expense detail with Scaledrone chat
│   │   └── add-expense-dialog.tsx        # Add expense form with split types
│   ├── settlements/settle-up-dialog.tsx  # Settle up form
│   ├── providers/session-provider.tsx    # NextAuth SessionProvider wrapper
│   └── ui/                               # shadcn/ui components
├── lib/
│   ├── auth.ts                           # NextAuth.js configuration
│   ├── db.ts                             # Prisma client singleton
│   └── store.ts                          # Zustand navigation store
prisma/
└── schema.prisma                         # Database schema (7 models)
```

## AI Used

This project was built with the assistance of **ChatGPT v5.1** as the primary development collaborator, following the assignment's requirement to use AI as a junior engineer partner. The AI was instructed using the required initial prompt from the assignment, which directed it to ask detailed questions before building and to maintain AI_CONTEXT.md as the source of truth.

## Documentation Files

- **AI_CONTEXT.md** — Full working context used to generate the app (source of truth)
- **BUILD_PLAN.md** — Product research, architecture, AI collaboration process, and tradeoffs
- **PROMPTS.md** — Step-by-step AI reproduction prompts to recreate the project

## Deployment

The app is deployed on Vercel. To deploy:

1. Push your code to a GitHub repository
2. Connect the repository to Vercel
3. Add all environment variables in Vercel's project settings:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL`
   - `SCALEDRONE_CHANNEL_ID`
4. Deploy
5. Update `NEXTAUTH_URL` to your Vercel domain after deployment

## License

MIT License

Copyright (c) 2026 SplitEase

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
