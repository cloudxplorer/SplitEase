# AI_CONTEXT.md — SplitEase Project Context

> This file is the source of truth for the SplitEase project. It contains the full working context used to generate the app. Another developer or AI agent should be able to rebuild the same app from this document.

## Initial Prompt Used to Start the Project

The following required initial prompt (from the internship assignment PDF) was used to begin the AI collaboration:

> You are a junior engineer helping me complete an internship assignment. The assignment is to reverse engineer Splitwise, scope a realistic 3-day version, and build a working deployed app. Important instructions: 1. Do not assume product requirements. 2. Do not jump directly into implementation. 3. Ask me detailed questions about product scope, UX, workflows, edge cases, and engineering decisions. 4. Ask about every implementation detail needed to build the app. 5. After each answer I give, update a Markdown file called AI_CONTEXT.md. 6. AI_CONTEXT.md must become the source of truth for the entire project. 7. The final app must be buildable from AI_CONTEXT.md. 8. Another evaluator should be able to paste AI_CONTEXT.md into the same AI tool and recreate a similar app. 9. Before writing code, produce a build plan based only on the agreed context. 10. During implementation, keep updating AI_CONTEXT.md whenever requirements, architecture, schema, UI, or logic changes. 11. Do not recommend technical solutions. Your job is to let me think through the technical solution. Start by interviewing me. Ask questions across: product goals, Splitwise research, core workflows, user personas, MVP scope, out-of-scope features, data model, authentication, groups, expenses, settlements, balance calculation, UI screens, routing, frontend architecture, backend architecture, database choice, API design, deployment, testing, known risks, tradeoffs. Do not give me a final plan until you have asked enough questions.

The full verbatim prompt is also available in **PROMPTS.md** (Prompt 0).

---

## Prompts and AI Responses (Interview Transcript)

After pasting the initial prompt, the AI agent interviewed me across all the required categories. Below is the complete transcript of prompts (questions) the AI asked and the responses (answers) I gave. This shaped every aspect of the final product.

---

### Round 1: Product Goals & Splitwise Research

**AI:** What is the primary goal of this app? Is it a full Splitwise clone or a simplified version?

**Me:** It's a simplified version — a 3-day MVP. I want to capture the core experience: creating groups, splitting expenses, viewing balances, and settling up. No need for the full feature set like notifications, social login, or receipt scanning.

**AI:** How did you study Splitwise? What specific features stood out to you?

**Me:** I used the Splitwise web app and mobile app. The key things I noticed: (1) Everything revolves around groups, (2) The dashboard shows a clear balance summary (owed vs owing), (3) Split types are flexible — equal, unequal, percent, shares, (4) Debts are simplified to minimize transactions, (5) There's a chat feature within each expense for discussion.

**AI:** What workflows are essential for the MVP?

**Me:** (1) User signs up and creates a group, (2) Adds members by email, (3) Creates expenses with different split types, (4) Views balances per group, (5) Settles debts, (6) Chats within an expense. That's the core loop.

---

### Round 2: User Personas & MVP Scope

**AI:** Who are the target users?

**Me:** Primarily Indian college students and young professionals — people splitting rent, food bills, trip expenses, etc. The app should show amounts in Indian Rupees (₹), not dollars.

**AI:** What is strictly in scope for the 3-day MVP?

**Me:** Email/password signup and login, group creation with member invites (by email), expense creation with 4 split types (equal, unequal, percentage, shares), real-time chat per expense, balance calculation with simplified debts, and a settle-up feature. Responsive design is a must — the app should work well on both mobile and desktop.

**AI:** What is out of scope?

**Me:** Social login (Google/Facebook), image uploads/receipt scanning, push/email notifications, offline support/PWA, multi-currency conversion, recurring expenses, expense categories/tags, admin dashboard, activity feed, CSV/PDF export, and group expense limits.

---

### Round 3: Data Model

**AI:** What entities do you need in the database?

**Me:** User, Group, GroupMember, Expense, ExpenseSplit, Settlement, and ChatMessage. That covers the core data.

**AI:** How do users relate to groups?

**Me:** A many-to-many relationship through GroupMember. Each GroupMember has a role — "admin" (the creator) or "member". The unique constraint should be on [groupId, userId] so a user can't be in the same group twice.

**AI:** How are expenses structured?

**Me:** An Expense belongs to a Group, has a paidById pointing to the User who paid, a splitType (equal/unequal/percent/shares), an amount, and a currency field defaulting to "INR". Each expense has multiple ExpenseSplits — one per included user. ExpenseSplit has amount, and optional percent or shares fields depending on the split type.

**AI:** How do settlements work in the data model?

**Me:** A Settlement records a payment from one user to another within a group. It has fromUserId, toUserId, amount, currency (INR), an optional note, and timestamps. Settlements reduce the balances between users.

**AI:** How is chat stored?

**Me:** ChatMessage has expenseId, userId, message text, and a timestamp. Each expense has its own chat room. Messages are stored in the database and also broadcast via Scaledrone for real-time delivery.

**AI:** Should the User model have an avatar/profile picture field?

**Me:** Not for the MVP. It adds complexity — image upload, storage, etc. We'll use initials-based avatars instead. Just id, name, email, password, and timestamps on the User model.

---

### Round 4: Authentication

**AI:** How should authentication work?

**Me:** Simple email/password signup and login. No social login for the MVP. Use NextAuth.js with the credentials provider and JWT strategy. Sessions should last 30 days.

**AI:** How should passwords be handled?

**Me:** Hash with bcryptjs, 12 salt rounds. Never return the password in any API response. Use Zod v4 validation on the signup route — name (2-50 chars), valid email, password (6-100 chars minimum).

**AI:** What happens after signup?

**Me:** Auto-login after successful signup — call signIn("credentials") immediately so the user goes straight to the dashboard without needing to manually log in.

---

### Round 5: Groups

**AI:** How are groups created and managed?

**Me:** Any authenticated user can create a group with a name, optional description, and optionally invite members by their email address. The creator becomes the group admin automatically.

**AI:** How are members added to existing groups?

**Me:** Any group member can add a new member by entering their email address. If the email corresponds to an existing user, they're added immediately. If not, show an error.

**AI:** Who can remove members?

**Me:** Only the group admin can remove members. The admin cannot be removed. If we need admin transfer later, that's out of scope for now.

**AI:** Should there be a limit on group size?

**Me:** No hard limit for the MVP. We expect small groups (2-10 members) anyway.

---

### Round 6: Expenses & Splits

**AI:** What split types are needed and how should each work?

**Me:**
- **Equal**: The total amount is divided evenly among all included members. Handle rounding by adding the remainder to the first split.
- **Unequal**: Each member is assigned a custom amount. The total of all amounts must equal the expense total.
- **Percentage**: Each member gets a percentage. Percentages must sum to 100%. The server calculates the actual amounts.
- **Shares**: Each member gets a number of shares (like 1, 2, 3). The total amount is distributed proportionally based on share count. Handle rounding the same as equal splits.

**AI:** Who can create and delete expenses?

**Me:** Any group member can create an expense. Only the person who paid for the expense or the group admin can delete it. There's no editing — delete and re-create if needed.

**AI:** Should all members be included in a split by default?

**Me:** Yes, all group members should be included by default, but the user can uncheck members to exclude them from a split.

**AI:** Where should split amount calculations happen?

**Me:** On the server side, in the POST /api/expenses route. The client sends the split type and raw inputs (amounts/percentages/shares), and the server calculates the actual split amounts. This prevents client-side manipulation.

---

### Round 7: Settlements & Balance Calculation

**AI:** How should balances be calculated?

