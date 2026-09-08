# Friend Tracker

Friend Tracker is a full-stack web application designed to help friends stay connected, keep track of shared activities, and see each other's progress.

The project is being built as a portfolio project with a focus on full-stack development, database design, authentication, real-time communication, and clean software architecture.

## Project Status

🚧 **Currently in development**

The initial project setup and database foundation are complete.

### Completed

* Next.js application setup
* TypeScript configuration
* PostgreSQL database setup
* Prisma ORM configuration
* Prisma database schema
* Initial database migration
* Prisma Client and PostgreSQL driver adapter
* Git version control
* GitHub repository setup

### Planned Features

* User registration and authentication
* User profiles
* Friend requests and friend management
* Shared activities
* Recurring daily and weekly activities
* Activity completion tracking
* Friend activity status
* Private messaging
* Notifications
* Responsive user interface

## Tech Stack

### Frontend

* Next.js
* React
* TypeScript
* Tailwind CSS

### Backend

* Next.js
* Prisma ORM
* PostgreSQL

### Development Tools

* Git
* GitHub
* ESLint

## Database Design

The application uses PostgreSQL with Prisma as the ORM.

The current database is designed around the following core entities:

* `User` — application users
* `FriendRequest` — requests between users
* `Friendship` — accepted friendships
* `Activity` — shared activities
* `ActivityParticipant` — users participating in activities
* `ActivityOccurrence` — individual occurrences of recurring activities
* `ActivityCompletion` — completion status for each participant
* `Message` — messages between users

Recurring activities use separate occurrences and completion records so that each user can have an individual completion status for the same activity.

## Getting Started

### Prerequisites

Make sure you have the following installed:

* Node.js
* npm
* PostgreSQL

### Installation

Clone the repository:

```bash
git clone https://github.com/iceMan0333/friend-tracker.git
cd friend-tracker
```

Install dependencies:

```bash
npm install
```

Create a `.env` file in the project root and add your PostgreSQL connection string:

```env
DATABASE_URL="postgresql://USERNAME:PASSWORD@localhost:5432/friend_tracker"
```

Run the database migrations:

```bash
npx prisma migrate dev
```

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Environment Variables

The application uses environment variables for configuration.

Do not commit `.env` to GitHub. It contains private database credentials.

## Development

The project follows an incremental development approach:

```text
Feature → Test → Commit → Documentation → Next Feature
```

Major features will be developed and committed separately to maintain a clear project history.

## Project Structure

```text
friend-tracker/
├── app/                    # Next.js application
├── lib/                    # Shared application utilities
│   └── prisma.ts           # Prisma Client
├── prisma/
│   ├── migrations/         # Database migrations
│   └── schema.prisma       # Database schema
├── public/                 # Static assets
├── .env                    # Local environment variables
├── prisma.config.ts        # Prisma configuration
├── package.json
└── README.md
```

## Future Improvements

As development continues, the project may be expanded with:

* Real-time chat
* Notifications
* Activity reminders
* Improved activity scheduling
* Mobile-friendly interface
* Deployment to a production environment
* Automated testing

## Author

**Samin Yasar Ishraq**

