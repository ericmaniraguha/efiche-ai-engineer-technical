# eFiche AI: Frontend Interface

This is the Next.js frontend application for the eFiche AI Clinical Transcription system. It provides a sleek, glassmorphism-styled UI for doctors and clinicians to record audio and review AI-generated reports.

## Technology Stack
- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: Vanilla CSS (`globals.css`)
- **Key APIs**: Web Speech API for real-time live transcription.

## Environment Variables
For local development, you must create a `.env.local` file inside this `frontend/` directory to tell the frontend where the backend API lives.

Create `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```
*(If running through Docker Compose, this is automatically handled for you).*

## Running Locally (Development)

First, install the dependencies:
```bash
npm install
```

Then, run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Testing the Frontend

You can test the frontend components entirely independently of the backend using the built-in mock states:
1. **Testing the Recording Interface:** On the main page (`/`), click "Record Audio Directly". Allow microphone access. You should see the live transcript populating visually even if the backend is down (this tests the browser's Web Speech API).
2. **Testing the Dashboard Parsing:** Navigate to `/dashboard`. The frontend is pre-loaded with mock data arrays (`MOCK_CONSULTATIONS`). You can click "View Details ->" on any of the mock entries to verify that the split-screen Review Interface successfully renders the missing flags, editable fields, and calculates the WER/Clinical scores correctly.
3. **Testing API Connectivity:** To test if your frontend is successfully talking to the local backend, initiate an upload. If the backend is unreachable or CORS fails, the UI will degrade gracefully to a "Pipeline Failed" state.

## Key Directories
- `src/app/page.tsx`: The main intake dashboard with the audio recorder and Web Speech API logic.
- `src/app/dashboard/page.tsx`: The clinical review dashboard where clinicians can approve and export generated records.
- `src/app/globals.css`: Contains all custom color tokens, glassmorphism utilities, and animations.
