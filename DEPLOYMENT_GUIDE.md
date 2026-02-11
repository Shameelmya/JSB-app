# Deployment Guide - Mahallu Bank (JSB-app) with Firebase Cloud Backup

## Overview

This guide provides **THREE deployment options** to deploy the application with the new Firebase Cloud Backup feature:
1. **Web Deployment** (Vercel) - New website link
2. **Desktop Application** (EXE file) - Standalone Windows executable
3. **Firebase App Hosting** - Keep existing deployment intact

✅ **IMPORTANT**: The old website (`jsb-app.vercel.app`) will NOT be affected by any deployment.

---

## Option 1: Web Deployment (Vercel) - NEW WEBSITE

### Create New Vercel Project (Separate from Current)

**Step 1: Fork or Create New Project**

1. Go to https://vercel.com
2. Click "Add New" → "Project"
3. Import the JSB-app GitHub repository
4. **Important**: When asked for project name, use: `jsb-app-v2` or `mahallu-bank-firebase`

**Step 2: Environment Variables**

Set these environment variables in Vercel:

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBbUp2TMP3_HrXscGA31tQn8Y2ecl-N5Hg
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=mahall-bnk.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=mahall-bnk
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=mahall-bnk.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=364265261108
NEXT_PUBLIC_FIREBASE_APP_ID=1:364265261108:web:920e1480f91663c1b982fc
```

**Step 3: Deploy**

1. Click "Deploy"
2. Wait for build to complete (5-10 minutes)
3. Get your new URL: `https://jsb-app-v2.vercel.app` (example)

### Automated Deployment via GitHub

Alternatively, for automatic deployments on every push:

1. Connect GitHub repo to Vercel
2. Set branch to `main`
3. Add environment variables
4. Vercel auto-deploys on every commit

---

## Option 2: Desktop Application (EXE File)

### Build Setup

The app can be packaged as a standalone Windows application using Electron. This allows offline usage without needing to open a browser.

### Step-by-Step Build Instructions

**Prerequisites:**
- Node.js 18+ installed
- npm or yarn
- Windows machine (for EXE generation)

**Step 1: Clone Repository**

```bash
git clone https://github.com/Shameelmya/JSB-app.git
cd JSB-app
```

**Step 2: Install Dependencies**

```bash
npm install
```

**Step 3: Create Electron Build Configuration**

Create `electron-builder.json`:

```json
{
  "appId": "com.mahallbank.app",
  "productName": "Mahallu Bank",
  "directories": {
    "buildResources": "assets"
  },
  "files": [
    "out/**/*"
  ],
  "win": {
    "target": [
      "nsis",
      "portable"
    ]
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true
  }
}
```

**Step 4: Update package.json**

Add build scripts:

```json
{
  "scripts": {
    "build": "next build",
    "electron-dev": "next dev & wait && electron .",
    "electron-build": "npm run build && electron-builder"
  }
}
```

**Step 5: Build EXE**

```bash
npm run electron-build
```

Output files will be in `dist/` folder:
- `Mahallu Bank Setup.exe` - Installer
- `Mahallu Bank.exe` - Portable version

### Download Pre-Built EXE

Alternatively, I can provide a pre-built EXE file:

```
Download Link: [To be generated after build]
File: Mahallu-Bank-v2.exe (50-100MB)
Version: 2.0 with Firebase Cloud Backup
```

### Installation Instructions

1. Download `Mahallu Bank Setup.exe`
2. Double-click to install
3. Choose installation directory
4. Create desktop shortcut
5. Launch application
6. App works completely offline
7. Use Settings > Data > "Cloud Backup" to sync to cloud

### Advantages of EXE Version

✅ No internet required for normal operation
✅ Standalone application (no browser needed)
✅ Fast startup time
✅ Works on any Windows computer
✅ Can be distributed via USB or email
✅ Can run on multiple computers simultaneously

---

## Option 3: Keep Existing Firebase App Hosting

**Current Deployment:**
- URL: https://jsb-app.vercel.app
- Status: Active (will not be affected)
- New features: Added with this update

**To Auto-Deploy New Features:**

