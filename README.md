# Booker

Transform your books into interactive AI voice conversations. Upload a PDF, and chat with your book using a voice assistant powered by VAPI and ElevenLabs.

## Features

- **Voice conversations** — Talk to your books using AI voice powered by VAPI
- **PDF upload** — Upload any book as a PDF and it gets indexed for conversations
- **Multiple voices** — Choose from 5 ElevenLabs voices (male & female)
- **Authentication** — User accounts via Clerk
- **Subscription plans** — Session limits and durations enforced per plan
- **Real-time transcript** — Live conversation transcript while you talk

## Tech Stack

- **Framework** — Next.js 16 (App Router)
- **Voice AI** — [VAPI](https://vapi.ai) + ElevenLabs
- **Auth** — Clerk
- **Database** — MongoDB (Mongoose)
- **File Storage** — Vercel Blob
- **UI** — Tailwind CSS, Radix UI, shadcn/ui

## Getting Started

### 1. Clone the repo

```bash
git clone <repo-url>
cd booker
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env
```

Fill in the values in `.env`:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_VAPI_API_KEY` | VAPI web SDK key — from [dashboard.vapi.ai](https://dashboard.vapi.ai) |
| `NEXT_PUBLIC_ASSISTANT_ID` | VAPI assistant ID — create one in the VAPI dashboard |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key — from [clerk.com](https://clerk.com) |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `MONGODB_URI` | MongoDB connection string |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token — from your Vercel project settings |

### 4. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/
  page.tsx                  # Home — book library
  books/
    [slug]/page.tsx         # Book detail + voice interface
    new/page.tsx            # Upload a new book
  subscriptions/page.tsx    # Subscription plans
  api/
    upload/                 # PDF upload endpoint
    vapi/search-book/       # VAPI tool endpoint for book search
components/
  VapiControls.tsx          # Voice call UI
  VoiceSelector.tsx         # Voice picker
  Transcript.tsx            # Live transcript
hooks/
  useVapi.ts                # VAPI call lifecycle hook
  useSubscription.ts        # Plan limits hook
lib/
  constants.ts              # VAPI config, voice IDs
  actions/                  # Server actions (books, sessions)
database/
  models/                   # Mongoose models (Book, BookSegment, VoiceSession)
```

## Scripts

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Lint
```
