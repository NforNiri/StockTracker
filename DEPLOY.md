# Deployment Guide for Vercel

This project is ready for deployment on [Vercel](https://vercel.com). Follow these steps to deploy your application.

## Prerequisites

- A Vercel account
- A MongoDB database (e.g., MongoDB Atlas)
- A Finnhub API Key
- (Optional) An Inngest account for background jobs
- (Optional) A Gmail account/app password for Nodemailer

## Environment Variables

When deploying to Vercel, you must set the following Environment Variables in the Vercel Project Settings:

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `MONGODB_URI` | Connection string for your MongoDB database | `mongodb+srv://user:pass@cluster.mongodb.net/dbname` |
| `BETTER_AUTH_SECRET` | A secure random string for authentication | `your-secure-random-string` |
| `BETTER_AUTH_URL` | The production URL of your app (no trailing slash) | `https://your-app.vercel.app` |
| `FINNHUB_API_KEY` | Your Finnhub API Key | `abc123...` |
| `NODEMAILER_EMAIL` | Email address for sending emails | `your-email@gmail.com` |
| `NODEMAILER_PASSWORD` | App password for the email account | `abcd efgh ijkl mnop` |
| `GEMINI_API_KEY` | (Optional) Gemini API Key for AI features | `AIza...` |
| `INNGEST_SIGNING_KEY`| (Required for Prod) Signing Key from Inngest Dashboard | `sign_...` |
| `INNGEST_EVENT_KEY` | (Optional) Event Key for pushing events externally | `evt_...` |

**Note:** Ensure `DEBUG_SEARCH` is NOT set or set to `false` in production.

## Inngest Setup

1. Create an account on [Inngest Cloud](https://app.inngest.com).
2. Connect your Vercel project to Inngest via the integration or manually.
3. If setting up manually, get the **Signing Key** from the Inngest dashboard and add it as `INNGEST_SIGNING_KEY` in Vercel.
4. Once deployed, Inngest will automatically detect your functions at `/api/inngest`.

## Database

The application uses `mongoose` with connection caching suitable for serverless environments (Vercel). Ensure your MongoDB Atlas IP Access List allows access from anywhere (`0.0.0.0/0`) or configure Vercel Static IP integration if you have an enterprise Atlas plan.

## Build Settings

Vercel usually detects Next.js automatically.
- **Build Command:** `next build`
- **Install Command:** `npm install`
- **Output Directory:** `.next` (default)

