# PROMPTS.md — AI Reproduction Prompts for SplitEase

This file contains all key prompts used during the development of SplitEase, starting with the **Required Initial Prompt** from the assignment, followed by the step-by-step reproduction prompts. Use these prompts to recreate the SplitEase project from scratch using AI coding assistants.

---

## Prompt 0: Required Initial Prompt (From Assignment)

This is the exact initial prompt provided in the internship assignment PDF. This prompt was pasted into the AI tool to start the project. It instructs the AI to act as a junior engineer that asks questions before building, and to maintain AI_CONTEXT.md as the source of truth throughout the project.

```
You are a junior engineer helping me complete an internship assignment.
The assignment is to reverse engineer Splitwise, scope a realistic 3-day version,
and build a working deployed app.
Important instructions:
1. Do not assume product requirements.
2. Do not jump directly into implementation.
3. Ask me detailed questions about product scope, UX, workflows, edge cases, and engineering decisions.
4. Ask about every implementation detail needed to build the app.
5. After each answer I give, update a Markdown file called AI_CONTEXT.md.
6. AI_CONTEXT.md must become the source of truth for the entire project.
7. The final app must be buildable from AI_CONTEXT.md.
8. Another evaluator should be able to paste AI_CONTEXT.md into the same AI tool and recreate a similar app.
9. Before writing code, produce a build plan based only on the agreed context.
10. During implementation, keep updating AI_CONTEXT.md whenever requirements, architecture, schema, UI, or logic changes.
11. Do not recommend technical solutions. Your job is to let me think through the technical solution.
Start by interviewing me.
Ask questions across:
- product goals
- Splitwise research
- core workflows
- user personas
- MVP scope
- out-of-scope features
- data model !IMPORTANT!
- authentication
- groups
- expenses
- settlements
- balance calculation
- UI screens
- routing
- frontend architecture
- backend architecture
- database choice
- API design
- deployment
- testing
- known risks
- tradeoffs
Do not give me a final plan until you have asked enough questions.
```

---

## Prompt 1: Project Initialization & Database Setup

```
Create a Next.js 16 project with TypeScript and Tailwind CSS v4 called "SplitEase" — an expense-splitting app targeting Indian users (currency: INR/₹).

Set up the following:
1. Install these dependencies: prisma, @prisma/client, next-auth@4, bcryptjs, zod, zustand, sonner, and shadcn/ui components (button, card, input, label, tabs, badge, avatar, separator, dialog, dropdown-menu, textarea)
2. Configure Prisma with Neon PostgreSQL. The schema should have these models:
   - User (id, name, email, password, createdAt, updatedAt) — NO avatar field
   - Group (id, name, description, createdBy, createdAt, updatedAt) with members relation
   - GroupMember (id, groupId, userId, role, joinedAt) with user and group relations
   - Expense (id, groupId, description, amount, currency [default "INR"], splitType [default "equal"], paidById, createdAt, updatedAt) with splits and group relations
   - ExpenseSplit (id, expenseId, userId, amount, percent, shares) with user and expense relations
   - Settlement (id, groupId, fromUserId, toUserId, amount, currency [default "INR"], note, createdAt) with fromUser, toUser, group relations
   - ChatMessage (id, expenseId, userId, message, createdAt) with user and expense relations
3. Create a Prisma client singleton at src/lib/db.ts that reads DATABASE_URL from .env file (with a workaround: if the system DATABASE_URL doesn't start with "postgresql://", read it from the .env file directly using fs.readFileSync)
4. Push the schema to the database
5. Add "postinstall": "prisma generate" to package.json scripts

Environment variables (.env):
DATABASE_URL=postgresql://username:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
   NEXTAUTH_SECRET=your-secret-key-here
   NEXTAUTH_URL=http://localhost:3000
   SCALEDRONE_CHANNEL_ID=your-scaledrone-channel-id
```

---

## Prompt 2: Authentication System

