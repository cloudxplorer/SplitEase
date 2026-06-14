# BUILD_PLAN.md — SplitEase Build Plan

---

## 1. Product Research

### How We Studied Splitwise
- Explored the Splitwise web app and mobile app to understand core user flows
- Identified the primary features: groups, expenses, splits, balances, settlements, and chat
- Studied the Splitwise UI patterns: dashboard with balance summary, group detail with tabs, expense detail with chat
- Analyzed the split types offered: equal, unequal, by percentage, by shares

### What We Learned
1. **Simplicity is key**: Splitwise's success comes from making expense splitting dead simple
2. **Balance visualization matters**: Users need to see at a glance who owes whom
3. **Debt simplification**: Instead of showing every pairwise debt, Splitwise minimizes the number of transactions needed to settle all debts
4. **Real-time chat**: Users discuss expenses in context — within the expense detail view, not in a separate chat
5. **Group-centric**: Everything revolves around groups. Expenses belong to groups, balances are per-group, settlements happen within groups

### Workflows Identified
1. **New User**: Sign up → Create first group → Add members → Add first expense → See balance
2. **Regular User**: Log in → Check dashboard for balances → Open group → Review expenses → Settle up
3. **Expense Discussion**: Open expense → Chat with group members → Clarify splits
4. **Debt Settlement**: Check balances → Click settle up → Choose recipient → Record payment

### Product Assumptions
1. Users will primarily be Indian (INR currency)
2. Groups will be small (2-10 members) — no need for complex pagination
3. Users already know each other's email addresses (invite by email)
4. All expenses in a group use the same currency
5. Chat is lightweight and informal — no need for threads, reactions, or attachments
6. Users trust each other — no expense approval workflow needed
7. Mobile-first usage — responsive design is critical

---

## 2. Architecture

### Tech Stack
| Layer | Technology | Justification |
|-------|-----------|---------------|
| Framework | Next.js 16 (App Router) | Full-stack framework with API routes, SSR, and great DX |
| Language | TypeScript 5 | Type safety, better IDE support, fewer runtime bugs |
| Styling | Tailwind CSS v4 + shadcn/ui | Rapid UI development, consistent design system |
| Database | Neon PostgreSQL | Serverless Postgres with auto-scaling, free tier |
| ORM | Prisma v6 | Type-safe database access, migrations, great DX |
| Auth | NextAuth.js v4 (Credentials) | Simple email/password auth with JWT sessions |
| Real-time | Scaledrone | Managed WebSocket service, no infrastructure needed |
| State | Zustand | Lightweight, simple API, perfect for view navigation |
| Validation | Zod v4 | Schema validation on both client and server |
| Hashing | bcryptjs | Industry-standard password hashing (12 salt rounds) |
| Toasts | Sonner | Beautiful, accessible toast notifications |
| Icons | Lucide React | Consistent, lightweight icon library |
| Deploy | Vercel | Seamless Next.js deployment with GitHub integration |

### Database Schema (ER Diagram)
```
User ──1:N──> Group (creator)
User ──N:N──> Group (via GroupMember)
Group ──1:N──> Expense
User ──1:N──> Expense (payer)
Expense ──1:N──> ExpenseSplit
User ──1:N──> ExpenseSplit
Group ──1:N──> Settlement
User ──1:N──> Settlement (from)
User ──1:N──> Settlement (to)
Expense ──1:N──> ChatMessage
User ──1:N──> ChatMessage
```

