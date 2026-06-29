<div align="center">

# 🔍 TruthLens

### AI-Powered Unbiased News Aggregator & Real-Time Fact-Checker

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-truthlens07.netlify.app-00C7B7?style=for-the-badge&logo=netlify&logoColor=white)](https://truthlens07.netlify.app/)
[![Built With](https://img.shields.io/badge/AI_Engine-Llama_3.3_70B-6366F1?style=for-the-badge&logo=meta&logoColor=white)](https://ai.azure.com/)
[![Firebase](https://img.shields.io/badge/Backend-Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-MIT-22C55E?style=for-the-badge)](LICENSE)

**TruthLens** is an AI-powered investigative journalism tool that aggregates live news from global sources, detects political bias, measures sensationalism, performs real-time fact-checking, and generates unbiased summaries — all powered by **Meta's Llama-3.3-70B-Instruct** running on Azure AI Studio.

<br>

> *"In a world drowning in information, TruthLens helps you see the truth."*

</div>

---

## 📸 Screenshots

| Login Gate | Investigation Dashboard |
|:-:|:-:|
| ![Login](https://via.placeholder.com/400x250/1a1a2e/e0e0e0?text=TruthLens+Login) | ![Dashboard](https://via.placeholder.com/400x250/1a1a2e/e0e0e0?text=AI+Analysis+Dashboard) |

---

## 🚀 Key Features

### 🧠 AI-Powered Bias Detection & Analysis
- Powered by **Meta Llama-3.3-70B-Instruct** via Azure AI Studio
- Classifies news articles across a **Political Bias Spectrum** (Left / Center / Right) with animated progress bars and an interactive SVG donut chart
- Computes a **Sensationalism Index** (0-100%) with a radial gauge visualization that detects clickbait, emotional manipulation, and exaggerated headlines
- Measures **Sentiment & Tone** on a scale from -100 (Negative) to +100 (Positive) with a live indicator slider

### 📰 Real-Time Live News Aggregation
- Fetches live, real-time news articles from **NewsAPI** with a dual-key failover system for uninterrupted service
- **Geo-filtered news feed** — filter articles by Country → State → City/District using cascading dropdowns powered by the CountriesNow API
- Intelligent **query auto-correction** powered by Llama AI — automatically fixes typos and spelling errors in search queries when no results are found

### 🔗 Direct URL & YouTube Video Analysis
- Paste any **news article URL** directly into the search bar — TruthLens scrapes the full article text using a multi-proxy CORS bypass chain and runs a complete bias audit
- Paste any **YouTube video URL** — extracts video metadata via oEmbed, fetches auto-generated captions/transcripts, and performs bias + fact-check analysis on the video content
- Supports standard YouTube links, shortened `youtu.be` links, and YouTube Shorts URLs

### ✅ Fact-Checked Claims Database
- Every investigation generates a structured **Fact-Check Table** with specific claims extracted from articles
- Each claim is tagged with a verdict badge: **True** (✅), **False** (❌), or **Misleading** (⚠️)
- Includes the source that reported each claim and a detailed AI analysis explaining the verdict

### 📊 Source Reliability Ledger
- Right sidebar displays a **Media Source Reliability Grid** for every outlet referenced in the analysis
- Each source card shows: **Bias alignment** (Left/Center/Right), **Reliability rating** (High/Mixed/Low), and a short justification
- Click any source card to open the outlet's homepage in a new tab for verification

### 💬 Conversational Follow-Up Q&A
- After any analysis, switch to **"Ask Follow-up"** mode to have a multi-turn conversation with the AI about the investigated topic
- Context-aware responses grounded in the actual articles and analysis — the AI never fabricates facts
- **AI-generated suggested follow-up questions** appear as clickable pills after every response, dynamically adapting to the conversation context
- Full chat history with styled user/AI bubbles and markdown list rendering

### 🌍 Multilingual Summary Support
- Generate summaries in **English**, **Hindi**, or **Spanish** via a single dropdown toggle
- Language selection also controls the output of fact-check analyses, suggested questions, and follow-up answers
- Seamlessly re-runs analysis in the selected language without fetching articles again

### 🎤 Voice Search (Speech-to-Text)
- Built-in **Web Speech API** voice dictation — click the microphone icon and speak your query
- Supports language-aware recognition: English (en-US), Hindi (hi-IN), and Spanish (es-ES)
- Auto-triggers analysis after successful speech recognition

### 🔊 Text-to-Speech (Read Aloud)
- Click **"Read Aloud"** to have the browser narrate the AI-generated summary using the Web Speech Synthesis API
- Supports multilingual narration matching the selected output language
- Toggle between play and stop with a single button

### 📥 Export Report (Print to PDF)
- One-click **"Export Report"** button generates a high-fidelity printable page view
- Uses `@media print` CSS rules to produce clean, professional PDF reports suitable for academic or editorial review

### 🔐 Authentication & User Accounts
- **Google Sign-In** via Firebase Authentication with popup-based OAuth flow
- **Judge Login** mode for hackathon reviewers — instant one-click access with no credentials required
- Dynamic personalized welcome: *"Let's investigate, [Your Name]"* — displays the user's Google profile first name or "Respected Judge" for judge logins

### 💾 Persistent Search History with Cloud Sync
- All investigations are automatically saved with full analysis data, chat logs, and article snapshots
- **Firebase Firestore** cloud sync — search history is tied to the authenticated user's UID and persists across devices and sessions
- **localStorage fallback** — works offline or when Firebase is unavailable
- Slide-in **History Drawer** accessible from the navigation bar with entry count badges
- Click any history entry to instantly restore the full investigation dashboard, news feed, and chat log
- **Re-analyze** button on each history entry to re-run a fresh live analysis with updated articles

### ⚡ Performance & Resilience
- **Dual API Key Failover** for NewsAPI — if the primary key hits rate limits (429), the system automatically switches to the backup key
- **Dynamic Mock Article Fallback** — if all API keys fail, the app generates realistic query-specific mock articles so it never shows empty states
- **Request deduplication** — concurrent identical queries share a single network request via `Map`-based promise caching
- **Auto-retry with exponential backoff** on Azure AI 503/429 responses (up to 3 attempts)
- **GPU-accelerated CSS animations** — all transitions use `transform` and `opacity` with `will-change` hints for buttery-smooth 60fps rendering on mobile
- **DOM fragment batching** — news cards and fact-check rows are assembled in `DocumentFragment` before a single DOM commit

---

## 🏗️ Architecture & Tech Stack

| Layer | Technology | Purpose |
|:--|:--|:--|
| **Frontend** | Vanilla HTML5, CSS3, JavaScript (ES2020+) | Zero-dependency, no-framework SPA |
| **AI Engine** | Meta Llama-3.3-70B-Instruct (Azure AI Studio) | Bias detection, fact-checking, summarization, follow-up Q&A |
| **News API** | NewsAPI.org (REST) | Real-time global news article aggregation |
| **Authentication** | Firebase Auth (Google OAuth 2.0) | User identity and session management |
| **Database** | Firebase Cloud Firestore | Persistent search history and user data sync |
| **Hosting** | Netlify (Static + Serverless Functions) | Production deployment with edge CDN |
| **Serverless Backend** | Netlify Functions (5 Lambda endpoints) | Secure API key proxying and server-side scraping |
| **Typography** | Google Fonts (Outfit + Plus Jakarta Sans) | Modern, premium visual aesthetic |
| **Icons** | Lucide Icons (SVG) | Lightweight, consistent iconography |

### Netlify Serverless Functions

| Function | Endpoint | Purpose |
|:--|:--|:--|
| `analyze.js` | `/.netlify/functions/analyze` | Proxies bias analysis requests to Azure Llama API |
| `followup.js` | `/.netlify/functions/followup` | Proxies conversational follow-up Q&A to Azure |
| `news.js` | `/.netlify/functions/news` | Proxies NewsAPI requests with dual-key failover |
| `correct.js` | `/.netlify/functions/correct` | Spelling auto-correction via Llama AI |
| `scrape.js` | `/.netlify/functions/scrape` | Server-side URL content scraping (CORS bypass) |

---

## 📂 Project Structure

```
TruthLens/
├── index.html                    # Single-page application entry point
├── style.css                     # Complete design system (~2900 lines)
├── app.js                        # Core application logic (~2576 lines)
├── assets/
│   ├── logo.png                  # TruthLens brand logo
│   ├── ai.png                    # AI robot icon for empty states
│   └── news.png                  # News feed empty state icon
├── netlify/
│   └── functions/
│       ├── analyze.js            # Llama bias analysis proxy
│       ├── followup.js           # Conversational Q&A proxy
│       ├── news.js               # NewsAPI proxy with failover
│       ├── correct.js            # Spelling correction proxy
│       └── scrape.js             # URL content scraper
├── netlify.toml                  # Netlify deployment configuration
├── .env                          # Environment variables (API keys)
├── .gitignore                    # Git ignore rules
└── fallback-reports.json         # Pre-cached analysis reports
```

---

## 🛠️ Getting Started

### Prerequisites
- A modern web browser (Chrome, Edge, Firefox, Safari)
- [Node.js](https://nodejs.org/) v18+ (only required for local Netlify Functions testing)
- API keys:
  - [NewsAPI](https://newsapi.org/) — free developer key
  - [Azure AI Studio](https://ai.azure.com/) — Llama-3.3-70B-Instruct deployment

### Quick Start (Local Development)

```bash
# 1. Clone the repository
git clone https://github.com/your-username/TruthLens.git
cd TruthLens

# 2. Open directly in browser (no build step required!)
#    On Windows:
start index.html
#    On macOS:
open index.html

# 3. (Optional) Run with Netlify Dev for serverless functions
npm install -g netlify-cli
netlify dev
```

> **Note:** API keys are pre-configured in the source code for instant out-of-the-box demo. You can update them via the **"+"** settings button in the search bar.

### Environment Variables (for Netlify deployment)

```env
AZURE_ENDPOINT=https://your-resource.services.ai.azure.com/openai/v1/chat/completions
AZURE_API_KEY=your-azure-api-key
NEWS_API_KEY=your-newsapi-key-1,your-newsapi-key-2
```

---

## 🎨 Design Philosophy

TruthLens is built with a **dark, premium glassmorphism aesthetic** inspired by modern intelligence dashboards:

- **Dark mode by default** with carefully curated HSL color palette
- **Glassmorphism panels** with `backdrop-filter: blur()` and subtle translucent borders
- **Hardware-accelerated animations** using CSS `transform` and `opacity` only — no layout thrashing
- **Staggered entry animations** on dashboard cards with `cubic-bezier(0.16, 1, 0.3, 1)` easing
- **Responsive three-column layout** that collapses to a single-column flex layout on mobile with reordered priority (search → feed → ledger)
- **Custom SVG visualizations** — donut charts, radial gauges, and sentiment sliders built with pure SVG and CSS transitions
- **Micro-interactions** — hover effects, scale transforms, and shadow transitions on every interactive element

---

## 📱 Mobile Responsiveness

TruthLens is fully responsive and optimized for mobile devices:

- Flexbox-based column reordering ensures the **search workspace appears first** on mobile
- Auto-scroll to analysis results when they load on small screens
- Touch-friendly tap targets and appropriately sized interactive elements
- History drawer adapts to full viewport width on mobile
- `prefers-reduced-motion` media query support for accessibility

---

## 🔒 Security

- All API keys are proxied through **Netlify serverless functions** in production — keys are never exposed to the client browser on the live site
- Firebase Authentication handles user identity securely with Google OAuth 2.0
- All user-generated content is sanitized via `escapeHTML()` before DOM insertion to prevent XSS attacks
- External links open with `noopener,noreferrer` attributes

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/your-username/TruthLens/issues).

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ for the Hackathon**

*TruthLens — Because every story has more than one side.*

</div>