```
Build the authentication system for the SplitEase expense-splitting app:

1. Create NextAuth.js v4 configuration at src/lib/auth.ts with:
   - Credentials provider (email + password)
   - bcryptjs password comparison
   - JWT session strategy (30-day expiry)
   - Custom session callback to include user id, name, email
   - Custom JWT callback to store id, name, email, picture
   - Set image: null in authorize() (no avatar field on User model)
   - Debug enabled in development
   - Secret from process.env.NEXTAUTH_SECRET
   - Custom pages: signIn: "/", error: "/"

2. Create the NextAuth API route at src/app/api/auth/[...nextauth]/route.ts

3. Create the signup API route at src/app/api/auth/signup/route.ts:
   - Validate input with Zod v4 (name: 2-50 chars, email: valid, password: 6-100 chars)
   - Check if email already exists (return 409)
   - Hash password with bcryptjs (salt rounds 12)
   - Create user in database (select: id, name, email, createdAt — NO avatar)
   - Return user with 201 status (never return password)

4. Create auth page component at src/components/auth/auth-page.tsx:
   - Split-screen layout: branding left (hidden on mobile), auth forms right
   - Login tab: email + password fields, sign in button
   - Signup tab: name + email + password + confirm password fields, create account button
   - Auto-login after successful signup using signIn("credentials", {...})
   - Beautiful emerald/teal gradient branding with feature highlights
   - Responsive: single column on mobile, split layout on desktop

5. Wrap the app with SessionProvider at src/components/providers/session-provider.tsx

6. Add Sonner Toaster to the root layout (src/app/layout.tsx)
```

---

## Prompt 3: Groups Feature

```
Build the Groups feature for the SplitEase expense-splitting app:

1. Create API routes:
   - GET /api/groups — Return all groups where user is a member, with member count, expense count, total expenses
   - POST /api/groups — Create group with name, description, and optional memberEmails array (add existing users by email)
   - GET /api/groups/[groupId] — Return group with members (with user details: id, name, email) and expenses (with paidBy user: id, name)
   - POST /api/groups/[groupId]/members — Add member by email to group (validate membership first)
   - DELETE /api/groups/[groupId]/members — Remove member from group (body: { userId }, only admin can remove)

2. Create Add Group dialog at src/components/groups/add-group-dialog.tsx:
   - Form fields: group name, description (optional), add members by email
   - Email chips with remove button
   - Submit creates group and navigates back
   - Responsive: max-w-2xl on desktop
   - Sticky footer with "SplitEase — Split Expenses with Friends"

3. Create Group Detail page at src/components/groups/group-detail.tsx:
   - Header with back button, group name, member count, add expense button
   - Three tabs: Expenses, Balances, Members
   - Expenses tab: Grid of expense cards (1-col mobile, 2-col md+) with description, ₹ amount, paid by, split type badge, delete option (dropdown)
   - Balances tab: Simplified debts visualization (from → ₹ amount → to with avatars), settle up button, settlement history
   - Members tab: Grid of member cards (1-col mobile, 2-col sm+, 3-col lg+) with avatars, roles, add/remove member functionality
   - Responsive: max-w-6xl, px-4 sm:px-6 lg:px-8
```

---

## Prompt 4: Expenses & Split Logic

