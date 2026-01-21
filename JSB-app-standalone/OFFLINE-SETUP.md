# MahalluConnect - Offline Standalone Setup Guide

## Overview
This is a completely standalone version of MahalluConnect that works completely offline with local data storage using IndexedDB. No internet connection or Firebase connection required.

## Features
- ✅ Fully offline operation
- ✅ Local data persistence with IndexedDB
- ✅ Data persists across browser refreshes
- ✅ Works without any backend server
- ✅ Perfect for local development and testing
- ✅ Ready for GitHub/Vercel deployment

## Installation & Setup

### Step 1: Extract the files
```bash
tar -xzf JSB-app-standalone.tar.gz
cd JSB-app-standalone
```

### Step 2: Install dependencies
```bash
npm install
# or
yarn install
```

### Step 3: Run the development server
```bash
npm run dev
# or
yarn dev
```

The app will be available at http://localhost:3000

## Offline Data Storage

All data is stored locally in your browser's IndexedDB database:
- Members information
- Transactions
- Dashboard data
- Reports
- Settings

Data persists automatically and will NOT be lost on:
- Page refreshes
- Browser restarts (in same browser)
- Network disconnections

## Building for Production

```bash
npm run build
npm start
```

## Deploying to Vercel/GitHub Pages

This app is optimized for deployment on:
- **Vercel**: https://vercel.com (recommended for Next.js)
- **GitHub Pages**: Using static export
- **Any static hosting**: After building

### For Vercel:
1. Push to GitHub
2. Connect repo to Vercel
3. Deploy (Vercel auto-detects Next.js)

## Local Development Notes

- Database: IndexedDB (browser's built-in)
- No API calls to external servers
- All data stays on your device
- No login required for local use
- Port: 3000 (default)

## Troubleshooting

### Port 3000 already in use:
```bash
npm run dev -- -p 3001
```

### Clear local data:
Open browser DevTools → Application → IndexedDB → MahalluConnect → Delete

### Data not persisting:
Check browser settings for IndexedDB storage limits

## Project Structure

```
JSB-app-standalone/
├── src/
│   ├── app/              # Next.js app pages and layouts
│   ├── lib/
│   │   ├── localDatabase.ts    # IndexedDB implementation
│   │   ├── useLocalDB.ts       # React hook for database
│   │   ├── data-provider.tsx   # Data context provider
│   │   └── ...other utilities
│   ├── components/       # UI components
│   └── ai/              # AI-related functionality
├── public/              # Static assets
├── package.json         # Dependencies
├── next.config.ts       # Next.js configuration
└── tsconfig.json        # TypeScript configuration
```

## System Requirements

- Node.js 18+
- npm or yarn
- Modern browser with IndexedDB support (Chrome, Firefox, Safari, Edge)

## License

Created with Firebase Studio
