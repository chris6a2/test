# AI Editorial App (PWA)

A Progressive Web App for generating AI-powered article drafts on demand. Works on iPad, iPhone, Android, and desktop browsers.

## Features

- **Progressive Web App** - Install on your home screen
- **Works Offline** - Service worker caches the app
- **Local Storage** - Data stored in browser (IndexedDB)
- **Article Generation** - Generate News and Evergreen articles using Claude AI
- **Article Editor** - Edit and preview articles
- **Export** - Export to Markdown, HTML, or JSON
- **Mobile-Friendly** - Responsive design for tablets and phones

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-repo/ai-editorial-app)

Or deploy manually:

```bash
npm install -g vercel
vercel
```

## Install as App

### On iPad/iPhone
1. Open the app in Safari
2. Tap the Share button
3. Select "Add to Home Screen"

### On Android
1. Open the app in Chrome
2. Tap the menu (three dots)
3. Select "Add to Home Screen"

### On Desktop
1. Open the app in Chrome/Edge
2. Click the install icon in the address bar

## Configuration

1. Navigate to **Settings** in the app
2. Enter your Claude API key (get one from [console.anthropic.com](https://console.anthropic.com))
3. Select your preferred model
4. Click **Save Settings**

## Tech Stack

- **Next.js 14** - React framework (static export)
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **IndexedDB** - Client-side database
- **Service Worker** - Offline support
- **Claude API** - AI article generation (called directly from browser)

## Project Structure

```
ai-editorial-app/
├── public/
│   ├── manifest.json      # PWA manifest
│   ├── sw.js              # Service worker
│   └── icons/             # App icons
├── src/
│   ├── app/               # Next.js pages
│   │   ├── page.tsx       # Dashboard
│   │   ├── articles/      # Articles pages
│   │   └── settings/      # Settings page
│   ├── components/        # React components
│   ├── lib/
│   │   ├── storage.ts     # IndexedDB storage
│   │   ├── ai-client.ts   # Claude API client
│   │   └── prompt.ts      # Editorial prompt
│   └── types/             # TypeScript types
└── package.json
```

## Data Storage

All data is stored locally in your browser's IndexedDB:
- Articles (title, content, metadata)
- Settings (API key, model preference)

**Important:** Clearing browser data will delete your articles. Export important articles before clearing data.

## Customization

### Editorial Prompt

Edit `src/lib/prompt.ts` to customize the AI's writing style and instructions.

### Models

The app supports multiple Claude models:
- Claude Sonnet 4 (recommended)
- Claude Opus 4
- Claude 3.5 Sonnet
- Claude 3.5 Haiku (faster, lower cost)

## Security Notes

- Your API key is stored locally on your device
- API key is sent only to Claude's API (api.anthropic.com)
- No data is sent to any other server
- The app uses `anthropic-dangerous-direct-browser-access` header for browser API calls

## License

MIT
