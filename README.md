# Punchly

Punchly is a social habit tracker and accountability app built for friends who want to stay consistent together. It pairs shared routines with daily punch-ins, visual streak calendars, and direct messaging so accountability partners can track progress and keep each other on track.

**Live Application:** [https://friend-tracker-vercel.vercel.app](https://friend-tracker-vercel.vercel.app)

## Features

- **Shared Habits**: Propose habits with custom cadences (daily or a target number of times per week) and optional end dates.
- **Daily Punch-Ins**: Check off shared activities each day with immediate visual feedback on whether both partners completed their routine.
- **Streak & Consistency Calendar**: A color-coded monthly calendar that highlights days when both users punched in, single-user completions with timestamps, and rest days.
- **Completed Goals Archive**: Habits that reach their target end date automatically move into an archive with historical calendar data preserved.
- **Direct Messaging & Reminders**: Built-in 1-on-1 chat rooms with a quick nudge action to remind a friend to check in for the day.
- **Mobile-First Layout**: Pinned bottom chat bar with keyboard-aware viewport resizing and safe-area support for iOS and Android.
- **Social Discovery**: Search friends by unique handles (@tag) and manage incoming and outgoing friend requests.
- **Notification Center**: Actionable in-app notifications for friend requests, habit proposals, and completions.
- **Account Security**: Password authentication with bcrypt hashing, session handling via Auth.js, secure token-based password reset, and password updates from profile settings.

## Tech Stack

- **Framework**: Next.js 16 (App Router, Server Actions, Turbopack)
- **Frontend**: React 19, Tailwind CSS
- **Database & ORM**: PostgreSQL (Neon), Prisma ORM
- **Authentication**: NextAuth.js (Auth.js v5), bcryptjs
- **Hosting**: Vercel

## Database Model

The database schema is structured around friends collaborating on activities:

- `User`: Handles accounts, hashed passwords, handles (@tag), and profiles.
- `Friendship` / `FriendRequest`: Manages relationships and request workflows.
- `Activity`: Stores shared habits, frequency rules, status, and dates.
- `ActivityPunchIn`: Tracks daily completions per user per habit.
- `Message`: Direct messaging between friends.
- `Notification`: In-app alerts for proposals, requests, and activity updates.
- `PasswordResetToken`: Expiring single-use tokens for password resets.

## Author

Samin Yasar Ishraq  
GitHub: [@iceMan0333](https://github.com/iceMan0333)
