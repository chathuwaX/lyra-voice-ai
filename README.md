# Lyra — Antigravity Voice AI Assistant 🌌✨

A complete, production-ready talking AI Assistant web application with an ethereal antigravity aesthetic, real-time two-way voice conversations, and Google Gemini API integration.

![Lyra Preview](/public/avatar.png)

---

## 🌟 Key Features

### 1. Antigravity & Cinematic Visuals
- **Zero-Gravity Animation:** Floating circular avatar container with organic bobbing, gentle ambient pulse, and audio-reactive scale.
- **Dynamic HTML5 Canvas Particles & Orbs:** Translucent ambient light orbs and stardust particles drifting in the background.
- **4 Dynamic Theme Presets:**
  - **Antigravity Focus (Default):** Zero-gravity floating orbs, light particles, and soft ice-blue glow.
  - **Professional Assistant:** Clean minimal neutral studio look with subtle depth-of-field backdrop.
  - **Friendly & Warm:** Golden-hour warm ambient glow and cozy light gradients.
  - **Futuristic Minimal:** Crisp bioluminescent cyan & holographic silver environment.

### 2. Intelligent Real-Time Two-Way Voice
- **Voice Input (STT):**
  - **Push-to-Talk:** Click the glowing mic button or press **Spacebar**.
  - **Hands-Free Continuous Mode:** Seamless turn-taking where Lyra automatically listens again after answering.
  - **Live Interim Speech Bubble:** Visualizes transcribed speech in real-time as you talk.
  - **Text Input Fallback:** Built-in text bar for quiet environments or non-STT browsers.
- **Voice Output (TTS):**
  - Browser Speech Synthesis prioritizing natural female voices (e.g., Google US English, Jenny, Aria, Samantha).
  - Markdown stripping removes asterisks, headers, and code fences for natural spoken output.
  - Controls for rate, pitch, volume, and mute.
  - **"Interrupt / Stop Speaking"** button to cut in at any time.

### 3. Gemini AI Engine
- Powered by `@google/genai` (with direct REST fallback) using `gemini-2.5-flash`, `gemini-2.5-pro`, or `gemini-2.0-flash`.
- Custom conversational system prompt designed for natural spoken dialogue (concise 2–4 sentences, actively driving follow-up questions).
- In-app **API Key Settings Modal** (stored in `localStorage`) plus optional `.env` configuration.

### 4. Custom Avatar & Modular Architecture
- Upload your own custom headshot or avatar with 1-click reset to default.
- Interactive states: `Idle`, `Listening` (audio-reactive waveform bars + glowing halo), `Thinking` (orbiting stardust), and `Speaking` (rhythmic pulse).
- Easily swappable for D-ID video streams or Ready Player Me 3D avatars.

### 5. Glassmorphic Transcript Drawer
- Collapsible back-and-forth conversation log with timestamps, role badges, copy-to-clipboard, and "Clear Conversation".

---

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/chathuwaX/lyra-voice-ai.git
   cd lyra-voice-ai
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. (Optional) Set up your Gemini API key in `.env`:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```
   *Note: You can also enter and manage your API key directly in the web app's Settings modal without editing any files.*

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:5173/](http://localhost:5173/) in your browser.

---

## 🛠️ Tech Stack
- **Framework:** React 18 + Vite + TypeScript
- **Styling:** Tailwind CSS + Lucide Icons
- **AI SDK:** `@google/genai` (Gemini 2.5 Flash / Pro)
- **Audio APIs:** Web Speech API (`SpeechRecognition` & `SpeechSynthesis`) + Web Audio API (`AnalyserNode`)

---

## 📄 License
MIT License. Free to use, customize, and extend!
