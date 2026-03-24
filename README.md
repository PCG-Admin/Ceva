# Ceva TMS - Transport Management System

A comprehensive logistics platform for fleet management, load booking, vehicle tracking, and delivery operations built for the South African transport industry.

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/pcgs-projects-8758c50f/logistics-platform)

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + Shadcn/ui
- **Authentication:** Supabase Auth
- **Database:** Supabase (PostgreSQL)
- **Charts:** Recharts

## Features

- **Dashboard** - Real-time KPIs, fleet status overview, quick actions
- **Vehicle Tracking** - Live fleet monitoring, telemetry, trip history
- **Load Booking** - Create and manage freight loads, assignments
- **ePOD System** - Electronic Proof of Delivery with signatures/photos
- **Invoicing** - Invoice generation, VAT calculation, payment tracking
- **Analytics** - Performance metrics, revenue trends, reports
- **Client Portal** - Self-service shipment tracking for clients

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account and project

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd ceva-logistics-platform
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.local.example .env.local
   ```

   Update `.env.local` with your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
   ```

4. Push database migrations:
   ```bash
   supabase db push
   ```

5. Configure Supabase Authentication:
   - Go to Supabase Dashboard > Authentication > Providers > Email
   - Disable "Confirm email" for development (optional)

6. Start the development server:
   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
ceva-logistics-platform/
├── app/
│   ├── layout.tsx          # Root layout with AuthProvider
│   ├── page.tsx            # Dashboard (protected)
│   ├── login/page.tsx      # Login page
│   ├── signup/page.tsx     # Signup page
│   └── auth/callback/      # OAuth callback handler
├── components/
│   ├── ui/                 # Shadcn/ui components
│   ├── dashboard.tsx       # Main dashboard
│   ├── auth-provider.tsx   # Auth context
│   └── [feature].tsx       # Feature modules
├── lib/
│   ├── utils.ts            # Utility functions
│   └── supabase/
│       ├── client.ts       # Browser client
│       └── server.ts       # Server client
├── supabase/
│   └── migrations/         # Database migrations
└── middleware.ts           # Route protection
```

## Authentication

The app uses Supabase Auth with the new publishable key format. Authentication flow:

1. Unauthenticated users are redirected to `/login`
2. Users can create accounts at `/signup` with role selection
3. Profiles are auto-created via database trigger on signup
4. Sessions are managed via cookies with middleware refresh

### User Roles

- `dispatcher` - Default role for logistics coordinators
- `driver` - For delivery drivers
- `admin` - Full system access
- `client` - Client portal access

### Using Auth in Components

```tsx
// Client components
import { useAuth } from '@/components/auth-provider'

function MyComponent() {
  const { user, loading, signOut } = useAuth()
  // ...
}
```

```tsx
// Server components
import { createClient } from '@/lib/supabase/server'

async function MyServerComponent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // ...
}
```

## Database Schema

### Profiles Table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key (links to auth.users) |
| email | TEXT | User email |
| full_name | TEXT | Display name |
| phone | TEXT | Contact number |
| role | ENUM | dispatcher, driver, admin, client |
| avatar_url | TEXT | Profile image URL |
| company_id | UUID | Future multi-tenant support |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## Deployment

The project is configured for Vercel deployment. Push to main branch to trigger automatic deployment.

## License

Private - All rights reserved.