```
Build the Expenses feature with multiple split types for the SplitEase app:

1. Create API routes:
   - POST /api/expenses — Create expense with:
     - groupId, description, amount, splitType (equal|unequal|percent|shares), paidById, splits array
     - For equal splits: just userId needed; server calculates amount per person (with rounding adjustment to first split)
     - For unequal: userId + amount per split
     - For percent: userId + percent per split (calculate amounts server-side)
     - For shares: userId + shares per split (calculate amounts proportionally, with rounding adjustment)
     - Validate: splits sum must equal total amount (0.01 tolerance)
     - Verify all split users are group members
     - Use Prisma $transaction for atomic create
   - GET /api/expenses?groupId= — Return group expenses with paidBy, splits, and chat message count
   - GET /api/expenses/[expenseId] — Return expense with splits (include user details) and chatMessages (include user details)
   - DELETE /api/expenses/[expenseId] — Delete expense if user is group admin or payer

2. Create Add Expense form at src/components/expenses/add-expense-dialog.tsx:
   - Description input, amount input with ₹ prefix (not $)
   - "Paid by" selector with member avatar buttons
   - Split type tabs: Equal, Unequal, Percent, Shares (4-column grid)
   - Per-member checkbox to include/exclude
   - Per-member input fields (amount/percent/shares depending on type)
   - Running split summary showing total vs split total with validation (green/red colors)
   - Responsive: max-w-2xl, h-8 inputs on mobile, wider on sm+
   - Currency symbol: ₹ everywhere

3. Create Expense Detail page at src/components/expenses/expense-detail.tsx:
   - Expense info card: ₹ amount, paid by, split type badge, split breakdown with avatars
   - Current user's split highlighted with emerald-50 background and "You" badge
   - Chat section alongside expense info on desktop (2-column grid on lg+)
   - Chat: message bubbles (emerald for current user right-aligned, gray for others left-aligned)
   - Chat height: max-h-[300px] on mobile, max-h-[500px] on lg+
   - Responsive: max-w-6xl, px-4 sm:px-6 lg:px-8
```

---

## Prompt 5: Balances & Settlements

```
Build the Balances and Settlements features for SplitEase:

1. Create balance API routes:
   - GET /api/balances — Return totalOwed, totalOwing, netBalance, and per-group balances for current user
     - Logic: If user paid an expense, add amount to totalOwed; if user has a split, add split amount to totalOwing
     - Settlements reduce the corresponding balance (if user paid settlement, reduce totalOwing; if received, reduce totalOwed)
   - GET /api/balances/[groupId] — Return group-level memberBalances and simplifiedDebts
     - Initialize all member balances to 0
     - Process expenses: payer gets +amount, each split person gets -splitAmount
     - Process settlements: fromUser gets +amount, toUser gets -amount
     - Simplify debts: greedy algorithm (sort creditors and debtors by amount, match them up)

2. Create settlement API routes:
   - POST /api/settlements — Record settlement (groupId, toUserId, amount, optional note)
     - Set fromUserId to current session user
     - Validate user is a member of the group
   - GET /api/settlements?groupId=X — List settlements for a group with fromUser and toUser details

3. Create Settle Up page at src/components/settlements/settle-up-dialog.tsx:
   - Suggested settlements section (debts where current user owes money, from simplifiedDebts)
   - Click to auto-fill amount and recipient
   - Manual payment form: recipient selector (member avatar buttons), amount input with ₹ prefix, note textarea
   - Direction indicator: You → Recipient with avatars
   - Amount and note in side-by-side layout on sm+ (grid-cols-1 sm:grid-cols-2)
   - Responsive: max-w-2xl
   - Currency symbol: ₹ everywhere
```

---

## Prompt 6: Real-time Chat with Scaledrone + Polling Fallback

```
Add real-time chat to expense details in SplitEase using Scaledrone with polling fallback:

1. Create chat API route at src/app/api/expenses/[expenseId]/chat/route.ts:
   - POST: Save message to ChatMessage table, return the message with user details (id, name, email)
   - Validate message is not empty and user is authenticated
   - GET: Return all chat messages for the expense with user details

2. In the Expense Detail component, integrate Scaledrone WITH polling fallback:
   - Channel ID: ReUM8GKvm3slcVpQ (from .env or hardcoded)
   - Start 3-second polling IMMEDIATELY as a reliable fallback (setInterval)
   - Polling: Fetch /api/expenses/{expenseId}, extract chatMessages, deduplicate by ID, append new ones
   - Then also try to connect Scaledrone:
     - Dynamically load Scaledrone SDK from https://cdn.scaledrone.com/scaledrone.min.js
     - Subscribe to room `expense-{expenseId}` on drone "open" event
     - Listen for messages with type "chat" and data.message
     - Deduplicate messages by id to prevent double-showing
     - Publish messages to Scaledrone room after API save (if connected)
   - Clean up: clearInterval and drone.close() on unmount
   - Use refs (droneRef, roomRef, pollRef, connectedRef) to manage connections

3. Chat UI:
   - Message bubbles: emerald-600 bg white text for current user (right-aligned), muted bg for others (left-aligned)
   - User avatar and name/You above each message
   - Timestamp below each message (hour:minute format)
   - Auto-scroll to bottom on new messages (useEffect on chatMessages)
   - Input bar at bottom with text input and send button (emerald bg)
   - Responsive: max-h-[300px] on mobile, max-h-[500px] on lg+
```