**Me:** For each group, calculate each member's net balance:
- If a member paid for an expense, they get +amount (they're owed that money back)
- If a member has a split in an expense, they get -splitAmount (they owe that money)
- If a member paid a settlement (fromUserId), they get +amount (reduces what they owe)
- If a member received a settlement (toUserId), they get -amount (reduces what they're owed)
The net balance = total paid + total settlement payments - total splits - total settlement receipts.

**AI:** How should debts be simplified?

**Me:** Use a greedy algorithm: separate all members into creditors (positive balance) and debtors (negative balance). Sort both by amount descending. Match the largest debtor with the largest creditor, transfer as much as possible, and repeat until all debts are settled. This minimizes the number of transactions.

**AI:** How does the settle-up feature work?

**Me:** Show the simplified debts where the current user is the debtor. User can click a suggested settlement to auto-fill the amount and recipient. Or they can manually enter a recipient, amount, and optional note. The settlement is recorded and balances update immediately.

---

### Round 8: UI Screens & Routing

**AI:** What screens/views are needed?

**Me:**
1. **Auth page** — Login/signup with split-screen layout (branding left, forms right)
2. **Dashboard** — Balance summary cards, group list, balance sidebar
3. **Group Detail** — Tabs for Expenses, Balances, Members
4. **Expense Detail** — Split breakdown + real-time chat side by side
5. **Add Expense** — Form with description, amount, paid-by, split type, per-member inputs
6. **Settle Up** — Suggested settlements + manual payment form
7. **Add Group** — Name, description, member email input

**AI:** How should navigation work?

**Me:** Use Zustand for client-side navigation instead of Next.js page routing. Keep a view history stack so the back button works. This gives a more app-like feel without URL changes. Views are rendered conditionally in the main page.tsx.

**AI:** What's the color scheme and design language?

**Me:** Emerald green as the primary color (shades of emerald-600, emerald-700). Orange-red for debts/owing. Clean, card-based layout using shadcn/ui. User avatars with initials on emerald background. Chat bubbles: emerald for current user (right-aligned), gray for others (left-aligned). Sticky header with backdrop blur. Sticky footer at the bottom.

---

### Round 9: Frontend Architecture

**AI:** Should components be server or client components?

**Me:** All client components for the MVP. They need useSession(), useState, useEffect, and browser APIs (Scaledrone). This is simpler and works fine for an authenticated-only app. With more time, I'd use Server Components for data fetching.

**AI:** How should data be fetched?

**Me:** Client-side fetch() calls to Next.js API routes. Each component manages its own loading state. Use useCallback + useEffect for data fetching. No React Query or SWR for the MVP — plain fetch is sufficient.

**AI:** What UI component library?

**Me:** shadcn/ui with the New York style. It provides Button, Card, Input, Label, Tabs, Badge, Avatar, Separator, Dialog, DropdownMenu, and Textarea — everything we need. Use Lucide React for icons.

---

### Round 10: Backend Architecture & Database

**AI:** What framework and database?

**Me:** Next.js 16 with App Router for both frontend and API routes. Neon PostgreSQL for the database — it's serverless, auto-scaling, and has a free tier. Prisma v6 as the ORM for type-safe database access.

**AI:** Why Neon PostgreSQL over SQLite or MySQL?

**Me:** It's serverless (no server management), scales to zero (free tier), works great with Prisma, and is perfect for Vercel deployment. SQLite is too limited for production. MySQL/Redis would add infrastructure complexity we don't need.

**AI:** Any special considerations for the database connection?

**Me:** Yes — the development environment has a stale DATABASE_URL system variable that overrides the .env file. I need a workaround in db.ts that reads the .env file directly if the system DATABASE_URL doesn't start with "postgresql://".

---

### Round 11: API Design

**AI:** How should the API routes be structured?

**Me:**
- Auth: POST /api/auth/signup, POST /api/auth/[...nextauth]
- Groups: GET/POST /api/groups, GET /api/groups/[groupId], POST/DELETE /api/groups/[groupId]/members
- Expenses: GET/POST /api/expenses, GET/DELETE /api/expenses/[expenseId]
- Chat: GET/POST /api/expenses/[expenseId]/chat
- Balances: GET /api/balances, GET /api/balances/[groupId]
- Settlements: GET/POST /api/settlements

All routes validate the session with getServerSession(). Errors return { error: string }. Success returns the resource.

**AI:** Should there be rate limiting or input sanitization?

**Me:** No rate limiting for the MVP. Input validation with Zod on the signup route. Other routes validate required fields manually. Zod validation can be added to other routes later.

---

### Round 12: Real-time Chat

**AI:** How should real-time chat work?

**Me:** Use Scaledrone for WebSocket-based real-time messaging. Each expense gets its own room: `expense-{expenseId}`. When a user sends a message, it's saved to the database via the API, then broadcast via Scaledrone so other users see it instantly. The client dynamically loads the Scaledrone SDK.

**AI:** What if Scaledrone fails or is unreliable?

**Me:** Add a 3-second polling fallback. Always run polling alongside Scaledrone. Poll the GET /api/expenses/[expenseId] endpoint, extract chatMessages, deduplicate by ID, and append new messages. This ensures messages always arrive within 3 seconds even if Scaledrone disconnects.

**AI:** What should the chat UI look like?

**Me:** Message bubbles — emerald green for current user (right-aligned), gray for others (left-aligned). Show user avatar + name above each message. Show timestamp below. Auto-scroll to bottom on new messages. Input bar at the bottom with a text field and send button. Responsive height: 300px on mobile, 500px on desktop.

---

### Round 13: Deployment

**AI:** Where and how should the app be deployed?

**Me:** Vercel — it's the natural choice for Next.js. Push to GitHub, connect to Vercel, set environment variables (DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, SCALEDRONE_CHANNEL_ID), and deploy. The postinstall script runs prisma generate. After deployment, update NEXTAUTH_URL to the Vercel domain.

**AI:** What's the deployment workflow?

**Me:** Auto-deploys on push to main branch. Environment variables are set in Vercel's dashboard. The build uses `next build` with standalone output mode.

---

### Round 14: Testing & Known Risks

**AI:** What testing strategy do you want?

**Me:** Manual testing only for the MVP. No unit/integration/E2E tests — there's not enough time in 3 days. I'll create a manual testing checklist covering all core flows: signup, login, groups, expenses (each split type), chat, balances, settlements, responsive design.

**AI:** What are the known risks and how will you mitigate them?

**Me:**
1. **Scaledrone reliability** — Mitigated with 3-second polling fallback
2. **Database connection issues** — Mitigated with .env file workaround for stale DATABASE_URL
3. **Rounding errors in splits** — Mitigated with rounding adjustment (add remainder to first split) and 0.01 tolerance
4. **No URL-based routing** — Accepted trade-off; with more time, would switch to App Router pages
5. **No automated tests** — Accepted risk; high regression potential when making changes
6. **No rate limiting** — Accepted for MVP; would add in production

---

### Round 15: Tradeoffs & Final Decisions

**AI:** What are the biggest tradeoffs you're making?

**Me:**
1. Zustand navigation over URL routing — simpler state, no deep links
2. Client-side rendering over Server Components — simpler but less performant
3. Scaledrone over custom WebSocket — zero infra but less control
4. No avatar field — simpler, avoids signup crash
5. INR-only currency — appropriate for target audience but not internationalized
6. No expense editing — delete and re-create only
7. No notifications — users must check manually

**AI:** What would you improve with more time?

**Me:** URL-based routing with App Router pages, Server Components for data fetching, custom Socket.io server for real-time, image upload for avatars/receipts, expense editing, push notifications, multi-currency support, recurring expenses, search/filter, pagination, automated tests, rate limiting, and CSV/PDF export.

---

*After this interview, the AI produced a build plan and then implementation began. The AI_CONTEXT.md file was updated after every answer and every change during implementation.*

---

## Product Understanding

**SplitEase** is a simplified Splitwise-inspired expense-splitting web application. It allows users to:

1. **Sign up / Log in** with email and password
2. **Create groups** and invite existing users by email
3. **Add expenses** to groups with 4 split types: Equal, Unequal, Percentage, and Shares
4. **Chat in real-time** within each expense using Scaledrone (WebSocket) + polling fallback
5. **View balances** — overall and per-group, with simplified debt calculation
6. **Settle debts** — record payments between group members
7. **Currency** — All amounts displayed in Indian Rupees (₹ / INR)

### Core Workflows

1. **Onboarding**: User signs up → auto-logged in → sees empty dashboard
2. **Group Creation**: Dashboard → New Group → Enter name, description, invite members by email → Group created
3. **Adding Expenses**: Group detail → Add Expense → Enter description, amount (₹), select payer, choose split type, configure splits → Expense created
4. **Viewing Expenses**: Group detail → Expenses tab → Click expense → See breakdown + chat
5. **Chat**: Expense detail → Type message → Send → Message persisted to DB + broadcast via Scaledrone → Other users see it in real-time (or via 3-second polling fallback)
6. **Settling Up**: Group detail → Balances tab → Settle Up → Choose recipient, amount, note → Settlement recorded
7. **Navigation**: Back button on every page using Zustand view history stack

### User Personas

- **Primary**: College students / young professionals splitting expenses (rent, food, trips)
- **Secondary**: Roommates managing shared household costs
- **Tertiary**: Friends on group trips tracking shared spending

---

## Product Scope

### In Scope (MVP)
- Email/password authentication
- Group CRUD (create, view, add/remove members)
- Expense CRUD with 4 split types
- Real-time chat per expense (Scaledrone + polling)
- Balance calculation (overall + per-group)
- Simplified debt algorithm
- Settlement recording
- Responsive design (mobile + desktop)

### Out of Scope
- Social login (Google, Facebook)
- Image uploads / receipt scanning
- Push notifications / email notifications
- Offline support / PWA
- Multi-currency conversion
- Recurring expenses
- Expense categories/tags
- Admin dashboard / analytics
- Activity feed / audit log
- Export to CSV/PDF
- Group expense limits or budgets

---

## Implementation Decisions

### 1. Single-Page Architecture with Zustand
Instead of using Next.js App Router pages for navigation, we use a single page (`src/app/page.tsx`) with conditional rendering based on a Zustand store. This was chosen because:
- Simpler state management — no need to pass IDs via URL params
- View history stack for back navigation is easy to implement
- Faster transitions between views (no page reloads)
- The app feels like a native mobile app

### 2. Client-Side Rendering
All components are `"use client"` because:
- They depend on `useSession()` from NextAuth
- They use `useState`, `useEffect`, and browser APIs (Scaledrone)
- Fetching data on the client simplifies the architecture for this MVP

### 3. API Routes for All Data Operations
All database operations go through Next.js API routes (`src/app/api/`), never directly from client components. This ensures:
- Server-side session validation via `getServerSession()`
- Input validation on the server
- No direct Prisma client exposure to the browser

### 4. Scaledrone + Polling Fallback for Chat
Scaledrone provides real-time WebSocket messaging without managing infrastructure. However, Scaledrone can be unreliable (connection drops, SDK load failures), so we implement a 3-second polling fallback that always runs alongside Scaledrone. This ensures messages are always delivered, even if Scaledrone fails.

### 5. No Avatar Field
Initially, the User model had an `avatar` field, but it was removed during implementation because:
- It added complexity without providing value for the MVP
- The actual Neon PostgreSQL database didn't have the column
- Removing it fixed a critical signup crash (`User.avatar column doesn't exist`)
- Avatar fallbacks use user initials instead

### 6. Indian Rupee (₹ / INR) Currency
The app targets Indian users. All currency displays use the ₹ symbol. The database `currency` field defaults to `"INR"` on both Expense and Settlement models.

---

## Engineering Requirements

### Technical Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router, Turbopack) | 16 |
| Language | TypeScript | 5 |
| Styling | Tailwind CSS + shadcn/ui | v4 |
| Database | Neon PostgreSQL (Serverless) | — |
| ORM | Prisma | v6 |
| Authentication | NextAuth.js (Credentials Provider) | v4 |
| Real-time | Scaledrone (WebSocket chat) | — |
| State Management | Zustand | v5 |
| Validation | Zod | v4 |
| Password Hashing | bcryptjs | v3 |
| Toast Notifications | Sonner | v2 |
| Icons | Lucide React | — |
| Deployment | Vercel | — |

### Environment Variables
```env
DATABASE_URL=postgresql://username:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   NEXTAUTH_SECRET=your-secret-key-here
   NEXTAUTH_URL=http://localhost:3000
   SCALEDRONE_CHANNEL_ID=your-scaledrone-channel-id
```

---

## Database Schema

### Prisma Configuration
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### User
```prisma
model User {
  id            String          @id @default(cuid())
  name          String
  email         String          @unique
  password      String
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  groupMemberships    GroupMember[]
  createdGroups       Group[]
  paidExpenses        Expense[]       @relation("ExpensePaidBy")
  expenseSplits       ExpenseSplit[]
  sentSettlements     Settlement[]    @relation("SettlementFrom")
  receivedSettlements Settlement[]    @relation("SettlementTo")
  chatMessages        ChatMessage[]
}
```

### Group
```prisma
model Group {
  id          String        @id @default(cuid())
  name        String
  description String?
  createdBy   String
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  creator   User          @relation(fields: [createdBy], references: [id])
  members   GroupMember[]
  expenses  Expense[]
}
```

### GroupMember
```prisma
model GroupMember {
  id        String   @id @default(cuid())
  groupId   String
  userId    String
  role      String   @default("member")
  joinedAt  DateTime @default(now())

  group Group @relation(fields: [groupId], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([groupId, userId])
}
```

### Expense
```prisma
model Expense {
  id          String   @id @default(cuid())
  groupId     String
  description String
  amount      Float
  currency    String   @default("INR")
  splitType   String   @default("equal")
  paidById    String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  group       Group          @relation(fields: [groupId], references: [id], onDelete: Cascade)
  paidBy      User           @relation("ExpensePaidBy", fields: [paidById], references: [id])
  splits      ExpenseSplit[]
  chatMessages ChatMessage[]
}
```

### ExpenseSplit
```prisma
model ExpenseSplit {
  id        String   @id @default(cuid())
  expenseId String
  userId    String
  amount    Float
  percent   Float?
  shares    Int?

  expense Expense @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([expenseId, userId])
}
```

### Settlement
```prisma
model Settlement {
  id          String   @id @default(cuid())
  groupId     String
  fromUserId  String
  toUserId    String
  amount      Float
  currency    String   @default("INR")
  note        String?
  createdAt   DateTime @default(now())

  fromUser User @relation("SettlementFrom", fields: [fromUserId], references: [id])
  toUser   User @relation("SettlementTo", fields: [toUserId], references: [id])
}
```

### ChatMessage
```prisma
model ChatMessage {
  id        String   @id @default(cuid())
  expenseId String
  userId    String
  message   String
  createdAt DateTime @default(now())

  expense Expense @relation(fields: [expenseId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

### Entity Relationships
- User 1:N Group (creator)
- User N:N Group (via GroupMember)
- Group 1:N Expense
- User 1:N Expense (payer)
- Expense 1:N ExpenseSplit
- User 1:N ExpenseSplit
- Group 1:N Settlement
- User 1:N Settlement (from)
- User 1:N Settlement (to)
- Expense 1:N ChatMessage
- User 1:N ChatMessage

---

## API Design

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create new account (name, email, password) |
| POST | `/api/auth/[...nextauth]` | Sign in / NextAuth.js handler |

### Groups
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/groups` | Get all groups where user is a member (with member count, expense count, total expenses) |
| POST | `/api/groups` | Create group (name, description, optional memberEmails) |
| GET | `/api/groups/[groupId]` | Get group details with members and expenses |
| POST | `/api/groups/[groupId]/members` | Add member by email |
| DELETE | `/api/groups/[groupId]/members` | Remove member (body: { userId }) |

### Expenses
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/expenses?groupId=` | Get group expenses with chat message count |
| POST | `/api/expenses` | Create expense with splits |
| GET | `/api/expenses/[expenseId]` | Get expense details with splits and chat messages |
| DELETE | `/api/expenses/[expenseId]` | Delete expense (payer or group admin only) |

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/expenses/[expenseId]/chat` | Get chat messages for an expense |
| POST | `/api/expenses/[expenseId]/chat` | Send a chat message |

### Balances
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/balances` | Get overall balance (totalOwed, totalOwing, netBalance, per-group breakdown) |
| GET | `/api/balances/[groupId]` | Get group-level balances with simplified debts |

### Settlements
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/settlements?groupId=` | Get settlements for a group |
| POST | `/api/settlements` | Record a settlement |

### API Design Principles
- All routes validate session via `getServerSession(authOptions)`
- Errors return `{ error: string }` with appropriate HTTP status codes
- Success returns the created/fetched resource
- Balance calculations are done server-side from ExpenseSplit + Settlement records
- Split amounts are calculated server-side to prevent client-side manipulation

---

## Frontend Structure

### Component Hierarchy
```
src/app/page.tsx (root — conditional view rendering)
├── AuthPage (src/components/auth/auth-page.tsx)
│   ├── Login tab
│   └── Signup tab
├── Dashboard (src/components/dashboard/dashboard.tsx)
│   ├── Balance Summary Cards (3 cards: owed, owing, net)
│   ├── Groups List (with balance indicators)
│   └── Balance Summary Sidebar (per-group breakdown)
├── GroupDetail (src/components/groups/group-detail.tsx)
│   ├── Header (back, group name, add expense)
│   ├── Expenses Tab (grid of expense cards with delete)
│   ├── Balances Tab (simplified debts + settle up + settlement history)
│   └── Members Tab (grid of members with add/remove)
├── ExpenseDetail (src/components/expenses/expense-detail.tsx)
│   ├── Expense Info Card (amount, paid by, split breakdown)
│   └── Chat Card (Scaledrone + polling, message bubbles, input)
├── AddExpenseDialog (src/components/expenses/add-expense-dialog.tsx)
│   ├── Description input
│   ├── Amount input (₹ prefix)
│   ├── Paid-by selector (member avatars)
│   ├── Split type tabs (equal, unequal, percent, shares)
│   ├── Per-member split inputs
│   └── Split summary (total vs split total validation)
├── SettleUpDialog (src/components/settlements/settle-up-dialog.tsx)
│   ├── Suggested Settlements (from simplified debts)
│   ├── Manual Payment Form (recipient, amount, note)
│   └── Direction indicator (You → Recipient)
└── AddGroupDialog (src/components/groups/add-group-dialog.tsx)
    ├── Group name input
    ├── Description input
    └── Member email chips
```

### Key Libraries / Utilities
- `src/lib/store.ts` — Zustand store with view history stack
- `src/lib/auth.ts` — NextAuth.js configuration
- `src/lib/db.ts` — Prisma client singleton (with .env workaround for stale DATABASE_URL)

### State Management (Zustand)
```typescript
type View = "dashboard" | "group" | "expense-detail" | "add-expense" | "settle-up" | "add-group";

interface AppState {
  currentView: View;
  selectedGroupId: string | null;
  selectedExpenseId: string | null;
  viewHistory: { view: View; groupId: string | null; expenseId: string | null }[];
  navigate: (view: View, id?: string | null) => void;
  goBack: () => void;
}
```

### Responsive Design
- **Mobile-first**: Single column layouts by default
- **Breakpoints**: `sm:640px`, `md:768px`, `lg:1024px`
- **Dashboard**: 3-column balance cards on `sm+`, 2-column (groups + sidebar) on `lg+`
- **Group Detail**: Expense cards 2-column on `md+`, members 3-column on `lg+`
- **Expense Detail**: 2-column (info + chat) on `lg+`
- **All pages**: `max-w-6xl` container, `px-4 sm:px-6 lg:px-8` padding
- **Sticky header**: `sticky top-0 z-50 bg-white/80 backdrop-blur-lg`
- **Sticky footer**: `mt-auto` within `min-h-screen flex flex-col`
- **Touch targets**: Minimum 44px for interactive elements

### Color Scheme
- **Primary**: Emerald (`emerald-600`, `emerald-700`)
- **Positive balance**: Emerald gradient / text
- **Negative balance**: Orange-red gradient / text
- **Current user highlights**: `bg-emerald-50`
- **Chat bubbles**: Emerald for current user, gray for others
- **Avatars**: Emerald background with initials

---

## Deployment Plan

### Vercel Deployment
1. Push code to GitHub repository
2. Connect repository to Vercel
3. Set environment variables in Vercel dashboard:
   - `DATABASE_URL` — Neon PostgreSQL connection string
   - `NEXTAUTH_SECRET` — JWT signing secret
   - `NEXTAUTH_URL` — Production URL (update after first deploy)
   - `SCALEDRONE_CHANNEL_ID` — Channel ID for real-time chat
4. Deploy (auto-deploys on push to main)
5. Update `NEXTAUTH_URL` to the Vercel domain after deployment
6. Verify all features: signup, login, create group, add expense, chat, settle up

### Build Configuration
- `package.json` has `"postinstall": "prisma generate"` for Vercel
- `next.config.ts` has `output: "standalone"` and `ignoreBuildErrors: true`
- Prisma schema uses `postgresql` provider for Neon

---

## Testing Plan

> Note: This is an MVP built in 2 days. Automated testing is out of scope.

### Manual Testing Checklist
1. **Authentication**: Sign up with valid data → auto-login → see dashboard
2. **Authentication**: Sign up with existing email → error message
3. **Authentication**: Log in with wrong password → error message
4. **Groups**: Create group → appears on dashboard → click to view details
5. **Groups**: Add member by email → member appears in members tab
6. **Groups**: Remove member (admin only) → member removed
7. **Expenses**: Add equal split expense → correct amounts shown
8. **Expenses**: Add unequal split → custom amounts saved correctly
9. **Expenses**: Add percentage split → must total 100% to submit
10. **Expenses**: Add shares split → proportional amounts calculated
11. **Chat**: Send message → appears immediately → other user sees it via Scaledrone or polling
12. **Balances**: Create expenses → view balance summary on dashboard and group detail
13. **Settlements**: Record settlement → balance updates accordingly
14. **Responsive**: Test on mobile viewport → single column, touch-friendly
15. **Navigation**: Use back button → returns to previous view correctly

---

## Trade-offs

1. **Single-page Zustand navigation vs. Next.js App Router pages**
   - Chose Zustand for simpler state and native app feel
   - Trade-off: No URL-based routing (can't share deep links, no browser back button support)
   - With more time: Would use App Router with dynamic routes for proper URL support

2. **Scaledrone + polling vs. custom WebSocket server**
   - Chose Scaledrone for zero-infrastructure real-time
   - Trade-off: Dependent on third-party service, limited control over connection reliability
   - Added 3-second polling fallback to ensure messages always arrive
   - With more time: Would build a custom Socket.io server for full control

3. **No avatar field**
   - Removed to fix a critical signup crash
   - Trade-off: Less personalized UI (using initials instead of profile pictures)
   - With more time: Would add image upload with cloud storage (e.g., Cloudinary)

4. **Client-side data fetching vs. Server Components**
   - All components are client components using `useState` + `fetch`
   - Trade-off: No SSR data loading, slower initial paint
   - With more time: Would use Next.js Server Components for better performance

5. **INR-only currency**
   - Hardcoded ₹ symbol and INR currency throughout
   - Trade-off: Not internationalized, but appropriate for target Indian audience
   - With more time: Would add multi-currency support with locale-based formatting

6. **No automated tests**
   - Skipped for MVP speed
   - Trade-off: Regression risk when making changes
   - With more time: Would add Jest + React Testing Library + Playwright E2E tests

---

## Changes Made During Implementation

### Change 1: Removed `avatar` field from User model
- **Problem**: The Prisma schema originally had an `avatar` field on User model, but the actual Neon PostgreSQL database didn't have this column, causing a 500 error on signup (`User.avatar column doesn't exist`)
- **Fix**: Removed `avatar` from Prisma schema, removed `avatar: true` from all 22 Prisma select statements across 9 API route files, removed `avatar: string | null` from 6 component interfaces, changed `image: user.avatar` to `image: null` in `auth.ts`
- **Files affected**: `prisma/schema.prisma`, all API routes in `src/app/api/`, all component files, `src/lib/auth.ts`

### Change 2: Changed currency from USD ($) to INR (₹)
- **Problem**: User requested Indian Rupee currency instead of US Dollar
- **Fix**: Changed all `$` symbols to `₹` in component files (dashboard, group-detail, expense-detail, add-expense-dialog, settle-up-dialog), changed `currency` default from `"USD"` to `"INR"` in Prisma schema for both Expense and Settlement models
- **Files affected**: `prisma/schema.prisma`, 5 component files

### Change 3: Fixed real-time chat (Scaledrone messages not arriving)
- **Problem**: Scaledrone WebSocket messages were not arriving in real-time — users had to refresh to see new messages
- **Fix**: Added 3-second polling fallback (`setInterval(pollNewMessages, 3000)`) that always runs alongside Scaledrone. The polling fetches the full expense data, filters out already-known messages by ID, and appends new ones. Scaledrone is still used for instant delivery when it connects successfully, but polling ensures reliability.
- **Files affected**: `src/components/expenses/expense-detail.tsx`

### Change 4: Full responsive redesign
- **Problem**: Post-login pages looked like mobile-only interfaces, not responsive across devices
- **Fix**: Rewrote all 6 main components with Tailwind responsive breakpoints:
  - Dashboard: `max-w-6xl`, 3-column balance cards (`sm:grid-cols-3`), 2-column layout (`lg:grid-cols-3` groups + sidebar)
  - Group Detail: `max-w-6xl`, expense cards 2-column (`md:grid-cols-2`), members grid (`sm:grid-cols-2 lg:grid-cols-3`)
  - Expense Detail: `max-w-6xl`, 2-column (`lg:grid-cols-2` info + chat), responsive chat height
  - Add Expense: `max-w-2xl`, responsive split inputs
  - Settle Up: `max-w-2xl`, `sm:grid-cols-2` for amount + note
  - Add Group: `max-w-2xl`
- **Files affected**: All 6 component files

### Change 5: Prisma client DATABASE_URL workaround
- **Problem**: The system environment had a stale `DATABASE_URL` pointing to a local SQLite file, which overrode the Neon PostgreSQL URL in `.env`
- **Fix**: Added a workaround in `src/lib/db.ts` that reads `.env` file directly if `DATABASE_URL` doesn't start with `postgresql://`, and sets it before creating the Prisma client

---

## Known Limitations

1. **No URL-based routing**: Can't share deep links to specific groups/expenses. All navigation is in-memory via Zustand.
2. **No offline support**: App requires internet connection for all operations.
3. **No notifications**: Users don't get notified of new expenses, messages, or settlements.
4. **No multi-currency**: Only INR (₹) is supported.
5. **No file uploads**: No receipt images or profile pictures.
6. **No recurring expenses**: Can't set up automatic recurring splits.
7. **No admin transfer**: Group admin can't transfer admin role to another member.
8. **Chat is per-expense only**: No group-level chat or direct messaging.
9. **Balance rounding**: Rounding to 2 decimal places may cause tiny discrepancies in very large groups.
10. **No expense editing**: Expenses can only be created or deleted, not edited after creation.
11. **Scaledrone dependency**: Real-time chat depends on Scaledrone's free tier availability and reliability. Polling fallback ensures messages still arrive but with up to 3-second delay.
12. **No search/filter**: Can't search groups, expenses, or members.
13. **No pagination**: All data is fetched at once (could be slow with many records).

---

## Implementation Details

> This section contains the exact code-level details needed to reproduce the application. Every file, configuration, type, and algorithm is documented here.

### Project Dependencies (package.json)

```json
{
  "name": "splitease",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint .",
    "db:push": "prisma db push",
    "db:generate": "prisma generate",
    "db:migrate": "prisma migrate dev",
    "db:reset": "prisma migrate reset",
    "postinstall": "prisma generate"
  },
  "dependencies": {
    "@prisma/client": "^6.19.3",
    "@radix-ui/react-avatar": "^1.1.10",
    "@radix-ui/react-dialog": "^1.1.14",
    "@radix-ui/react-dropdown-menu": "^2.1.15",
    "@radix-ui/react-label": "^2.1.7",
    "@radix-ui/react-separator": "^1.1.7",
    "@radix-ui/react-slot": "^1.2.3",
    "@radix-ui/react-tabs": "^1.1.12",
    "bcryptjs": "^3.0.3",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.525.0",
    "next": "^16.1.1",
    "next-auth": "^4.24.11",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "sonner": "^2.0.6",
    "tailwind-merge": "^3.3.1",
    "zod": "^4.0.2",
    "zustand": "^5.0.6"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@types/bcryptjs": "^3.0.0",
    "@types/node": "25.9.3",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "eslint": "^9",
    "eslint-config-next": "^16.1.1",
    "prisma": "^6.19.3",
    "tailwindcss": "^4",
    "tw-animate-css": "^1.3.5",
    "typescript": "^5"
  }
}
```

### Configuration Files

**next.config.ts**
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
```

**tsconfig.json** (key parts)
```json
{
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "strict": true,
    "noImplicitAny": false,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]
}
```

### NextAuth Type Augmentation

**File**: `src/types/next-auth.d.ts`

This is **critical** — without it, `session.user.id` is a TypeScript error and the entire app breaks.

```typescript
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      image: string | null;
    };
  }

  interface User {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    name: string;
    email: string;
    picture?: string | null;
  }
}
```

### Root Layout (`src/app/layout.tsx`)

```typescript
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "@/components/providers/session-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SplitEase - Split Expenses with Friends",
  description: "Easily split expenses with friends, track shared costs, and settle up seamlessly.",
  keywords: ["split expenses", "bill splitting", "shared costs", "group expenses", "settle up"],
  icons: { icon: "/favicon.ico" },
  openGraph: {
    title: "SplitEase - Split Expenses with Friends",
    description: "Easily split expenses with friends, track shared costs, and settle up seamlessly.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}>
        <SessionProvider>{children}</SessionProvider>
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}
```

### SessionProvider Wrapper (`src/components/providers/session-provider.tsx`)

```typescript
"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";

