# Punchly 🥊

**Punchly** is a full-stack, mobile-first social habit tracking and accountability platform. Designed for friends to stay connected, build consistent routines together, track daily punch-ins, keep streaks alive, and celebrate completed milestones.

---

## 🌟 Project Status: ✅ Completed (v1.0)

All primary features, database architectures, real-time mechanisms, security flows, and mobile responsive layouts have been completed and verified for production.

---

## 🚀 Key Features

### 1. 🥊 Shared Habit Tracking & Daily Punch-Ins
* **Custom Habit Proposals**: Propose habits with flexible cadences — **Daily** or **X times per week**, with optional target completion dates.
* **Proposal Workflow**: Clean accept/decline workflows that instantly sync with notification alerts.
* **Daily Punch-In Routine**: Check off habits each day with instant feedback and live status syncing.
* **Completed Goals Archive**: Habits that reach their target end date automatically graduate into a dedicated **"Completed Goals"** archive.

### 2. 📅 Interactive Streak & Accountability Calendar
* **Color-Coded Accountability Visualization**:
  * 🟢 **Green**: Both you and your friend punched in!
  * 🟡 **Yellow**: One partner punched in — click to view exact punch timestamps.
  * 🔴 **Red**: Missed routine day.
  * ⚪ **Neutral**: Rest day / weekly goal already satisfied.
* **Month Navigation & History**: Browse through previous months to review habit consistency over time.

### 3. 💬 1-on-1 Direct Messaging & Instant Nudges
* **Dedicated Friend Chat Rooms**: Fast, private messaging directly connected to your shared habits.
* **⚡ One-Tap Nudge**: Send pre-formatted accountability reminders to prompt your friend to punch in for the day.
* **Floating Habits Banner**: Uncompleted habits float pinned above the chat feed with direct punch buttons so you never lose track while texting.

### 4. 📱 Mobile-First Responsive UX
* **Docked Chat Layout**: WhatsApp/Telegram-style bottom input bar that stays permanently visible and docked to the viewport.
* **Dynamic Keyboard Adaptation**: Utilizes the modern `window.visualViewport` API and Next.js `interactiveWidget: "resizes-content"` to ensure virtual keyboards never push the typing input off-screen.
* **Single Mobile Header**: Maximizes screen real estate on mobile devices by suppressing desktop banners in dedicated chat threads.
* **Safe-Area Insets**: Full native support for iOS home indicators and Android gesture bars.

### 5. 👥 Friends & Social Discovery
* **Unique User Tags**: Custom handle system (e.g. `@alex`, `@sarah`) for easy identification and search.
* **Friend Request Hub**: Send, accept, or decline friend requests with real-time pending badges.
* **Public & Personal Profiles**: Customizable profile avatars, bios, and accountability stats.

### 6. 🔔 Central Notification Center
* Synchronized alerts for friend requests, habit proposals, approvals, and nudges.
* Actionable notifications — accepting an activity directly from messages or notifications keeps both views instantly in sync.

### 7. 🔐 Robust Authentication & Password Management
* **Secure Credentials Auth**: Powered by NextAuth.js v5 with bcrypt hashing (12 salt rounds).
* **Password Reset Flow**: Cryptographically secure 32-byte hex token generation with 1-hour expiration.
* **Dedicated Reset Page**: `/reset-password?token=...` with real-time password criteria validation (8+ characters, uppercase, number, symbol).
* **In-Profile Password Updates**: Authenticated users can update their account password directly from their profile settings.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | **Next.js 16** (App Router, Turbopack, Server Actions) |
| **UI & Styling** | **React 19**, **Tailwind CSS v4** |
| **Authentication** | **NextAuth.js v5**, **bcryptjs**, Cryptographic tokens |
| **Database & ORM** | **Prisma ORM**, **Neon Lakebase PostgreSQL** |
| **Deployment** | **Vercel** CI/CD with automated dual-remote GitHub sync |
| **Language & Tooling** | **TypeScript 5**, ESLint |

---

## 🗄️ Database Architecture

The application is backed by a PostgreSQL database managed via Prisma ORM:

* `User`: User accounts, hashed credentials, unique `@tag`, profile bio, and avatars.
* `Friendship`: Bi-directional friendship records between users.
* `FriendRequest`: Pending, accepted, or declined connection requests.
* `Activity`: Shared habits, frequency configuration, target dates, and statuses.
* `ActivityPunchIn`: Daily timestamped completion records per user per habit.
* `Message`: Direct chat messages between friends.
* `Notification`: Actionable in-app alerts and proposal notifications.
* `PasswordResetToken`: Time-limited, single-use security tokens for password resets.

---

## 🏁 Getting Started

### Prerequisites
* **Node.js** (v18.17+ or v20+)
* **npm** or **pnpm**
* A **PostgreSQL** database (e.g. [Neon](https://neon.tech))

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/iceMan0333/friend-tracker.git
   cd friend-tracker
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   DATABASE_URL="postgresql://user:password@host/neondb?sslmode=require"
   AUTH_SECRET="your-random-generated-secret"
   NEXTAUTH_URL="http://localhost:3000"
   ```

4. **Sync Database Schema**:
   ```bash
   npx prisma db push
   npx prisma generate
   ```

5. **Start Development Server**:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🏗️ Production Build

To test the production build locally:

```bash
npm run build
npm run start
```

---

## 👤 Author

**Samin Yasar Ishraq**
* GitHub: [@iceMan0333](https://github.com/iceMan0333)