---

## Prompt 7: Dashboard, Navigation & Responsive Design

```
Build the main dashboard and navigation system for SplitEase with full responsive design:

1. Create Zustand store at src/lib/store.ts:
   - Views: dashboard, group, expense-detail, add-expense, settle-up, add-group
   - State: currentView, selectedGroupId, selectedExpenseId, viewHistory
   - navigate(view, id) pushes current state to history and sets new view + id
   - goBack() pops from history and restores previous view + ids
   - If no history, goBack() returns to dashboard

2. Create Dashboard at src/components/dashboard/dashboard.tsx:
   - Sticky header with emerald logo + "SplitEase" title, New Group button, user avatar dropdown (sign out)
   - Three balance summary cards (owed emerald gradient, owing orange-red gradient, net white) in responsive grid (1-col mobile, 3-col sm+)
   - Two-column layout on desktop: groups list (2/3, lg:col-span-2) + balance summary sidebar (1/3, lg:col-span-1)
   - Group cards with icon, name, member count, expense count, ₹ balance, member avatars
   - Empty state with call-to-action for no groups
   - Currency: ₹ everywhere
   - All amounts with .toFixed(2)

3. Responsive design requirements:
   - All pages use max-w-6xl container with responsive padding (px-4 sm:px-6 lg:px-8)
   - Mobile: single column, full-width cards
   - Desktop: multi-column grids, sidebar layouts
   - Expense detail: 2-column grid (info left, chat right) on lg+
   - Group members: grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
   - Expense cards: grid-cols-1 md:grid-cols-2
   - Sticky footer at bottom (min-h-screen flex flex-col, mt-auto)
   - Sticky header with backdrop blur (sticky top-0 z-50 bg-white/80 backdrop-blur-lg)
   - Touch-friendly: min 44px interactive targets
   - All text truncates properly with min-w-0 and truncate
   - Tabs text: text-xs sm:text-sm on mobile vs desktop

4. Main page at src/app/page.tsx:
   - Wrap entire app in SessionProvider
   - Show AuthPage if not authenticated (status !== "loading" && !session)
   - Show loading spinner while session loads (emerald spinning ring)
   - Conditionally render views based on Zustand store currentView
   - Each view receives navigate and goBack functions from the store
```

---

## Prompt 8: Deployment to Vercel

```
Prepare SplitEase for deployment to Vercel:

1. Ensure package.json has "postinstall": "prisma generate" script
2. Ensure next.config.ts has output: "standalone" and ignoreBuildErrors: true
3. Add .env.example with all required environment variables documented:
   - DATABASE_URL (Neon PostgreSQL connection string)
   - NEXTAUTH_SECRET (JWT signing secret)
   - NEXTAUTH_URL (app URL, update after deployment)
   - SCALEDRONE_CHANNEL_ID (Scaledrone channel for real-time chat)
4. Ensure build works: next build should complete without errors
5. Push to GitHub repository
6. In Vercel dashboard:
   - Import the GitHub repository
   - Set environment variables: DATABASE_URL, NEXTAUTH_SECRET, NEXTAUTH_URL, SCALEDRONE_CHANNEL_ID
   - Deploy
7. After deployment, update NEXTAUTH_URL to the Vercel domain
8. Test all features: signup, login, create group, add expense with each split type, chat, settle up, responsive design
9. Verify that:
   - Currency shows ₹ (not $)
   - Chat messages arrive in real-time (or within 3 seconds via polling)
   - All pages are responsive on mobile and desktop
   - Sign up and login work correctly
   - Balance calculations are accurate
```