export function SessionProvider({ children }: { children: React.ReactNode }) {
  return <NextAuthSessionProvider>{children}</NextAuthSessionProvider>;
}
```

### Root Page — Conditional View Rendering (`src/app/page.tsx`)

```typescript
"use client";

import { useSession } from "next-auth/react";
import { AuthPage } from "@/components/auth/auth-page";
import { Dashboard } from "@/components/dashboard/dashboard";
import { GroupDetail } from "@/components/groups/group-detail";
import { ExpenseDetail } from "@/components/expenses/expense-detail";
import { AddExpenseDialog } from "@/components/expenses/add-expense-dialog";
import { SettleUpDialog } from "@/components/settlements/settle-up-dialog";
import { AddGroupDialog } from "@/components/groups/add-group-dialog";
import { useAppStore } from "@/lib/store";

export default function Home() {
  const { data: session, status } = useSession();
  const { currentView, selectedGroupId, selectedExpenseId, navigate, goBack } = useAppStore();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-teal-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
          <p className="text-muted-foreground font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

  return (
    <>
      {currentView === "dashboard" && (
        <Dashboard onNavigate={navigate} />
      )}
      {currentView === "group" && selectedGroupId && (
        <GroupDetail groupId={selectedGroupId} onNavigate={navigate} onBack={goBack} />
      )}
      {currentView === "expense-detail" && selectedExpenseId && (
        <ExpenseDetail expenseId={selectedExpenseId} onNavigate={navigate} onBack={goBack} />
      )}
      {currentView === "add-expense" && selectedGroupId && (
        <AddExpenseDialog groupId={selectedGroupId} onBack={goBack} />
      )}
      {currentView === "settle-up" && selectedGroupId && (
        <SettleUpDialog groupId={selectedGroupId} onBack={goBack} />
      )}
      {currentView === "add-group" && (
        <AddGroupDialog onBack={goBack} />
      )}
    </>
  );
}
```

### NextAuth Configuration (`src/lib/auth.ts`)

```typescript
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { db } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }
        const user = await db.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user) {
          throw new Error("No account found with this email");
        }
        const isPasswordValid = await compare(credentials.password, user.password);
        if (!isPasswordValid) {
          throw new Error("Invalid password");
        }
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: null,  // No avatar field — always null
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image;
      }
      if (trigger === "update" && session) {
        token.name = session.name;
        token.picture = session.image;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        session.user.image = token.picture as string | null;
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
    error: "/",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === "development",
};
```

### Database Client with .env Workaround (`src/lib/db.ts`)

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Workaround: The system environment may have a stale DATABASE_URL
// that overrides the .env file (e.g., pointing to a local SQLite file).
// Read the .env file directly and override if needed.
if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.startsWith('postgresql://')) {
  try {
    const fs = require('fs')
    const path = require('path')
    const envPath = path.join(process.cwd(), '.env')
    const envContent = fs.readFileSync(envPath, 'utf8')
    const match = envContent.match(/DATABASE_URL=(.+)/)
    if (match && match[1].trim().startsWith('postgresql://')) {
      process.env.DATABASE_URL = match[1].trim()
    }
  } catch {
    // Ignore read errors
  }
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

export default db
```

