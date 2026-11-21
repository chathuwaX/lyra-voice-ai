# Mira — 3D Digital Human Voice AI Assistant 🌌✨

A production-ready conversational web application featuring an ultra-realistic 3D female digital human with Apple ARKit 52 facial blendshapes, real-time viseme lip-syncing, dual AI providers (Google Gemini 3.8 Flash & Groq LPU), and full-stack deployment on Netlify's free plan.

---

## 🏛️ Project Architecture

This project is organized into a clean, decoupled monorepo architecture:

```
my-web-app/
│
├── frontend/                          # React 18 + Vite + TypeScript Frontend
│   ├── public/
│   │   ├── models/digital_human.glb   # Rigged 3D Female Model (ARKit 52)
│   │   └── avatar.png                 # Fallback portrait
│   ├── src/
│   │   ├── components/                # 3D Canvas, AvatarStage, VoiceControls, Panel
│   │   │   └── digital-human/         # Three.js / R3F Canvas, PBR shaders, lip-sync
│   │   ├── hooks/                     # Speech recognition, speech synthesis, AI hooks
│   │   ├── services/                  # Frontend API client (/api/chat + fallback)
│   │   ├── types/                     # TypeScript definitions
│   │   ├── App.tsx                    # Main app container & fullscreen coordinator
│   │   └── main.tsx                   # React entry point
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts                 # Dev server with /api proxy to localhost:5000
│   └── index.html
│
├── backend/                           # Node.js + Express Backend
│   ├── src/
│   │   ├── controllers/               # Chat (/api/chat) & Health (/api/health)
│   │   ├── routes/                    # Express Router definition
│   │   ├── middleware/                # CORS & sanitized error handling
│   │   ├── services/                  # Gemini & Groq backend AI integrations
│   │   ├── app.js                     # Express app setup (export without listen)
│   │   └── server.js                  # Standalone local dev server (port 5000)
│   ├── netlify/
│   │   └── functions/
│   │       └── api.js                 # Netlify Serverless Function (serverless-http)
│   ├── .env.example
│   └── package.json
│
├── netlify.toml                       # Build, serverless functions & /api rewrite rules
├── .gitignore                         # Secret, build, and node_modules protection
├── package.json                       # Root script orchestrator
└── README.md                          # Documentation & Deployment Guide
```

---

## 📋 Prerequisites

