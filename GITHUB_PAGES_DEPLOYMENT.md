# GitHub Pages Deployment Guide

This guide explains how to deploy the NeverLost frontend to GitHub Pages.

## Prerequisites

1. GitHub repository: `https://github.com/jessetsmith/NeverLost.git`
2. Firebase Functions backend deployed and accessible
3. GitHub Pages enabled in repository settings

## Setup Steps

### 1. Enable GitHub Pages

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Pages**
3. Under **Source**, select:
   - **Branch**: `gh-pages` (or `main` if using GitHub Actions)
   - **Folder**: `/ (root)` or `/NeverLost` depending on your setup
4. Click **Save**

### 2. Manual Deployment (Option 1)

If you prefer manual deployment:

```bash
cd NeverLost
npm run build
npm run deploy
```

This will:
- Build the project
- Deploy to the `gh-pages` branch
- Your site will be available at: `https://jessetsmith.github.io/NeverLost/`

### 3. Automatic Deployment (Option 2 - Recommended)

The repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically deploys when you push to the `main` branch.

**To use GitHub Actions:**

1. Make sure the workflow file exists: `.github/workflows/deploy.yml`
2. Push your changes to the `main` branch
3. GitHub Actions will automatically:
   - Build the project
   - Deploy to GitHub Pages
   - Your site will be available at: `https://jessetsmith.github.io/NeverLost/`

**Note:** Make sure to set the `VITE_APP_API_URL` environment variable in the GitHub Actions workflow if needed.

## Configuration

### Base Path

The app is configured to use `/NeverLost/` as the base path for GitHub Pages. This is set in:
- `vite.config.js` - `base: "/NeverLost/"`
- `src/main.jsx` - `basename={basename}` for React Router

If your repository name is different, update these files accordingly.

### API URL

The app automatically uses:
- **Production**: `https://us-central1-neverlost-server.cloudfunctions.net/api`
- **Development**: `/api` (proxied to `http://localhost:3000`)

To override, set the `VITE_APP_API_URL` environment variable.

## Troubleshooting

### Routes Not Working

If routes return 404 errors:
- Make sure the base path is correctly set in `vite.config.js`
- Verify `basename` is set in `src/main.jsx`
- Check that GitHub Pages is serving from the correct branch/folder

### API Calls Failing

- Verify Firebase Functions are deployed and accessible
- Check CORS settings in Firebase Functions
- Ensure the API URL is correctly configured

### Build Errors

- Run `npm install` to ensure all dependencies are installed
- Check for linting errors: `npm run lint`
- Verify Node.js version (should be 18+)

## Custom Domain (Optional)

To use a custom domain:
1. Add a `CNAME` file in the `public/` directory with your domain
2. Update DNS settings to point to GitHub Pages
3. Update the base path in `vite.config.js` to `/` instead of `/NeverLost/`

## Environment Variables

For GitHub Actions deployment, environment variables can be set in:
- Repository Settings → Secrets and variables → Actions
- Or directly in the workflow file (for non-sensitive values)

## Support

For issues or questions, check:
- GitHub Actions logs: Repository → Actions tab
- GitHub Pages settings: Repository → Settings → Pages
- Firebase Functions logs: Firebase Console → Functions