### Utility (`src/lib/utils.ts`)

```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### Zustand Store (`src/lib/store.ts`)

```typescript
import { create } from "zustand";

export type View =
  | "dashboard"
  | "group"
  | "expense-detail"
  | "add-expense"
  | "settle-up"
  | "add-group";

interface AppState {
  currentView: View;
  selectedGroupId: string | null;
  selectedExpenseId: string | null;
  navigate: (view: View, id?: string | null) => void;
  goBack: () => void;
  viewHistory: { view: View; groupId: string | null; expenseId: string | null }[];
}

export const useAppStore = create<AppState>((set, get) => ({
  currentView: "dashboard",
  selectedGroupId: null,
  selectedExpenseId: null,
  viewHistory: [],
  navigate: (view, id = null) => {
    const state = get();
    set({
      viewHistory: [
        ...state.viewHistory,
        {
          view: state.currentView,
          groupId: state.selectedGroupId,
          expenseId: state.selectedExpenseId,
        },
      ],
      currentView: view,
      ...(view === "group" ? { selectedGroupId: id } : {}),
      ...(view === "expense-detail" ? { selectedExpenseId: id } : {}),
      ...(view === "add-expense" ? { selectedGroupId: id || state.selectedGroupId } : {}),
      ...(view === "settle-up" ? { selectedGroupId: id || state.selectedGroupId } : {}),
    });
  },
  goBack: () => {
    const state = get();
    const lastView = state.viewHistory[state.viewHistory.length - 1];
    if (lastView) {
      set({
        currentView: lastView.view,
        selectedGroupId: lastView.groupId,
        selectedExpenseId: lastView.expenseId,
        viewHistory: state.viewHistory.slice(0, -1),
      });
    } else {
      set({ currentView: "dashboard", selectedGroupId: null, selectedExpenseId: null });
    }
  },
}));
```

**Navigation logic**:
- `navigate("group", groupId)` — pushes current view to history, sets selectedGroupId
- `navigate("expense-detail", expenseId)` — pushes current view to history, sets selectedExpenseId
- `navigate("add-expense", groupId)` — preserves selectedGroupId if no id passed
- `navigate("settle-up", groupId)` — preserves selectedGroupId if no id passed
- `navigate("add-group")` — no id needed
- `navigate("dashboard")` — pushes current view to history
- `goBack()` — pops from history stack, restores previous view + IDs, or goes to dashboard if stack is empty

### API Route Implementations

> **Critical Next.js 16 pattern**: Dynamic route params are now async. Use `{ params }: { params: Promise<{ id: string }> }` and `const { id } = await params;` instead of the old synchronous params pattern.

#### POST /api/auth/signup (`src/app/api/auth/signup/route.ts`)

```typescript
const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(50, "Name must be less than 50 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").max(100, "Password must be less than 100 characters"),
});
```
- Validates with Zod v4 using the schema above
- Checks for existing user by email → 409 if exists
- Hashes password with `bcryptjs` hash(password, 12)
- Creates user with `db.user.create` selecting only `id, name, email, createdAt`
- Returns `{ message, user }` on 201, `{ error }` on failure

#### POST /api/auth/[...nextauth] (`src/app/api/auth/[...nextauth]/route.ts`)

```typescript
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

