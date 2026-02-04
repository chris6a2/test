# AI Editorial App

A standalone web application for generating AI-powered article drafts on demand.

## Features

- **Dashboard** - Overview of all articles with stats
- **Article Generation** - Generate News and Evergreen articles using Claude AI
- **Article Editor** - Edit and preview articles before export
- **Export** - Export to Markdown, HTML, or JSON
- **Local Storage** - All data stored in SQLite database

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Configuration

1. Navigate to **Settings** in the app
2. Enter your Claude API key (get one from [console.anthropic.com](https://console.anthropic.com))
3. Select your preferred model
4. Click **Save Settings**

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **SQLite** - Local database (via better-sqlite3)
- **Claude API** - AI article generation

## Project Structure

```
ai-editorial-app/
├── src/
│   ├── app/                 # Next.js app router pages
│   │   ├── api/            # API routes
│   │   ├── articles/       # Articles pages
│   │   └── settings/       # Settings page
│   ├── components/         # React components
│   ├── lib/                # Utilities
│   │   ├── ai.ts          # Claude API integration
│   │   ├── db.ts          # SQLite database layer
│   │   └── prompt.ts      # Editorial system prompt
│   └── types/             # TypeScript types
├── data/                   # SQLite database (created on first run)
└── package.json
```

## API Routes

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/articles` | List all articles |
| POST | `/api/articles` | Create article |
| GET | `/api/articles/[id]` | Get single article |
| PUT | `/api/articles/[id]` | Update article |
| DELETE | `/api/articles/[id]` | Delete article |
| POST | `/api/generate` | Generate articles with AI |
| GET | `/api/settings` | Get settings |
| PUT | `/api/settings` | Update settings |

## Customization

### Editorial Prompt

Edit `src/lib/prompt.ts` to customize the AI's writing style and instructions.

### Models

The app supports multiple Claude models:
- Claude Sonnet 4 (recommended)
- Claude Opus 4
- Claude 3.5 Sonnet
- Claude 3.5 Haiku (faster, lower cost)

## License

MIT