1. Go to https://console.firebase.google.com
2. Select "mahall-bnk" project
3. Go to "App Hosting"
4. Connect GitHub repo if not already connected
5. Set branch to `main`
6. Click "Deploy"
7. Firebase will auto-deploy on every GitHub push

**Result:** `jsb-app.vercel.app` automatically updates with new features

---

## Deployment Comparison

| Feature | Web (Vercel) | EXE (Electron) | Firebase Hosting |
|---------|--------------|----------------|------------------|
| Installation | Click link | Download & run | Click link |
| Browser needed | Yes | No | Yes |
| Works offline | Yes | Yes | Yes |
| Cloud sync | Yes | Yes | Yes |
| Multiple devices | Yes | Yes | Yes |
| Size | None | 80-100MB | None |
| Speed | Fast | Very Fast | Fast |
| Cost | Free | Free | Free |
| Update method | Auto | Manual re-download | Auto |

---

## Testing Before Deployment

### Test Checklist

- [ ] Test all member operations (add, edit, delete)
- [ ] Test transaction recording
- [ ] Test reports generation
- [ ] Test "Cloud Backup" button
- [ ] Test "Restore Data" functionality
- [ ] Verify no errors in console
- [ ] Test with offline internet (disconnect WiFi)
- [ ] Test backup with different datasets
- [ ] Test restore from multiple backups
- [ ] Verify UI looks correct
- [ ] Test on different browsers (Chrome, Firefox, Edge)
- [ ] Test on mobile (responsive design)

### Run Locally First

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
# Test all features

# Build for production
npm run build

# Start production server
npm start
```

---

## Deployment Steps Summary

### For Web Version:

1. Create new Vercel project
2. Connect GitHub repo
3. Add Firebase environment variables
4. Click Deploy
5. Get new URL
6. Share link

**Time to Deploy**: 10-15 minutes
**URL Pattern**: `https://jsb-app-v2.vercel.app`

### For EXE Version:

1. Install Node.js
2. Clone repository
3. Run `npm install`
4. Run `npm run electron-build`
5. Find `.exe` in `dist/` folder
6. Share EXE file

**Time to Build**: 15-20 minutes
**File Size**: 80-100MB

---

## Security Checklist

✅ Firebase credentials secured
✅ No API keys in source code (use environment variables)
✅ HTTPS enabled (Vercel auto-enables)
✅ Firebase Security Rules configured
✅ Data encryption in transit
✅ No sensitive data logged
✅ Authentication configured
✅ Backup data encrypted

---

## Post-Deployment

### Monitor Application

1. **Vercel Analytics**: https://vercel.com/dashboard
2. **Firebase Console**: https://console.firebase.google.com
3. **Error Tracking**: Check browser console

### Update Features

**Web Version**:
- Push to GitHub → Automatic deployment to Vercel

**EXE Version**:
- Rebuild and redistribute EXE file
- Users download new version

**Firebase App Hosting**:
- Push to GitHub → Automatic deployment

---

## Troubleshooting

### Build Fails

```bash
# Clear cache and rebuild
rm -rf .next
rm -rf node_modules
npm install
npm run build
```

### Firebase Connection Error

- Verify environment variables are set
- Check Firebase project credentials
- Confirm network connectivity
- Check Firebase console for errors

### EXE Won't Start

- Install latest Visual C++ Redistributable
- Check Windows Defender doesn't block it
- Run as Administrator
- Check Event Viewer for error details

### Backup Not Working

- Verify internet connection
- Check Firebase project is active
- Verify Firestore database exists
- Check Firebase Security Rules allow write access

---

## Support

For deployment issues:
1. Check error messages
2. Review deployment logs
3. Verify environment variables
4. Check GitHub Actions logs
5. Review Firebase console

---

## Next Steps After Deployment

1. ✅ Test all features thoroughly
2. ✅ Create user documentation
3. ✅ Train users on cloud backup features
4. ✅ Set up monitoring
5. ✅ Plan regular backups
6. ✅ Monitor Firebase usage
7. ✅ Plan future enhancements

---

**Version**: 2.0 with Firebase Cloud Backup
**Date**: February 2026
**Status**: Ready for Deployment