#### POST /api/groups (`src/app/api/groups/route.ts`)

- Validates: `name` required string, `memberEmails` must be string array
- Finds users by email → 404 if any emails not found with message "Users not found: email1, email2"
- Filters out creator from memberEmails (they'll be added as admin)
- Creates group with nested `members.create`: creator as `{ userId, role: "admin" }`, others as `{ userId, role: "member" }`
- Includes members with user details and creator in response

#### GET /api/groups (`src/app/api/groups/route.ts`)

- Finds all groups where user is a member (`members.some: { userId }`)
- Includes members (with user), expenses (only id and amount), creator
- Computes `expenseCount` and `totalExpenses` for each group
- Orders by `updatedAt: "desc"`

#### GET /api/groups/[groupId] (`src/app/api/groups/[groupId]/route.ts`)

- Checks membership via `groupMember.findUnique` with `groupId_userId` compound unique
- Returns group with members (ordered by `joinedAt: "asc"`), creator, expenses (last 20, ordered `createdAt: "desc"`) with paidBy and splits
- **Calculates group balances**:
  1. Initialize `balances[userId] = 0` for all members
  2. For each expense: `balances[paidById] += amount`, `balances[split.userId] -= split.amount`
  3. Subtract settlements: `balances[fromUserId] += amount`, `balances[toUserId] -= amount`
  4. Separate into creditors (>0.01) and debtors (<-0.01, take abs)
  5. Sort both by amount descending
  6. Greedy match: `amount = Math.min(debtor.amount, creditor.amount)`, round to 2 decimals
  7. Return `{ group, balances, simplifiedDebts }`

#### POST /api/groups/[groupId]/members

- Any group member can add (checks requester membership)
- Finds user by email → 404 if not found
- Checks for existing membership → 409 if already member
- Creates GroupMember with role "member"

#### DELETE /api/groups/[groupId]/members

- Only admin can remove (checks `requesterMembership.role !== "admin"` → 403)
- Cannot remove admin (checks `targetMembership.role === "admin"` → 400)
- Deletes by `groupMember.id`

#### POST /api/expenses (`src/app/api/expenses/route.ts`)

- Validates: groupId, description, amount (>0), splitType (equal|unequal|percent|shares), paidById, splits (non-empty array)
- Checks user is group member
- Checks payer is group member
- **Split calculation by type**:
  - **equal**: `splitAmount = round(amount / splits.length, 2)`, add rounding remainder to first split
  - **unequal**: Uses `s.amount ?? 0` directly
  - **percent**: `amount = round(amount * pct / 100, 2)`, stores percent
  - **shares**: `totalShares = sum of all shares`, `amount = round(totalAmount * shares / totalShares, 2)`, add rounding remainder to first split
- Validates split total equals expense amount (within 0.01 tolerance)
- Verifies all split users are group members
- Creates expense + splits in `db.$transaction`

#### GET /api/expenses?groupId=

- Checks membership, returns expenses with paidBy, splits, and `_count.chatMessages`

#### GET /api/expenses/[expenseId]

- Returns expense with paidBy, splits, chatMessages (ordered `createdAt: "asc"`), and group with member userIds
- Checks if user is member of the expense's group

#### DELETE /api/expenses/[expenseId]

- Only the payer (`expense.paidById === session.user.id`) or group admin can delete
- Cascade deletes splits and chat messages

#### POST /api/expenses/[expenseId]/chat

- Checks expense exists and user is group member
- Creates chatMessage with `userId: session.user.id`
- Returns `{ chatMessage }` with user details on 201

#### GET /api/expenses/[expenseId]/chat

- Checks expense exists and user is group member
- Returns chatMessages ordered `createdAt: "asc"` with user details

#### GET /api/balances (`src/app/api/balances/route.ts`)

- Gets all user's groupIds
- Fetches all expenses (with splits) and settlements across those groups
- **Balance calculation per group**:
  - `totalOwed`: Sum of expense amounts where user is payer + sum of settlement amounts where user is receiver (subtracted)
  - `totalOwing`: Sum of split amounts where user has a split + sum of settlement amounts where user is payer (subtracted)
  - More precisely:
    - For each expense where `paidById === userId`: `totalOwed += expense.amount`
    - For each expense where user has a split: `totalOwing += split.amount`
    - For each settlement where `fromUserId === userId`: `totalOwing -= settlement.amount`
    - For each settlement where `toUserId === userId`: `totalOwed -= settlement.amount`
  - `netBalance = totalOwed - totalOwing`
- Returns `{ totalOwed, totalOwing, netBalance, groupBalances[] }`

#### GET /api/balances/[groupId]

- Same balance algorithm as above but for a single group
- Also computes simplified debts with names (using greedy algorithm)
- Returns `{ groupId, memberBalances[], simplifiedDebts[], yourBalance }`

#### POST /api/settlements

- Validates: groupId, toUserId, amount (>0)
- Cannot settle with yourself → 400
- Both users must be group members
- Creates settlement with `fromUserId: session.user.id`
- Returns `{ settlement }` with fromUser and toUser on 201

#### GET /api/settlements?groupId=

- Filters by `OR: [{ fromUserId }, { toUserId }]` (user is either sender or receiver)
- Optional `groupId` filter
- Returns settlements ordered `createdAt: "desc"` with fromUser and toUser details

### Component Implementation Details

#### Component Data Types (TypeScript Interfaces)

```typescript
// Dashboard
interface GroupData {
  id: string;
  name: string;
  description: string | null;
  members: { user: { id: string; name: string; email: string } }[];
  expenseCount: number;
  totalExpenses: number;
}

interface BalanceData {
  totalOwed: number;
  totalOwing: number;
  netBalance: number;
  groupBalances: {
    groupId: string;
    groupName: string;
    owed: number;
    owing: number;
    netBalance: number;
    members: { user: { id: string; name: string; email: string } }[];
  }[];
}

// GroupDetail
interface GroupDetailData {
  id: string;
  name: string;
  description: string | null;
  createdBy: string;
  members: {
    id: string;
    userId: string;
    role: string;
    user: { id: string; name: string; email: string };
  }[];
  expenses: {
    id: string;
    description: string;
    amount: number;
    splitType: string;
    createdAt: string;
    paidBy: { id: string; name: string };
  }[];
}

interface GroupBalanceData {
  groupId: string;
  simplifiedDebts: { from: string; fromName: string; to: string; toName: string; amount: number }[];
  memberBalances: { userId: string; name: string; balance: number }[];
  yourBalance: number;
}

interface Settlement {
  id: string;
  amount: number;
  note: string | null;
  createdAt: string;
  fromUser: { id: string; name: string; email: string };
  toUser: { id: string; name: string; email: string };
}

// ExpenseDetail
interface ChatMsg {
  id: string;
  message: string;
  createdAt: string;
  user: { id: string; name: string; email: string };
}

interface ExpenseData {
  id: string;
  description: string;
  amount: number;
  currency: string;
  splitType: string;
  createdAt: string;
  paidBy: { id: string; name: string; email: string };
  splits: {
    id: string;
    amount: number;
    percent: number | null;
    shares: number | null;
    user: { id: string; name: string; email: string };
  }[];
  chatMessages: ChatMsg[];
}

// AddExpenseDialog
interface GroupMember {
  id: string;
  userId: string;
  role: string;
  user: { id: string; name: string; email: string };
}

interface SplitEntry {
  userId: string;
  name: string;
  amount: number;
  percent: number;
  shares: number;
  included: boolean;
}
```

#### Component Props

```typescript
// Dashboard
Dashboard({ onNavigate }: { onNavigate: (view: View, id?: string | null) => void })

// GroupDetail
GroupDetail({ groupId, onNavigate, onBack }: {
  groupId: string;
  onNavigate: (view: View, id?: string | null) => void;
  onBack: () => void;
})

// ExpenseDetail
ExpenseDetail({ expenseId, onNavigate, onBack }: {
  expenseId: string;
  onNavigate: (view: View, id?: string | null) => void;
  onBack: () => void;
})

// AddExpenseDialog
AddExpenseDialog({ groupId, onBack }: { groupId: string; onBack: () => void })

// SettleUpDialog
SettleUpDialog({ groupId, onBack }: { groupId: string; onBack: () => void })

// AddGroupDialog
AddGroupDialog({ onBack }: { onBack: () => void })
```

### Scaledrone + Polling Chat Integration

This is the most complex part of the frontend. Located in `src/components/expenses/expense-detail.tsx`.

**Constants:**
```typescript
const SCALEDRONE_CHANNEL_ID = "your-scaledrone-channel-id";
const POLL_INTERVAL = 3000; // 3 seconds
```

**Architecture:**
1. On mount, start polling immediately via `setInterval(pollNewMessages, POLL_INTERVAL)`
2. Dynamically load Scaledrone SDK by creating a `<script>` tag pointing to `https://cdn.scaledrone.com/scaledrone.min.js`
3. Once loaded, connect to Scaledrone with the channel ID
4. On `drone.on("open")`, subscribe to room `expense-${expenseId}`
5. On `room.on("data")`, if `data.type === "chat"`, add message to state (deduplicate by ID)

**Sending a message:**
1. POST to `/api/expenses/${expenseId}/chat` with `{ message }`
2. If Scaledrone is connected, publish `{ room: "expense-${expenseId}", message: { type: "chat", message: chatMessageObject } }`
3. Add the returned `chatMessage` to local state (deduplicate)

**Polling fallback:**
- Fetches GET `/api/expenses/${expenseId}` every 3 seconds
- Extracts `chatMessages` from response
- Filters out messages already in state by ID comparison
- Appends only new messages

**Cleanup on unmount:**
- Clear polling interval
- Close Scaledrone connection
- Reset connection ref

**Refs used:**
- `droneRef` — Scaledrone instance
- `roomRef` — Scaledrone room subscription
- `pollRef` — setInterval timer ID
- `connectedRef` — boolean tracking Scaledrone connection status
- `chatContainerRef` — div ref for auto-scrolling

### Auth Page UI Details

**Layout**: Split-screen — left half has branding (hidden on mobile), right half has auth forms.

**Left panel** (`hidden lg:flex lg:w-1/2`):
- Background: `bg-gradient-to-br from-emerald-600 via-teal-600 to-emerald-700`
- Decorative blur circles (white/10, teal/10, emerald/10)
- Logo: Users icon in rounded square + "SplitEase" title
- Headline: "Split expenses with friends, hassle-free."
- Three feature items: Smart Splitting (Calculator), Real-time Chat (MessageSquare), Easy Settlement (Handshake)

**Right panel** (`flex-1`):
- Mobile-only logo (hidden on lg+)
- Tabs: "Sign In" / "Create Account"
- Login form: email + password + "Sign In" button (emerald)
- Signup form: name + email + password + confirm password + "Create Account" button (emerald)
- Auto-login after signup: calls `signIn("credentials", { email, password, redirect: false })`
- Terms of service text at bottom

### Dashboard UI Details

**Header**: Sticky, `bg-white/80 backdrop-blur-lg`, SplitEase logo + "New Group" button + user avatar dropdown (sign out)

**Balance Summary**: 3 cards in a row (`sm:grid-cols-3`):
1. "You are owed" — emerald gradient card, TrendingUp icon, ₹ amount
2. "You owe" — orange-red gradient card, TrendingDown icon, ₹ amount
3. "Net balance" — white card, ArrowUpRight/ArrowDownRight/Minus icon, color-coded amount (+green, -red)

**Groups + Sidebar** (`lg:grid-cols-3`):
- Left 2/3: Groups list — cards with icon, name, member count, expense count, balance amount, avatar stack (max 3 + "+N" badge), chevron
- Right 1/3: Balance Summary sidebar — per-group name + net balance, separated by dividers

**Empty states**: Dashed border cards with icons + action buttons

### GroupDetail UI Details

**Tabs**: Expenses / Balances / Members (using shadcn Tabs)

**Expenses tab**: Grid (`md:grid-cols-2`) of expense cards with Receipt icon, description, paid-by name, date, ₹ amount, split type badge, 3-dot menu (delete). Delete restricted to payer or admin.

**Balances tab**: Simplified debts list with avatar → name → ₹ amount → arrow → name → avatar. "Settle Up" button. Settlement history below.

**Members tab**: Grid (`sm:grid-cols-2 lg:grid-cols-3`) of member cards with avatar, name, email, role badge. "Add Member" dialog (email input). Remove button for admins only.

### ExpenseDetail UI Details

**2-column layout** (`lg:grid-cols-2`):
- Left: Expense info card — Receipt icon, ₹ amount (large), paid-by name, split type badge, separator, split details (per-person with avatar, name, amount, percent/shares, "You" badge for current user, emerald highlight)
- Right: Chat card — MessageSquare icon header, scrollable message area (200px min / 300px max mobile / 500px desktop), input bar at bottom

### AddExpenseDialog UI Details

**Form fields**: Description, Amount (₹ prefix), Paid-by (member avatar buttons), Split type tabs (4 columns), Per-member rows with checkbox + avatar + name + type-specific input, Split summary (total vs. split total with color-coded validation)

**Split validation**:
- Equal: Auto-calculated per person
- Unequal: Sum of amounts should equal total
- Percent: Must total 100% (shown in red if not)
- Shares: Auto-calculated proportionally

### SettleUpDialog UI Details

**Two sections**:
1. Suggested Settlements — clickable cards from simplified debts where user is debtor, auto-fills recipient and amount
2. Manual Payment Form — direction indicator (You → Recipient with avatars), recipient selector (member buttons), amount (₹ prefix), note (optional textarea)

### AddGroupDialog UI Details

**Form fields**: Group name, Description (textarea), Add Members by Email (input + add button, chips with X remove)

**Validation**: Name required, emails must contain "@", no duplicate emails

### Common UI Patterns

**Loading spinner**: `<div className="h-10/h-12 w-10/w-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />`

**Sticky header**: `sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-border/50`

**Footer**: `mt-auto border-t bg-white/80 backdrop-blur-sm` with centered "SplitEase — Split Expenses with Friends" text

**Page wrapper**: `min-h-screen flex flex-col` (ensures footer sticks to bottom)

**Content container**: `max-w-6xl mx-auto px-4 sm:px-6 lg:px-8` (dashboard/group detail) or `max-w-2xl` (forms)

**Avatar initials helper** (used in every component):
```typescript
const getInitials = (name: string) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
```

**Toast notifications**: Using Sonner — `toast.error(message)`, `toast.success(message)`, positioned `top-center` with `richColors`

### File Structure

```
src/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   └── api/
│       ├── auth/
│       │   ├── [...nextauth]/route.ts
│       │   └── signup/route.ts
│       ├── balances/
│       │   ├── route.ts
│       │   └── [groupId]/route.ts
│       ├── expenses/
│       │   ├── route.ts
│       │   └── [expenseId]/
│       │       ├── route.ts
│       │       └── chat/route.ts
│       ├── groups/
│       │   ├── route.ts
│       │   └── [groupId]/
│       │       ├── route.ts
│       │       └── members/route.ts
│       └── settlements/route.ts
├── components/
│   ├── auth/auth-page.tsx
│   ├── dashboard/dashboard.tsx
│   ├── expenses/
│   │   ├── add-expense-dialog.tsx
│   │   └── expense-detail.tsx
│   ├── groups/
│   │   ├── add-group-dialog.tsx
│   │   └── group-detail.tsx
│   ├── providers/session-provider.tsx
│   ├── settlements/settle-up-dialog.tsx
│   └── ui/
│       ├── avatar.tsx
│       ├── badge.tsx
│       ├── button.tsx
│       ├── card.tsx
│       ├── dialog.tsx
│       ├── dropdown-menu.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── separator.tsx
│       ├── sonner.tsx
│       ├── tabs.tsx
│       └── textarea.tsx
├── lib/
│   ├── auth.ts
│   ├── db.ts
│   ├── store.ts
│   └── utils.ts
└── types/
    └── next-auth.d.ts
```