- **Node.js**: `v20.x` or higher (compatible with LTS `v18+`)
- **npm**: `v9.x` or higher
- **Git**
- A free **GitHub** account
- A free **Netlify** account ([netlify.com](https://www.netlify.com/))
- *(Optional)* Free AI Provider API Key:
  - [Google AI Studio (Gemini)](https://aistudio.google.com/app/apikey)
  - [Groq Console](https://console.groq.com/keys)

---

## 🛠️ Local Development Setup

### 1. Clone the Repository
```bash
git clone https://github.com/chathuwaX/lyra-voice-ai.git
cd lyra-voice-ai
```

### 2. Install Dependencies
Install dependencies for both frontend and backend:
```bash
# Install frontend packages
npm --prefix frontend install

# Install backend packages
npm --prefix backend install
```

### 3. Configure Local Environment Variables
Create your local environment files from the provided templates:

**Backend (`backend/.env`):**
```env
PORT=5000
NODE_ENV=development
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
```

**Frontend (`frontend/.env`):**
```env
# Optional in development (Vite automatically proxies /api to http://localhost:5000)
VITE_API_URL=/api
```

### 4. Run Locally

**Option A: Run Frontend & Backend Simultaneously**
Open two terminal windows:
```bash
# Terminal 1: Start Backend (Express on http://localhost:5000)
npm run dev:backend

# Terminal 2: Start Frontend (Vite on http://localhost:5173)
npm run dev:frontend
```

**Option B: Frontend Only (Client-Side Key Mode)**
If you want to run purely on the frontend without a local backend running, simply start:
```bash
npm run dev:frontend
```
You can enter your Gemini or Groq key directly into the in-app **Settings** modal.

---

## 🌐 Netlify Deployment (100% Free Plan)

### Step 1: Push Code to GitHub
Make sure all your latest changes are pushed to your GitHub repository:
```bash
git add .
git commit -m "feat: configure project for Netlify frontend + serverless Express deployment"
git push origin main
```

### Step 2: Connect Repository to Netlify
1. Log in to [Netlify](https://app.netlify.com/).
2. Click **"Add new site"** $\rightarrow$ **"Import an existing project"**.
3. Choose **GitHub** and authorize Netlify.
4. Select your repository: `lyra-voice-ai`.

### Step 3: Verify Build Settings
Netlify will automatically detect settings from [`netlify.toml`](./netlify.toml):
- **Base directory:** `frontend`
- **Build command:** `npm run build`
- **Publish directory:** `frontend/dist`
- **Functions directory:** `backend/netlify/functions`

*(If entering manually in the Netlify UI, use the values above).*

### Step 4: Configure Environment Variables in Netlify
1. In your Netlify Site dashboard, navigate to:
   **Site configuration** $\rightarrow$ **Environment variables** $\rightarrow$ **Add a variable**.
2. Add your keys:
   - `GEMINI_API_KEY`: Your Google Gemini API key.
   - `GROQ_API_KEY`: *(Optional)* Your Groq API key for ultra-fast ~20ms voice responses.
   - `NODE_ENV`: `production`

> **Security Note:** Secrets stored in Netlify Environment Variables stay exclusively on the secure serverless backend and are **never** exposed in the client-side JavaScript bundle.

### Step 5: Deploy
Click **"Deploy site"**. Netlify will:
1. Build the React + Vite frontend and generate static assets into `dist/`.
2. Bundle the Express application using `esbuild` into serverless function `api`.
3. Provide you with a live URL (e.g., `https://your-app-name.netlify.app/`).

---

## 🔍 How to Test the Production API

Once deployed, you can verify both frontend and backend through your browser or terminal:

1. **Backend Health Check:**
   Visit: `https://your-site.netlify.app/api/health`  
   Expected JSON response:
   ```json
   {
     "status": "ok",
     "service": "mira-voice-backend",
     "uptime": 12.4,
     "environment": "production",
     "providers": { "gemini": true, "groq": true }
   }
   ```

2. **Available Models Endpoint:**
   Visit: `https://your-site.netlify.app/api/models`

3. **Frontend Application:**
   Visit: `https://your-site.netlify.app/`
   - The 3D Digital Human will materialize in the center.
   - Click the microphone and ask a question to test live speech recognition, AI processing, and real-time lip synchronization.

---

## ⚙️ How Netlify Routing Works (`netlify.toml`)

Netlify uses same-domain rewrite rules to connect the static frontend with the serverless Express backend without CORS issues:

```toml
# 1. Forward /api/* requests directly to Express serverless function
[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/api/:splat"
  status = 200
  force = true

# 2. Forward all page routes to index.html for React SPA navigation
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

---

## 🚨 Troubleshooting Common Deployment Issues

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **`Page Not Found` on refresh** | Missing SPA rewrite rule | Handled by `/* -> /index.html 200` in `netlify.toml`. |
| **`/api/chat` returns 404** | Netlify functions path misconfigured | Ensure `netlify.toml` has `directory = "backend/netlify/functions"` and the redirect rule is present. |
| **`502 Bad Gateway` on `/api/*`** | Missing backend dependency or unhandled exception | Check Netlify Function logs in **Functions** tab; ensure `serverless-http` and `express` are in `backend/package.json`. |
| **Microphone not listening on mobile** | HTTPS required for Web Speech API | Netlify automatically provides free SSL/HTTPS on all `.netlify.app` domains. |
| **API Key Missing** | Variable not added in Netlify | Add `GEMINI_API_KEY` in Netlify **Environment variables** and trigger a re-deploy. Users can also enter a key in the app Settings modal. |

---

## 📄 License
MIT License. Open source and free to customize!