Key design decisions:
- **CUID** for all primary keys (shorter than UUID, still unique)
- **Cascade deletes** on GroupMember, Expense, ExpenseSplit, ChatMessage (deleting a group removes all related data)
- **Unique constraint** on `[groupId, userId]` in GroupMember (can't be in a group twice)
- **Unique constraint** on `[expenseId, userId]` in ExpenseSplit (each user has one split per expense)
- **`currency` defaults to "INR"** on Expense and Settlement models
- **No `avatar` field** on User (simplified for MVP)

### API Design
All API routes follow REST conventions:
- **GET** for fetching data
- **POST** for creating resources
- **DELETE** for removing resources
- All routes validate authentication via `getServerSession()`
- All routes return `{ error: string }` on failure
- Split calculation happens server-side in `POST /api/expenses`
- Balance calculation happens server-side in `GET /api/balances` and `GET /api/balances/[groupId]`
- Debt simplification uses a greedy algorithm (sort creditors and debtors by amount, match them up)

### Frontend Structure
- **Single-page app**: All views rendered conditionally in `src/app/page.tsx`
- **Zustand store**: Manages current view, selected IDs, and navigation history
- **6 views**: dashboard, group, expense-detail, add-expense, settle-up, add-group
- **Component organization**: `auth/`, `dashboard/`, `groups/`, `expenses/`, `settlements/`
- **Shared UI**: shadcn/ui components in `src/components/ui/`
- **Responsive design**: Mobile-first with Tailwind breakpoints
- **Color scheme**: Emerald primary, orange-red for debts, green for positive balances

### Deployment Approach
1. **Development**: Local `bun run dev` on port 3000
2. **Version Control**: Git + GitHub
3. **Hosting**: Vercel (connected to GitHub repo)
4. **Database**: Neon PostgreSQL (serverless, auto-scaling)
5. **Real-time**: Scaledrone (managed WebSocket service)
6. **CI/CD**: Vercel auto-deploys on push to main branch
7. **Environment Variables**: Set in Vercel dashboard

---

## 3. AI Collaboration Process

### How We Instructed the AI
We used the AI (ChatGPT v5.1) as a junior engineer following the assignment's required initial prompt. The exact prompt pasted into the AI was:

> "You are a junior engineer helping me complete an internship assignment. The assignment is to reverse engineer Splitwise, scope a realistic 3-day version, and build a working deployed app. Important instructions: 1. Do not assume product requirements. 2. Do not jump directly into implementation. 3. Ask me detailed questions about product scope, UX, workflows, edge cases, and engineering decisions. 4. Ask about every implementation detail needed to build the app. 5. After each answer I give, update a Markdown file called AI_CONTEXT.md. 6. AI_CONTEXT.md must become the source of truth for the entire project. 7. The final app must be buildable from AI_CONTEXT.md. 8. Another evaluator should be able to paste AI_CONTEXT.md into the same AI tool and recreate a similar app. 9. Before writing code, produce a build plan based only on the agreed context. 10. During implementation, keep updating AI_CONTEXT.md whenever requirements, architecture, schema, UI, or logic changes. 11. Do not recommend technical solutions. Your job is to let me think through the technical solution. Start by interviewing me. Ask questions across: product goals, Splitwise research, core workflows, user personas, MVP scope, out-of-scope features, data model, authentication, groups, expenses, settlements, balance calculation, UI screens, routing, frontend architecture, backend architecture, database choice, API design, deployment, testing, known risks, tradeoffs. Do not give me a final plan until you have asked enough questions."

The AI was instructed to:
1. Not assume product requirements
2. Ask detailed questions about product scope, UX, workflows, edge cases, and engineering decisions
3. Update AI_CONTEXT.md after each answer
4. Not recommend technical solutions — let the user think through them
5. Produce a build plan based only on agreed context
6. Keep updating AI_CONTEXT.md whenever requirements, architecture, schema, UI, or logic changes

### What Questions the AI Asked
The AI conducted a 15-round interview across all the required categories. The complete prompts and AI responses transcript is documented in **AI_CONTEXT.md** under "Prompts and AI Responses (Interview Transcript)". Here is a summary of the questions asked:

**Round 1 — Product Goals & Splitwise Research:**
- Is this a full Splitwise clone or a simplified version?
- How did you study Splitwise? What features stood out?
- What workflows are essential for the MVP?

**Round 2 — User Personas & MVP Scope:**
- Who are the target users?
- What is strictly in scope for the 3-day MVP?
- What is out of scope?

**Round 3 — Data Model:**
- What entities are needed in the database?
- How do users relate to groups?
- How are expenses structured?
- How do settlements work in the data model?
- How is chat stored?
- Should the User model have an avatar field?

**Round 4 — Authentication:**
- How should authentication work?
- How should passwords be handled?
- What happens after signup?

**Round 5 — Groups:**
- How are groups created and managed?
- How are members added to existing groups?
- Who can remove members?
- Should there be a limit on group size?

**Round 6 — Expenses & Splits:**
- What split types are needed and how should each work?
- Who can create and delete expenses?
- Should all members be included in a split by default?
- Where should split amount calculations happen?

**Round 7 — Settlements & Balance Calculation:**
- How should balances be calculated?
- How should debts be simplified?
- How does the settle-up feature work?

**Round 8 — UI Screens & Routing:**
- What screens/views are needed?
- How should navigation work?
- What's the color scheme and design language?

**Round 9 — Frontend Architecture:**
- Should components be server or client components?
- How should data be fetched?
- What UI component library?

**Round 10 — Backend Architecture & Database:**
- What framework and database?
- Why Neon PostgreSQL over SQLite or MySQL?
- Any special considerations for the database connection?

**Round 11 — API Design:**
- How should the API routes be structured?
- Should there be rate limiting or input sanitization?

**Round 12 — Real-time Chat:**
- How should real-time chat work?
- What if Scaledrone fails or is unreliable?
- What should the chat UI look like?

**Round 13 — Deployment:**
- Where and how should the app be deployed?
- What's the deployment workflow?

**Round 14 — Testing & Known Risks:**
- What testing strategy do you want?
- What are the known risks and how will you mitigate them?

**Round 15 — Tradeoffs & Final Decisions:**
- What are the biggest tradeoffs you're making?
- What would you improve with more time?

### How We Answered
For each question, I provided specific, opinionated answers that directed the implementation. Key answers included:
- Defined a clear MVP scope (no social login, no notifications, no offline support)
- Chose Next.js 16 with App Router for the framework
- Selected Neon PostgreSQL + Prisma for the database layer
- Picked NextAuth.js v4 with credentials provider for authentication
- Chose Scaledrone for real-time chat (zero infrastructure)
- Specified INR (₹) as the currency for the Indian user base
- Decided on single-page architecture with Zustand for navigation
- Requested responsive design (mobile-first, scales to desktop)
- Required 4 split types: equal, unequal, percentage, shares
- No avatar field on User model (use initials-based avatars)
- Server-side split calculations to prevent client manipulation
- 3-second polling fallback alongside Scaledrone for chat reliability
- Greedy algorithm for debt simplification

The full transcript of every prompt and AI response is in **AI_CONTEXT.md → "Prompts and AI Responses (Interview Transcript)"**.

### How the Plan Evolved
1. **Initial plan**: Basic Splitwise clone with page-based routing
2. **Iteration 1**: Switched to single-page Zustand navigation for better UX
3. **Iteration 2**: Added Scaledrone for real-time chat (not in original plan)
4. **Iteration 3**: Removed `avatar` field after signup crash
5. **Iteration 4**: Changed currency from USD to INR per user request
6. **Iteration 5**: Added polling fallback for chat reliability
7. **Iteration 6**: Full responsive redesign of all post-login pages

### How AI_CONTEXT.md Was Maintained
- Created at project start with initial product scope and architecture
- Updated after each major decision (tech stack, schema design, split logic)
- Updated after each bug fix (avatar removal, currency change, chat fix)
- Updated after responsive redesign
- This file serves as the source of truth — another AI agent should be able to recreate the same app from it

---

## 4. Tradeoffs

### What We Simplified
1. **No URL-based routing**: Zustand state management instead of Next.js pages — simpler but no deep linking
2. **No avatar/profile pictures**: User initials only — removed to fix signup crash, not worth the complexity for MVP
3. **No expense editing**: Can only create or delete — editing splits is complex (need to recalculate balances)
4. **No search/filter**: Fetching all data at once is fine for small groups (2-10 members)
5. **No pagination**: All records fetched in single queries — acceptable for MVP scale
6. **No notifications**: Users must check the app manually — no push/email alerts
7. **Chat is per-expense only**: No group chat or direct messages — keeps chat scoped to its purpose

### What We Hardcoded
1. **Currency**: ₹ (INR) is hardcoded throughout — no multi-currency support
2. **Scaledrone Channel ID**: Hardcoded in component and .env — no dynamic channel creation
3. **Balance calculation**: Simplified greedy algorithm — doesn't always produce the absolute minimum number of transactions, but is good enough
4. **Session duration**: 30-day JWT expiry — not configurable by users
5. **Polling interval**: 3-second chat polling — not configurable

### What We Avoided
1. **Server Components**: All components are client-side — simpler but less performant
2. **Custom WebSocket server**: Used Scaledrone instead — zero infrastructure but less control
3. **Image uploads**: No receipt photos or profile pictures — would need cloud storage (S3/Cloudinary)
4. **Email verification**: No confirmation email after signup — reduces friction but less secure
5. **Rate limiting**: No API rate limiting — acceptable for MVP but needed for production
6. **Automated testing**: Skipped unit/integration/E2E tests for speed — high regression risk

### What We Would Improve With More Time
1. **Proper URL routing**: Switch from Zustand navigation to Next.js App Router pages with dynamic routes (`/groups/[id]`, `/expenses/[id]`)
2. **Server Components**: Move data fetching to server-side for better performance and SEO
3. **Custom WebSocket server**: Replace Scaledrone with a Socket.io server for full control over real-time communication
4. **Profile pictures**: Add image upload with Cloudinary integration
5. **Expense editing**: Allow users to modify expense details and recalculate splits
6. **Notifications**: Add push notifications (Firebase) or email alerts (SendGrid) for new expenses and messages
7. **Multi-currency**: Support multiple currencies with real-time conversion rates
8. **Recurring expenses**: Allow users to set up automatic recurring splits (monthly rent, subscriptions)
9. **Search and filter**: Add search across groups, expenses, and members
10. **Pagination**: Implement cursor-based pagination for large datasets
11. **Automated tests**: Add Jest unit tests, React Testing Library component tests, and Playwright E2E tests
12. **Rate limiting**: Add API rate limiting with `next-rate-limiter` or similar
13. **Activity feed**: Show a timeline of recent activity in each group
14. **Export**: Allow users to export expense data as CSV or PDF
15. **Admin transfer**: Allow group admins to transfer admin role to another member
