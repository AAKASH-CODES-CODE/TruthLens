// --- TRUTHLENS CORE CONTROLLER & API INTEGRATION ---


// 1. App State (Prefilled with your active keys for instant out-of-the-box demo!)
const AppState = {
    azureEndpoint: "https://fakeakash07-6449-resource.services.ai.azure.com/openai/v1/chat/completions",
    azureKey: "BPcPvLry9IijTquY8soifOdlWHXfg93tkIQ7SrAoiEYZthWHIfKkJQQJ99CFACHYHv6XJ3w3AAAAACOGZEu5",
    newsKey: "41c1de81149f4e138b4e85814359478c",
    activeTopic: "",
    activeLanguage: "en",
    inputMode: "analyze",
    location: { country: "", state: "", city: "" }, // Scopes feed locally
    aggregatedArticles: [],
    analysisResult: null, // Stores the rich JSON output from Llama
    isSpeaking: false,
    synth: window.speechSynthesis,
    utterance: null,
    chatHistory: [], // Stores history list for the conversational follow-up
    searchHistory: [], // Stores saved history entries [{id, topic, timestamp, chatLog, summary}]
    newsCache: new Map(),
    analysisCache: new Map(),
    pendingNewsRequests: new Map(),
    pendingAnalysisRequests: new Map(),
    activeAnalysisRequestId: 0,
    latestRenderedSummaryKey: "",
    dynamicLocationMode: false,
    countriesData: [],
    domCache: {
        centerPane: null,
        gaugeFill: null
    }
};

// 2. DOM Selectors
const searchInput = document.getElementById("search-input");
const searchBtn = document.getElementById("search-btn"); // Might be null in new layout
const settingsBtn = document.getElementById("add-key-btn"); // Point to the plus button
const settingsModal = document.getElementById("settings-modal");
const closeModalBtn = document.getElementById("close-modal-btn");
const saveKeysBtn = document.getElementById("save-keys-btn");
const azureEndpointInput = document.getElementById("azure-endpoint-input");
const azureKeyInput = document.getElementById("azure-key-input");
const newsKeyInput = document.getElementById("news-key-input");
const globalLoader = document.getElementById("global-loader");
const loaderMessage = document.getElementById("loader-message");

const newsFeed = document.getElementById("news-feed");
const analysisDashboard = document.getElementById("analysis-dashboard");

// Metrics elements
const biasLeft = document.getElementById("bias-left");
const biasLeftVal = document.getElementById("bias-left-val");
const biasCenter = document.getElementById("bias-center");
const biasCenterVal = document.getElementById("bias-center-val");
const biasRight = document.getElementById("bias-right");
const biasRightVal = document.getElementById("bias-right-val");

const donutLeft = document.getElementById("donut-left");
const donutCenter = document.getElementById("donut-center");
const donutRight = document.getElementById("donut-right");

const sensationalismVal = document.getElementById("sensationalism-val");
const sensationalismBadge = document.getElementById("sensationalism-badge");
const sensationalismDesc = document.getElementById("sensationalism-desc");

const sentimentScoreVal = document.getElementById("sentiment-score-val");
const sentimentIndicator = document.getElementById("sentiment-indicator");
const sentimentDesc = document.getElementById("sentiment-desc");

// Content elements
const unbiasedSummaryContent = document.getElementById("unbiased-summary-content");
const factCheckRows = document.getElementById("fact-check-rows");
const sourcesReliabilityGrid = document.getElementById("sources-reliability-grid");
const speakBtn = document.getElementById("speak-btn");
const exportBtn = document.getElementById("export-btn");

const langSelect = document.getElementById("lang-select");
const micBtn = document.getElementById("mic-btn");
const modeAnalyzeBtn = document.getElementById("mode-analyze-btn");
const modeFollowupBtn = document.getElementById("mode-followup-btn");
const newTopicBtn = document.getElementById("new-topic-btn");
const searchHelperText = document.getElementById("search-helper-text");
const analysisStatusBar = document.getElementById("analysis-status-bar");
const currentTopicLabel = document.getElementById("current-topic-label");
const currentModeLabel = document.getElementById("current-mode-label");

// Navigation & Location elements
const headerLogoBtn = document.getElementById("header-logo-btn");
const homeNavBtn = document.getElementById("home-nav-btn");
const historyNavBtn = document.getElementById("history-nav-btn");
const chatCard = document.querySelector(".chat-card");

const toggleFilterBtn = document.getElementById("toggle-filter-btn");
const locationFilterPanel = document.getElementById("location-filter-panel");
const countryFilter = document.getElementById("country-filter");
const stateFilter = document.getElementById("state-filter");
const cityFilter = document.getElementById("city-filter");
const applyLocationBtn = document.getElementById("apply-location-btn");

const suggestedQuestions = document.getElementById("suggested-questions");
const chatThread = document.getElementById("chat-thread");
const judgeLoginBtn = document.getElementById("judge-login-btn");
const googleLoginBtn = document.getElementById("google-login-btn");
const loginScreen = document.getElementById("login-screen");
const mainApp = document.getElementById("main-app");
const logoutNavBtn = document.getElementById("logout-nav-btn");
const LOGIN_STORAGE_KEY = "truthlens_demo_login_role";

function getCenterPane() {
    if (!AppState.domCache.centerPane) {
        AppState.domCache.centerPane = document.querySelector(".center-content");
    }
    return AppState.domCache.centerPane;
}

function getGaugeFill() {
    if (!AppState.domCache.gaugeFill) {
        AppState.domCache.gaugeFill = document.getElementById("gauge-fill-path");
    }
    return AppState.domCache.gaugeFill;
}

function initializeLoginGate() {
    const savedRole = localStorage.getItem(LOGIN_STORAGE_KEY);

    if (savedRole) {
        unlockDashboardAccess(savedRole);
    } else {
        lockDashboardAccess();
    }

    if (judgeLoginBtn) {
        judgeLoginBtn.addEventListener("click", () => unlockDashboardAccess("judge"));
    }

    if (googleLoginBtn) {
        googleLoginBtn.addEventListener("click", () => unlockDashboardAccess("google"));
    }
}

function lockDashboardAccess() {
    if (loginScreen) loginScreen.classList.remove("hidden");
    if (mainApp) mainApp.classList.add("app-locked");
}

function unlockDashboardAccess(role) {
    localStorage.setItem(LOGIN_STORAGE_KEY, role);
    if (loginScreen) loginScreen.classList.add("hidden");
    if (mainApp) mainApp.classList.remove("app-locked");
    if (window.lucide && typeof lucide.createIcons === "function") {
        lucide.createIcons();
    }
}

// 3. Initialize App & Load Keys
window.addEventListener("DOMContentLoaded", () => {
    initializeLoginGate();
    loadKeys();
    loadSearchHistory();
    renderHistoryBadge();
    setInputMode("analyze");
    if (window.lucide) {
        lucide.createIcons();
    }

    // Set up Speech Synthesis termination on unload
    window.addEventListener("beforeunload", () => {
        if (AppState.synth) AppState.synth.cancel();
    });

    // Language dropdown select change binding
    if (langSelect) {
        langSelect.addEventListener("change", (e) => {
            AppState.activeLanguage = e.target.value;
            if (AppState.activeTopic) {
                startNewAnalysis(AppState.activeTopic);
            } else {
                renderSummarySection();
            }
        });
    }

    // Export button binding
    if (exportBtn) {
        exportBtn.addEventListener("click", exportAnalysisReport);
    }

    // Voice dictation using Web Speech API
    initializeVoiceDictation();

    // Home navigation listener
    if (homeNavBtn) homeNavBtn.addEventListener("click", goHome);
    if (headerLogoBtn) headerLogoBtn.addEventListener("click", goHome);

    // History navigation listener
    if (historyNavBtn) historyNavBtn.addEventListener("click", showHistory);

    // Logout listener
    if (logoutNavBtn) {
        logoutNavBtn.addEventListener("click", () => {
            localStorage.removeItem(LOGIN_STORAGE_KEY);
            lockDashboardAccess();
        });
    }

    // Search mode controls
    if (modeAnalyzeBtn) modeAnalyzeBtn.addEventListener("click", () => setInputMode("analyze"));
    if (modeFollowupBtn) modeFollowupBtn.addEventListener("click", () => setInputMode("followup"));
    if (newTopicBtn) newTopicBtn.addEventListener("click", goHome);

    // Toggle location panel
    if (toggleFilterBtn && locationFilterPanel) {
        toggleFilterBtn.addEventListener("click", () => {
            locationFilterPanel.classList.toggle("hidden");
        });
    }

    // Cascading Location Dropdowns Data (Fallback Local Dataset)
    const locationData = {
        "India": {
            "Delhi": ["Central Delhi", "East Delhi", "New Delhi", "North Delhi", "South Delhi"],
            "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Thane", "Nashik"],
            "Uttar Pradesh": ["Lucknow", "Kanpur", "Noida", "Ghaziabad", "Varanasi"],
            "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Darbhanga"],
            "Karnataka": ["Bengaluru", "Mysuru", "Hubballi", "Mangaluru", "Belagavi"]
        },
        "USA": {
            "California": ["Los Angeles", "San Francisco", "San Diego", "San Jose", "Sacramento"],
            "New York": ["New York City", "Buffalo", "Rochester", "Yonkers", "Syracuse"],
            "Texas": ["Houston", "San Antonio", "Dallas", "Austin", "Fort Worth"],
            "Florida": ["Miami", "Orlando", "Tampa", "Jacksonville", "Tallahassee"]
        },
        "UK": {
            "England": ["London", "Birmingham", "Manchester", "Leeds", "Liverpool"],
            "Scotland": ["Edinburgh", "Glasgow", "Aberdeen", "Dundee", "Inverness"],
            "Wales": ["Cardiff", "Swansea", "Newport", "Bangor", "St Asaph"]
        }
    };

    // Load countries dynamically from CountriesNow API or fall back to local dataset
    async function loadCountries() {
        try {
            const res = await fetch("https://countriesnow.space/api/v0.1/countries");
            if (!res.ok) throw new Error("API responded with error");
            const json = await res.json();
            if (json.error) throw new Error(json.msg);

            AppState.dynamicLocationMode = true;
            AppState.countriesData = json.data || [];

            if (countryFilter) {
                countryFilter.innerHTML = '<option value="">-- Select Country --</option>';
                AppState.countriesData.forEach(c => {
                    const opt = document.createElement("option");
                    opt.value = c.country;
                    opt.textContent = c.country;
                    countryFilter.appendChild(opt);
                });
            }
        } catch (e) {
            console.warn("CountriesNow API offline, loading curated local fallback:", e.message);
            AppState.dynamicLocationMode = false;
            if (countryFilter) {
                countryFilter.innerHTML = '<option value="">-- Select Country --</option>';
                Object.keys(locationData).forEach(country => {
                    const opt = document.createElement("option");
                    opt.value = country;
                    opt.textContent = country;
                    countryFilter.appendChild(opt);
                });
            }
        }
    }

    loadCountries();

    // Country dropdown selection handler
    if (countryFilter) {
        countryFilter.addEventListener("change", async () => {
            const selectedCountry = countryFilter.value;

            // Reset downstream dropdowns
            if (stateFilter) {
                stateFilter.innerHTML = '<option value="">-- Select State --</option>';
                stateFilter.disabled = !selectedCountry;
            }
            if (cityFilter) {
                cityFilter.innerHTML = '<option value="">-- Select District --</option>';
                cityFilter.disabled = true;
            }

            if (!selectedCountry) return;

            if (AppState.dynamicLocationMode) {
                try {
                    const res = await fetch("https://countriesnow.space/api/v0.1/countries/states", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ country: selectedCountry })
                    });
                    if (!res.ok) throw new Error("States fetch failed");
                    const json = await res.json();
                    if (json.error) throw new Error(json.msg);

                    const states = json.data.states || [];
                    if (states.length === 0) {
                        // Fallback directly to cities list for countries with no states defined
                        const countryObj = AppState.countriesData.find(c => c.country === selectedCountry);
                        if (countryObj && countryObj.cities && cityFilter) {
                            cityFilter.disabled = false;
                            countryObj.cities.forEach(city => {
                                const opt = document.createElement("option");
                                opt.value = city;
                                opt.textContent = city;
                                cityFilter.appendChild(opt);
                            });
                        }
                    } else if (stateFilter) {
                        states.forEach(state => {
                            const opt = document.createElement("option");
                            opt.value = state.name;
                            opt.textContent = state.name;
                            stateFilter.appendChild(opt);
                        });
                    }
                } catch (err) {
                    console.error("Error fetching states:", err);
                }
            } else {
                // Curated fallback mode
                if (stateFilter && locationData[selectedCountry]) {
                    Object.keys(locationData[selectedCountry]).forEach(state => {
                        const opt = document.createElement("option");
                        opt.value = state;
                        opt.textContent = state;
                        stateFilter.appendChild(opt);
                    });
                }
            }
        });
    }

    // State dropdown selection handler
    if (stateFilter) {
        stateFilter.addEventListener("change", async () => {
            const selectedCountry = countryFilter ? countryFilter.value : "";
            const selectedState = stateFilter.value;

            if (cityFilter) {
                cityFilter.innerHTML = '<option value="">-- Select District --</option>';
                cityFilter.disabled = !selectedState;
            }

            if (!selectedCountry || !selectedState) return;

            if (AppState.dynamicLocationMode) {
                try {
                    const res = await fetch("https://countriesnow.space/api/v0.1/countries/state/cities", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ country: selectedCountry, state: selectedState })
                    });
                    if (!res.ok) throw new Error("Cities fetch failed");
                    const json = await res.json();
                    if (json.error) throw new Error(json.msg);

                    const cities = json.data || [];
                    if (cityFilter) {
                        cities.forEach(city => {
                            const opt = document.createElement("option");
                            opt.value = city;
                            opt.textContent = city;
                            cityFilter.appendChild(opt);
                        });
                    }
                } catch (err) {
                    console.error("Error fetching cities:", err);
                }
            } else {
                // Curated fallback mode
                if (cityFilter && locationData[selectedCountry] && locationData[selectedCountry][selectedState]) {
                    const cities = locationData[selectedCountry][selectedState] || [];
                    cities.forEach(city => {
                        const opt = document.createElement("option");
                        opt.value = city;
                        opt.textContent = city;
                        cityFilter.appendChild(opt);
                    });
                }
            }
        });
    }

    // Apply location filter listener
    if (applyLocationBtn) {
        applyLocationBtn.addEventListener("click", () => {
            AppState.location.country = (countryFilter ? countryFilter.value.trim() : "");
            AppState.location.state = (stateFilter ? stateFilter.value.trim() : "");
            AppState.location.city = (cityFilter ? cityFilter.value.trim() : "");

            // Hide filter drawer after applying
            if (locationFilterPanel) locationFilterPanel.classList.add("hidden");

            refreshNewsFeed();
        });
    }

    // Load trending articles silently in the background on startup
    loadInitialTrendingNews();
});

async function loadInitialTrendingNews() {
    if (!AppState.newsKey) {
        AppState.aggregatedArticles = [];
        renderNewsFeed();
        return;
    }

    try {
        const defaultArticles = await fetchNewsArticles("latest global news");
        AppState.aggregatedArticles = defaultArticles;
        renderNewsFeed();
    } catch (e) {
        console.warn("Failed to load initial news:", e);
        AppState.aggregatedArticles = [];
        renderNewsFeed();
    }
}

function loadKeys() {
    AppState.azureEndpoint = localStorage.getItem("truthlens_azure_endpoint") || AppState.azureEndpoint;
    AppState.azureKey = localStorage.getItem("truthlens_azure_key") || AppState.azureKey;
    AppState.newsKey = localStorage.getItem("truthlens_news_key") || AppState.newsKey;

    if (azureEndpointInput) azureEndpointInput.value = AppState.azureEndpoint;
    if (azureKeyInput) azureKeyInput.value = AppState.azureKey;
    if (newsKeyInput) newsKeyInput.value = AppState.newsKey;
}

// 4. Modal Event Listeners
if (settingsBtn) settingsBtn.addEventListener("click", showModal);
if (closeModalBtn) closeModalBtn.addEventListener("click", hideModal);
if (saveKeysBtn) saveKeysBtn.addEventListener("click", saveKeys);

function showModal() {
    if (settingsModal) settingsModal.classList.remove("hidden");
}

function hideModal() {
    if (settingsModal) settingsModal.classList.add("hidden");
}

function saveKeys() {
    const endPoint = azureEndpointInput.value.trim();
    const aKey = azureKeyInput.value.trim();
    const nKey = newsKeyInput.value.trim();

    localStorage.setItem("truthlens_azure_endpoint", endPoint);
    localStorage.setItem("truthlens_azure_key", aKey);
    localStorage.setItem("truthlens_news_key", nKey);

    AppState.azureEndpoint = endPoint;
    AppState.azureKey = aKey;
    AppState.newsKey = nKey;

    hideModal();
    alert("API credentials saved. TruthLens status has been updated.");
}

// Close modal if user clicks outside of the modal box
window.addEventListener("click", (e) => {
    if (settingsModal && e.target === settingsModal) {
        hideModal();
    }

    const newsCard = e.target.closest?.(".news-card");
    if (newsCard?.dataset?.url) {
        window.open(newsCard.dataset.url, "_blank", "noopener,noreferrer");
    }
});

function setInputMode(mode) {
    const canUseFollowup = Boolean(AppState.activeTopic && AppState.analysisResult);
    AppState.inputMode = mode === "followup" && canUseFollowup ? "followup" : "analyze";

    if (modeAnalyzeBtn) modeAnalyzeBtn.classList.toggle("active", AppState.inputMode === "analyze");
    if (modeFollowupBtn) modeFollowupBtn.classList.toggle("active", AppState.inputMode === "followup");
    if (searchBtn) {
        searchBtn.textContent = AppState.inputMode === "followup" ? "Ask" : "Analyze";
        searchBtn.title = AppState.inputMode === "followup" ? "Ask follow-up" : "Analyze topic";
    }

    if (searchHelperText) {
        searchHelperText.textContent = AppState.inputMode === "followup"
            ? "Ask deeper questions about the current investigation, source motives, data points, or policy impact."
            : "Use Analyze Topic for a fresh story audit with news aggregation, bias mapping, and fact-checking.";
    }

    if (newTopicBtn) {
        const showFreshButton = Boolean(AppState.activeTopic || AppState.analysisResult);
        newTopicBtn.classList.toggle("hidden", !showFreshButton);
    }

    updateAnalysisStatusBar();
}

function updateAnalysisStatusBar(topic = AppState.activeTopic) {
    if (!analysisStatusBar || !currentTopicLabel || !currentModeLabel) return;

    if (!topic) {
        analysisStatusBar.classList.add("hidden");
        currentTopicLabel.textContent = "No topic selected";
        currentModeLabel.textContent = "Waiting for input";
        return;
    }

    analysisStatusBar.classList.remove("hidden");
    currentTopicLabel.textContent = topic;
    currentModeLabel.textContent = AppState.inputMode === "followup" ? "Follow-up mode" : "Fresh analysis";
}

// Voice dictation initialization helper
function initializeVoiceDictation() {
    if (!micBtn || !searchInput) return;

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        console.warn("Web Speech API Recognition is not supported by this browser.");
        micBtn.style.display = "none";
        return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    let isListening = false;

    recognition.onstart = () => {
        isListening = true;
        micBtn.classList.add("mic-active");
        searchInput.placeholder = "Listening... Speak clearly.";
    };

    recognition.onend = () => {
        isListening = false;
        micBtn.classList.remove("mic-active");
        searchInput.placeholder = "Ask TruthLens...";
    };

    recognition.onerror = (e) => {
        console.error("Speech Recognition error:", e.error);
        isListening = false;
        micBtn.classList.remove("mic-active");
        searchInput.placeholder = "Ask TruthLens...";
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        searchInput.value = transcript;
        performAnalysis(); // Auto-trigger search analysis!
    };

    micBtn.addEventListener("click", () => {
        if (isListening) {
            recognition.stop();
        } else {
            // Set recognition language based on active dropdown select
            if (AppState.activeLanguage === "hi") recognition.lang = "hi-IN";
            else if (AppState.activeLanguage === "es") recognition.lang = "es-ES";
            else recognition.lang = "en-US";

            recognition.start();
        }
    });
}

// 5. Search / Analyze Trigger
if (searchBtn) searchBtn.addEventListener("click", performAnalysis);
if (searchInput) {
    searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            performAnalysis();
        }
    });
}

async function performAnalysis() {
    if (!searchInput) return;

    const query = searchInput.value.trim();
    if (!query) {
        alert("Please enter a news topic to analyze.");
        return;
    }

    if (AppState.inputMode === "followup" && AppState.activeTopic && AppState.analysisResult) {
        submitFollowUp(query);
        return;
    }

    // Detect if user pasted a URL
    const urlPattern = /^https?:\/\//i;
    if (urlPattern.test(query)) {
        await startURLAnalysis(query);
    } else {
        await startNewAnalysis(query);
    }
}

// --- URL / YouTube Direct Link Analysis ---

function isYouTubeURL(url) {
    return /(?:youtube\.com\/watch|youtu\.be\/|youtube\.com\/shorts\/)/i.test(url);
}

function extractYouTubeVideoId(url) {
    const patterns = [
        /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
        /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/
    ];
    for (const p of patterns) {
        const m = url.match(p);
        if (m) return m[1];
    }
    return null;
}

async function fetchHtmlFromURL(url) {
    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";

    if (!isLocalhost) {
        // Use our secure server-side scrape function on live Netlify domain to bypass CORS/403/Blocks completely
        const scrapeUrl = `/.netlify/functions/scrape?url=${encodeURIComponent(url)}`;
        const res = await fetch(scrapeUrl);
        if (!res.ok) {
            throw new Error(`Scraper failed to load page content. Netlify proxy returned status ${res.status}`);
        }
        return await res.text();
    }

    // Local fallback using public CORS proxies (when testing on localhost)
    let lastError = null;

    // 1. Try corsproxy.io (direct, very fast)
    try {
        const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
        if (res.ok) return await res.text();
    } catch (e) {
        console.warn("corsproxy.io failed:", e.message);
        lastError = e;
    }

    // 2. Try allorigins.win JSON wrapper endpoint (highly stable, avoids 522/Cloudflare blocks)
    try {
        const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
        if (res.ok) {
            const json = await res.json();
            if (json.contents) return json.contents;
        }
    } catch (e) {
        console.warn("allorigins.win JSON failed:", e.message);
        lastError = e;
    }

    // 3. Try codetabs proxy as final fallback
    try {
        const res = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`);
        if (res.ok) return await res.text();
    } catch (e) {
        console.warn("codetabs failed:", e.message);
        lastError = e;
    }

    throw lastError || new Error("Failed to fetch URL content through all available CORS proxies.");
}

async function fetchYouTubeContent(url) {
    const videoId = extractYouTubeVideoId(url);
    if (!videoId) throw new Error("Could not extract YouTube video ID from URL.");

    // 1. Get metadata via oEmbed
    const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const metaRes = await fetch(oembedUrl);
    let title = "YouTube Video";
    let author = "Unknown";
    if (metaRes.ok) {
        const meta = await metaRes.json();
        title = meta.title || title;
        author = meta.author_name || author;
    }

    // 2. Try to fetch captions/transcript
    let transcript = "";
    try {
        const html = await fetchHtmlFromURL(`https://www.youtube.com/watch?v=${videoId}`);
        // Extract caption tracks URL from page source
        const captionMatch = html.match(/"captionTracks":\s*(\[.*?\])/);
        if (captionMatch) {
            const tracks = JSON.parse(captionMatch[1]);
            if (tracks.length > 0) {
                const captionUrl = tracks[0].baseUrl;
                const capXml = await fetchHtmlFromURL(captionUrl);
                // Extract text from XML caption format
                transcript = capXml.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, " ").trim();
            }
        }
    } catch (e) {
        console.warn("Could not fetch YouTube transcript:", e.message);
    }

    return {
        type: "youtube",
        title: title,
        source: `YouTube - ${author}`,
        url: url,
        content: transcript
            ? `Video Title: ${title}\nChannel: ${author}\n\nTranscript:\n${transcript.slice(0, 6000)}`
            : `Video Title: ${title}\nChannel: ${author}\n\n(No transcript available. Analysis will be based on title and metadata only.)`,
        description: `YouTube video by ${author}: ${title}`
    };
}

async function fetchURLContent(url) {
    const html = await fetchHtmlFromURL(url);

    // Parse HTML and extract meaningful text
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // Extract title
    const title = doc.querySelector("title")?.textContent?.trim() || "Untitled Page";

    // Extract meta description
    const metaDesc = doc.querySelector('meta[name="description"]')?.getAttribute("content")
        || doc.querySelector('meta[property="og:description"]')?.getAttribute("content")
        || "";

    // Extract main article text from <article>, <main>, or <body> paragraphs
    let articleText = "";
    const articleEl = doc.querySelector("article") || doc.querySelector("main") || doc.body;
    if (articleEl) {
        const paragraphs = articleEl.querySelectorAll("p");
        const texts = [];
        paragraphs.forEach(p => {
            const t = p.textContent.trim();
            if (t.length > 30) texts.push(t); // skip tiny/empty paragraphs
        });
        articleText = texts.join("\n\n");
    }

    // Extract source name from og:site_name or domain
    const siteName = doc.querySelector('meta[property="og:site_name"]')?.getAttribute("content")
        || new URL(url).hostname.replace("www.", "");

    return {
        type: "url",
        title: title,
        source: siteName,
        url: url,
        content: articleText.slice(0, 6000) || metaDesc || title,
        description: metaDesc || title
    };
}

async function startURLAnalysis(url) {
    const requestId = ++AppState.activeAnalysisRequestId;

    AppState.activeTopic = url;
    AppState.chatHistory = [];
    AppState.analysisResult = null;
    AppState.latestRenderedSummaryKey = "";
    if (chatCard) {
        chatCard.classList.add("hidden");
        chatCard.classList.remove("active");
    }
    setInputMode("analyze");
    updateAnalysisStatusBar(url);

    if (chatThread) {
        chatThread.innerHTML = `<div class="chat-placeholder">Ask any follow-up question in the search bar above to start a conversation about this article.</div>`;
    }
    if (suggestedQuestions) {
        suggestedQuestions.innerHTML = "";
        suggestedQuestions.classList.add("hidden");
    }

    stopSpeaking();

    try {
        let extracted;

        if (isYouTubeURL(url)) {
            showLoader("Extracting YouTube video content & transcript...");
            extracted = await fetchYouTubeContent(url);
        } else {
            showLoader("Fetching article content from URL...");
            extracted = await fetchURLContent(url);
        }

        if (requestId !== AppState.activeAnalysisRequestId) return;

        // Create a pseudo-article for the news feed and Llama context
        const pseudoArticle = {
            title: extracted.title,
            source: extracted.source,
            description: extracted.description,
            url: extracted.url
        };
        AppState.aggregatedArticles = [pseudoArticle];
        renderNewsFeed();

        // Build articles array with full extracted content for Llama
        const articlesForAI = [{
            title: extracted.title,
            source: extracted.source,
            description: extracted.content
        }];

        showLoader("Running AI Bias & Fact-Checking Analysis on article...");
        const topicLabel = extracted.title || url;
        const normalizedTopic = topicLabel.toLowerCase().trim();
        const analysisResult = await runAIAnalysis(normalizedTopic, topicLabel, articlesForAI);
        if (requestId !== AppState.activeAnalysisRequestId) return;

        AppState.analysisResult = analysisResult;
        renderAnalysisDashboard();

        const centerPane = getCenterPane();
        if (centerPane) {
            centerPane.classList.add("has-results");
        }

        setInputMode("followup");
        updateAnalysisStatusBar(topicLabel);

        // Save to persistent history
        const summaryText = (analysisResult.summary || analysisResult.summary_en || [])[0] || "";
        saveToHistory(url, AppState.chatHistory, summaryText);

    } catch (e) {
        if (requestId !== AppState.activeAnalysisRequestId) return;
        console.error("URL Analysis failed:", e);
        AppState.activeTopic = "";
        AppState.analysisResult = null;
        setInputMode("analyze");
        alert(`URL Analysis Error: ${e.message}`);
    } finally {
        if (requestId === AppState.activeAnalysisRequestId) {
            hideLoader();
        }
    }
}

async function startNewAnalysis(query) {
    const requestId = ++AppState.activeAnalysisRequestId;
    const normalizedQuery = query.toLowerCase().trim();

    AppState.activeTopic = query;
    AppState.chatHistory = [];
    AppState.analysisResult = null;
    AppState.latestRenderedSummaryKey = "";
    if (chatCard) {
        chatCard.classList.add("hidden");
        chatCard.classList.remove("active");
    }
    setInputMode("analyze");
    updateAnalysisStatusBar(query);

    if (chatThread) {
        chatThread.innerHTML = `<div class="chat-placeholder">Ask any follow-up question in the search bar above to start a conversation about this news topic.</div>`;
    }

    if (suggestedQuestions) {
        suggestedQuestions.innerHTML = "";
        suggestedQuestions.classList.add("hidden");
    }

    stopSpeaking();
    showLoader("Aggregating global news articles...");

    try {
        const articles = await fetchNewsArticles(query);
        if (requestId !== AppState.activeAnalysisRequestId) return;

        AppState.aggregatedArticles = articles;
        renderNewsFeed();

        showLoader("Running AI Bias & Fact-Checking Analysis...");
        const analysisResult = await runAIAnalysis(normalizedQuery, query, articles);
        if (requestId !== AppState.activeAnalysisRequestId) return;

        AppState.analysisResult = analysisResult;
        renderAnalysisDashboard();

        const centerPane = getCenterPane();
        if (centerPane) {
            centerPane.classList.add("has-results");
        }

        setInputMode("followup");
        updateAnalysisStatusBar(query);

        // Save to persistent history
        const summaryText = (analysisResult.summary || analysisResult.summary_en || [])[0] || "";
        saveToHistory(query, AppState.chatHistory, summaryText);

    } catch (e) {
        if (requestId !== AppState.activeAnalysisRequestId) return;

        console.error("Analysis sequence failed:", e);
        AppState.activeTopic = "";
        AppState.analysisResult = null;
        setInputMode("analyze");
        alert(`An error occurred: ${e.message}`);
    } finally {
        if (requestId === AppState.activeAnalysisRequestId) {
            hideLoader();
        }
    }
}

let globalLoaderInterval = null;

function showLoader(msg) {
    if (!globalLoader || !loaderMessage) return;

    if (globalLoaderInterval) {
        clearInterval(globalLoaderInterval);
    }

    const steps = [
        "Connecting to global news servers...",
        "Fetching top articles and editorial coverage...",
        "Initiating Llama-3.3-70B classifier pipeline...",
        "Measuring political bias distribution...",
        "Evaluating sensationalism & clickbait thresholds...",
        "Fact-checking primary claims against scientific consensus...",
        "Formatting unbiased summary (English/Hindi/Spanish)...",
        "Finalizing dashboard visualization cards..."
    ];

    let stepIdx = 0;
    loaderMessage.textContent = msg || steps[0];
    
    // Restart GPU-accelerated CSS animation loop
    loaderMessage.style.animation = "none";
    loaderMessage.offsetHeight; // trigger reflow
    loaderMessage.style.animation = "premium-text-change 3s infinite";
    
    globalLoader.classList.remove("hidden");

    globalLoaderInterval = setInterval(() => {
        stepIdx++;
        if (stepIdx < steps.length) {
            loaderMessage.textContent = steps[stepIdx];
        } else {
            loaderMessage.textContent = "Synthesizing findings...";
        }
    }, 3000);
}

function hideLoader() {
    if (!globalLoader) return;

    if (globalLoaderInterval) {
        clearInterval(globalLoaderInterval);
        globalLoaderInterval = null;
    }
    if (loaderMessage) {
        loaderMessage.style.animation = "none";
    }
    globalLoader.classList.add("hidden");
}


// 6. News Aggregator API Fetch (with local Mock fallback)
async function fetchNewsArticles(query) {
    const normalizedQuery = query.toLowerCase().trim();
    if (AppState.newsCache.has(normalizedQuery)) {
        return AppState.newsCache.get(normalizedQuery);
    }

    if (AppState.pendingNewsRequests.has(normalizedQuery)) {
        return AppState.pendingNewsRequests.get(normalizedQuery);
    }

    const requestPromise = (async () => {
        let response;
        const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
        if (!isLocalhost || !AppState.newsKey) {
            // Live hosted site or no local key, use Netlify Serverless Function proxy
            const functionUrl = `/.netlify/functions/news?q=${encodeURIComponent(query)}`;
            response = await fetch(functionUrl);
            if (!response.ok) {
                throw new Error("NewsAPI key is required. Serverless function returned error: " + response.statusText);
            }
            return await response.json();
        } else {
            // Direct browser fetch (allowed only on localhost)
            const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&pageSize=6&sortBy=relevancy&language=en&apiKey=${AppState.newsKey}`;
            response = await fetch(url);
            if (!response.ok) {
                throw new Error(`NewsAPI responded with status ${response.status}`);
            }
            const data = await response.json();
            if (data.status !== "ok") {
                throw new Error(data.message || "NewsAPI returned an error");
            }
            if (!data.articles || data.articles.length === 0) {
                throw new Error("No live articles found matching this topic.");
            }
            return data.articles.map((art) => ({
                title: art.title,
                source: art.source?.name || "Unknown Source",
                description: art.description || "No description available.",
                url: art.url
            }));
        }
    })();

    AppState.pendingNewsRequests.set(normalizedQuery, requestPromise);

    try {
        const result = await requestPromise;
        AppState.newsCache.set(normalizedQuery, result);
        return result;
    } finally {
        AppState.pendingNewsRequests.delete(normalizedQuery);
    }
}

// Render left news feed column
function renderNewsFeed() {
    if (!newsFeed) return;

    if (AppState.aggregatedArticles.length === 0) {
        newsFeed.innerHTML = `
            <div class="empty-state">
                <i data-lucide="newspaper" style="width: 32px; height: 32px; opacity: 0.15; margin-bottom: 10px;"></i>
                <p>No articles loaded.</p>
            </div>
        `;
        if (window.lucide) {
            lucide.createIcons();
        }
        return;
    }

    const fragment = document.createDocumentFragment();

    AppState.aggregatedArticles.forEach((art) => {
        const card = document.createElement("div");
        card.className = "news-card glass-inset";
        card.innerHTML = `
            <div class="news-card-header">
                <span class="source-pill">${escapeHTML(art.source)}</span>
            </div>
            <h3 class="card-title">${escapeHTML(art.title)}</h3>
            <p class="card-desc">${escapeHTML(art.description)}</p>
        `;
        card.dataset.url = art.url;
        fragment.appendChild(card);
    });

    newsFeed.replaceChildren(fragment);
}


// 7. Azure Llama-3.3-70B AI Analysis (with Auto-Retry, Caching, and Pre-cached Database)
async function runAIAnalysis(normalizedTopic, topicLabel, articles) {
    if (AppState.pendingAnalysisRequests.has(normalizedTopic)) {
        return AppState.pendingAnalysisRequests.get(normalizedTopic);
    }

    const langNameMap = { "en": "English", "hi": "Hindi", "es": "Spanish" };
    const activeLangName = langNameMap[AppState.activeLanguage] || "English";

    const requestPromise = (async () => {
        let responseText;

        const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
        if (!isLocalhost || !AppState.azureEndpoint || !AppState.azureKey) {
            // Live hosted site or no local keys, use Netlify Serverless Function proxy
            const res = await fetch("/.netlify/functions/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    topicLabel: topicLabel,
                    articles: articles,
                    lang: AppState.activeLanguage
                })
            });
            if (!res.ok) {
                throw new Error("Azure credentials are required. Serverless function returned error: " + res.statusText);
            }
            const data = await res.json();
            responseText = data.content;
        } else {
            // Build prompt with articles
            const articlesText = articles.map((art, idx) => `
Article [${idx + 1}]:
Title: ${art.title}
Source: ${art.source}
Description: ${art.description}
`).join("\n");
            const prompt = `
You are a professional news bias classifier and fact-checking AI agent. 
Read these news articles gathered on the topic: "${topicLabel}" and perform a bias audit and fact-check.

Articles Data:
${articlesText}

Analyze the bias of these sources combined.
You must return a JSON object (strictly raw JSON, do NOT wrap it in markdown code blocks like \`\`\`json, just start with { and end with }). Use this structure exactly:
{
  "bias": {
    "left": <integer_percentage_of_left_leaning_tone_0_to_100>,
    "center": <integer_percentage_of_neutral_tone_0_to_100>,
    "right": <integer_percentage_of_right_leaning_tone_0_to_100>
  },
  "sensationalism": <integer_percentage_of_clickbait_emotional_charge_0_to_100>,
  "sensationalismDesc": "<short description of sensationalism level in ${activeLangName}>",
  "sentiment": <integer_sentiment_score_from_-100_to_100>,
  "sentimentDesc": "<Positive or Negative or Neutral in ${activeLangName}>",
  "summary": [
    "A concise, detailed summary of the major event reported (2-3 sentences packed with specific facts and figures in ${activeLangName}). Give a clear explanation of what happened.",
    "A concise bullet point explaining the primary arguments and data presented by left-leaning or progressive sources (2-3 sentences in ${activeLangName}).",
    "A concise bullet point explaining the primary arguments and data presented by right-leaning or conservative sources (2-3 sentences in ${activeLangName})."
  ],
  "suggestedFollowUps": [
    "Suggested follow-up question 1 based on the specific facts/controversies of these articles (written strictly in ${activeLangName})",
    "Suggested follow-up question 2 (written strictly in ${activeLangName})",
    "Suggested follow-up question 3 (written strictly in ${activeLangName})"
  ],
  "claims": [
    {
      "claim": "Specific factual claim reported in the articles (written in ${activeLangName})",
      "reportedBy": "Source Name",
      "verdict": "true" or "false" or "misleading",
      "analysis": "Short fact-checked analysis explaining why (written in ${activeLangName})."
    }
  ],
  "sources": [
    {
      "source": "Source Name (e.g. BBC News)",
      "url": "Main homepage URL of this news source (e.g. https://www.bbc.com)",
      "bias": "left" or "center" or "right",
      "reliability": "High" or "Mixed" or "Low",
      "reason": "Short reason explaining reliability rating based on facts (written in ${activeLangName})."
    }
  ]
}

Make sure left + center + right in the bias object sum to exactly 100. Write all free-text fields (summary bullet points, claim, analysis, sensationalismDesc, sentimentDesc, reason) strictly in ${activeLangName}.
`;

            const url = AppState.azureEndpoint;
            const maxRetries = 3;
            const retryDelayMs = 1500;
            let lastError = null;
            let success = false;

            for (let attempt = 1; attempt <= maxRetries; attempt++) {
                try {
                    const response = await fetch(url, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "api-key": AppState.azureKey
                        },
                        body: JSON.stringify({
                            messages: [
                                {
                                    role: "system",
                                    content: "You are a professional news bias classifier and fact-checking AI agent. Return only valid raw JSON with double-quoted keys and strings. Do not include markdown, comments, or trailing commas."
                                },
                                {
                                    role: "user",
                                    content: prompt
                                }
                            ],
                            model: "Llama-3.3-70B-Instruct",
                            max_tokens: 3000,
                            temperature: 0.1
                        })
                    });

                    if ((response.status === 503 || response.status === 429) && attempt < maxRetries) {
                        console.warn(`Azure API busy (Status ${response.status}). Retrying attempt ${attempt + 1}/${maxRetries} in ${retryDelayMs}ms...`);
                        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
                        continue;
                    }

                    if (!response.ok) {
                        throw new Error(`Azure API responded with status ${response.status}`);
                    }

                    const data = await response.json();
                    responseText = extractModelText(data);
                    if (!responseText) {
                        console.error("Azure raw response:", data);
                        throw new Error("Azure AI returned an empty or invalid response.");
                    }
                    success = true;
                    break;
                } catch (e) {
                    lastError = e;
                    console.error(`Attempt ${attempt} failed:`, e.message);
                    if (attempt < maxRetries) {
                        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
                    }
                }
            }

            if (!success) {
                throw new Error(lastError?.message || "Live AI analysis failed after multiple attempts.");
            }
        }

        const jsonResult = parseAnalysisResponse(responseText);
        validateAnalysisPayload(jsonResult);
        return jsonResult;
    })();

    AppState.pendingAnalysisRequests.set(normalizedTopic, requestPromise);

    try {
        return await requestPromise;
    } finally {
        AppState.pendingAnalysisRequests.delete(normalizedTopic);
    }
}

function validateAnalysisPayload(payload) {
    if (!payload || typeof payload !== "object") {
        throw new Error("AI returned an invalid analysis payload.");
    }

    const hasBias = payload.bias && typeof payload.bias.left === "number" && typeof payload.bias.center === "number" && typeof payload.bias.right === "number";
    const hasSummary = Array.isArray(payload.summary) || Array.isArray(payload.summary_en);
    const hasClaims = Array.isArray(payload.claims);
    const hasSources = Array.isArray(payload.sources);

    if (!hasBias || !hasSummary || !hasClaims || !hasSources) {
        throw new Error("AI response format was incomplete.");
    }
}

// 8. Render Dashboard Output Elements
function renderAnalysisDashboard() {
    if (analysisDashboard) analysisDashboard.classList.remove("hidden");

    const res = AppState.analysisResult;
    if (!res) return;

    // Reset elements to zero state for animation
    biasLeft.style.width = "0%";
    biasLeftVal.textContent = "0%";
    biasCenter.style.width = "0%";
    biasCenterVal.textContent = "0%";
    biasRight.style.width = "0%";
    biasRightVal.textContent = "0%";

    donutLeft.style.strokeDasharray = `0 251.2`;
    donutCenter.style.strokeDasharray = `0 251.2`;
    donutRight.style.strokeDasharray = `0 251.2`;

    const gaugeFill = getGaugeFill();
    if (gaugeFill) {
        gaugeFill.style.strokeDasharray = `0 188.4`;
    }
    sentimentIndicator.style.left = "50%";

    // Trigger transitions via repaint frame
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            biasLeft.style.width = `${res.bias.left}%`;
            biasLeftVal.textContent = `${res.bias.left}%`;
            biasCenter.style.width = `${res.bias.center}%`;
            biasCenterVal.textContent = `${res.bias.center}%`;
            biasRight.style.width = `${res.bias.right}%`;
            biasRightVal.textContent = `${res.bias.right}%`;

            animateDonutChart(res.bias.left, res.bias.center, res.bias.right);

            sensationalismVal.textContent = `${res.sensationalism}%`;
            if (sensationalismBadge) {
                let rating = "Low";
                if (res.sensationalism > 60) rating = "High";
                else if (res.sensationalism > 30) rating = "Moderate";
                sensationalismBadge.textContent = rating;
            }
            if (sensationalismDesc) {
                sensationalismDesc.textContent = res.sensationalismDesc || "No sensationalism detected.";
            }
            if (gaugeFill) {
                const gaugeLength = 188.4;
                const fillLength = (res.sensationalism / 100) * gaugeLength;
                gaugeFill.style.strokeDasharray = `${fillLength} 188.4`;
            }

            let sentimentLabel = "Neutral";
            const scoreVal = res.sentiment !== undefined ? res.sentiment : 0;
            if (scoreVal > 20) sentimentLabel = "Positive";
            else if (scoreVal < -20) sentimentLabel = "Negative";

            if (sentimentScoreVal) {
                sentimentScoreVal.textContent = sentimentLabel;
            }
            if (sentimentDesc) {
                sentimentDesc.textContent = res.sentimentDesc || "Neutral tone across articles.";
            }
            const percentagePos = ((scoreVal + 100) / 200) * 100;
            sentimentIndicator.style.left = `${percentagePos}%`;
        });
    });

    requestAnimationFrame(() => {
        renderSummarySection();
        renderFactCheckTable();
        renderSourceReliabilityGrid();
    });

    if (searchInput) {
        searchInput.placeholder = "Ask a follow-up about this topic...";
        searchInput.value = "";
    }

    const initialSuggestions = res.suggestedFollowUps || generateInitialSuggestions(AppState.activeTopic);
    renderSuggestedQuestions(initialSuggestions);
}

// Animate SVG Donut Segments
function animateDonutChart(left, center, right) {
    const circumference = 251.2; // 2 * pi * 40

    const leftLen = (left / 100) * circumference;
    const centerLen = (center / 100) * circumference;
    const rightLen = (right / 100) * circumference;

    donutLeft.style.strokeDasharray = `${leftLen} ${circumference}`;
    donutLeft.style.strokeDashoffset = "0";

    donutCenter.style.strokeDasharray = `${centerLen} ${circumference}`;
    donutCenter.style.strokeDashoffset = `-${leftLen}`;

    donutRight.style.strokeDasharray = `${rightLen} ${circumference}`;
    donutRight.style.strokeDashoffset = `-${leftLen + centerLen}`;
}

// Render summary text based on active language
function renderSummarySection() {
    if (!AppState.analysisResult || !unbiasedSummaryContent) return;

    const res = AppState.analysisResult;

    let activeSummary = res.summary || res.summary_en;

    if (!activeSummary || activeSummary.length === 0) {
        if (AppState.latestRenderedSummaryKey !== "empty") {
            unbiasedSummaryContent.innerHTML = "<p>No summary generated in this language.</p>";
            AppState.latestRenderedSummaryKey = "empty";
        }
        return;
    }

    const summaryKey = `${AppState.activeLanguage}:${activeSummary.join("||")}`;
    if (summaryKey === AppState.latestRenderedSummaryKey) {
        return;
    }

    const ul = document.createElement("ul");
    ul.className = "summary-list";
    activeSummary.forEach((point) => {
        const li = document.createElement("li");
        li.textContent = point;
        ul.appendChild(li);
    });

    unbiasedSummaryContent.replaceChildren(ul);
    AppState.latestRenderedSummaryKey = summaryKey;

    if (speakBtn) {
        speakBtn.onclick = () => {
            speakSummary(activeSummary);
        };
    }
}

// Render Fact-check table rows
function renderFactCheckTable() {
    if (!factCheckRows) return;

    const res = AppState.analysisResult;

    if (!res.claims || res.claims.length === 0) {
        factCheckRows.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted">No factual claims analyzed for this topic.</td>
            </tr>
        `;
        return;
    }

    const fragment = document.createDocumentFragment();

    res.claims.forEach((claim) => {
        const row = document.createElement("tr");

        let verdictBadge = "";
        if (claim.verdict === "true") verdictBadge = `<span class="badge badge-success">True</span>`;
        else if (claim.verdict === "false") verdictBadge = `<span class="badge badge-error">False</span>`;
        else verdictBadge = `<span class="badge badge-warning">Misleading</span>`;

        row.innerHTML = `
            <td class="font-semibold">${escapeHTML(claim.claim)}</td>
            <td>${escapeHTML(claim.reportedBy)}</td>
            <td>${verdictBadge}</td>
            <td class="text-muted text-sm">${escapeHTML(claim.analysis)}</td>
        `;

        fragment.appendChild(row);
    });

    factCheckRows.replaceChildren(fragment);
}

// Render Source Reliability grid
function renderSourceReliabilityGrid() {
    if (!sourcesReliabilityGrid) return;

    const res = AppState.analysisResult;

    if (!res.sources || res.sources.length === 0) {
        sourcesReliabilityGrid.innerHTML = `<div class="empty-sources-message">No source ratings generated yet.</div>`;
        return;
    }

    const fragment = document.createDocumentFragment();

    res.sources.forEach((src) => {
        const item = document.createElement("div");
        item.className = "source-item";

        let biasBadgeClass = "bias-center-badge";
        if (src.bias === "left") biasBadgeClass = "bias-left-badge";
        if (src.bias === "right") biasBadgeClass = "bias-right-badge";

        let reliabilityColor = "#eab308";
        if (src.reliability === "High") reliabilityColor = "#10b981";
        if (src.reliability === "Low") reliabilityColor = "#ef4444";

        item.innerHTML = `
            <div class="source-header">
                <span class="source-name">${escapeHTML(src.source)}</span>
                <span class="bias-badge ${biasBadgeClass}">${escapeHTML(src.bias)}</span>
            </div>
            <div class="reliability-row">
                <span class="reliability-label">Reliability:</span>
                <span class="reliability-val" style="color: ${reliabilityColor}">${escapeHTML(src.reliability)}</span>
            </div>
            <p class="card-desc" style="-webkit-line-clamp: 3; font-size: 11px; margin-top: 5px;">${escapeHTML(src.reason)}</p>
        `;

        item.addEventListener("click", () => {
            const url = src.url || `https://www.google.com/search?q=${encodeURIComponent(src.source)}`;
            window.open(url, "_blank");
        });

        fragment.appendChild(item);
    });

    sourcesReliabilityGrid.replaceChildren(fragment);
}


// 9. Speech Synthesis Module
function speakSummary(points) {
    if (AppState.isSpeaking) {
        stopSpeaking();
        return;
    }

    if (!AppState.synth) {
        alert("Speech synthesis is not supported in your browser.");
        return;
    }

    const fullText = points.join(". ");
    AppState.utterance = new SpeechSynthesisUtterance(fullText);

    // Set voice language mapping
    if (AppState.activeLanguage === "hi") {
        AppState.utterance.lang = "hi-IN";
    } else if (AppState.activeLanguage === "es") {
        AppState.utterance.lang = "es-ES";
    } else {
        AppState.utterance.lang = "en-US";
    }

    AppState.utterance.onstart = () => {
        AppState.isSpeaking = true;
        if (speakBtn) {
            speakBtn.innerHTML = `<i data-lucide="square" class="btn-icon-svg"></i> Stop Reading`;
            if (window.lucide) {
                lucide.createIcons();
            }
        }
        speakBtn.classList.add("btn-audio-active");
    };

    AppState.utterance.onend = () => {
        resetSpeakState();
    };

    AppState.utterance.onerror = () => {
        resetSpeakState();
    };

    AppState.synth.speak(AppState.utterance);
}

function stopSpeaking() {
    if (AppState.synth && AppState.isSpeaking) {
        AppState.synth.cancel();
        resetSpeakState();
    }
}

function resetSpeakState() {
    AppState.isSpeaking = false;
    if (speakBtn) {
        speakBtn.innerHTML = `<i data-lucide="volume-2" class="btn-icon-svg"></i> Read Aloud`;
        if (window.lucide) {
            lucide.createIcons();
        }
        speakBtn.classList.remove("btn-audio-active");
    }
}


// 10. Export Report Module (Triggers Browser PDF Print Utility)
function exportAnalysisReport() {
    const res = AppState.analysisResult;
    if (!res) {
        alert("No report data available. Run an analysis first.");
        return;
    }
    // Triggers high-fidelity printable page view formatted via @media print in style.css
    window.print();
}

// 11. Navigation & Location Settings Helpers
function buildLocationString() {
    const parts = [];
    if (AppState.location.city) parts.push(AppState.location.city);
    if (AppState.location.state) parts.push(AppState.location.state);
    if (AppState.location.country) parts.push(AppState.location.country);
    return parts.join(" ");
}

async function refreshNewsFeed() {
    const locationString = buildLocationString();
    const baseTopic = AppState.activeTopic || "latest global news";
    const query = locationString ? `${baseTopic} ${locationString}` : baseTopic;

    showLoader("Filtering news feed...");
    try {
        AppState.aggregatedArticles = await fetchNewsArticles(query);
        renderNewsFeed();
    } catch (e) {
        console.warn("Failed to filter news feed:", e);
    } finally {
        hideLoader();
    }
}

function goHome() {
    stopSpeaking();
    AppState.activeTopic = "";
    AppState.analysisResult = null;
    AppState.chatHistory = [];
    if (chatCard) {
        chatCard.classList.add("hidden");
        chatCard.classList.remove("active");
    }
    setInputMode("analyze");
    updateAnalysisStatusBar();

    if (searchInput) {
        searchInput.value = "";
        searchInput.placeholder = "Ask TruthLens...";
    }

    if (suggestedQuestions) {
        suggestedQuestions.innerHTML = "";
        suggestedQuestions.classList.add("hidden");
    }

    if (chatThread) {
        chatThread.innerHTML = `<div class="chat-placeholder">Ask any follow-up question in the search bar above to start a conversation about this news topic.</div>`;
    }

    const centerPane = document.querySelector(".center-content");
    if (centerPane) {
        centerPane.classList.remove("has-results");
    }

    if (analysisDashboard) {
        analysisDashboard.classList.add("hidden");
    }

    // Clear search values in location inputs if they return home
    const locationString = buildLocationString();
    const query = locationString ? `latest global news ${locationString}` : "latest global news";

    fetchNewsArticles(query).then(articles => {
        AppState.aggregatedArticles = articles;
        renderNewsFeed();
    }).catch(err => console.warn(err));
}

// ---- History System ----

function loadSearchHistory() {
    try {
        const saved = localStorage.getItem("truthlens_history");
        if (saved) AppState.searchHistory = JSON.parse(saved);
    } catch (e) {
        AppState.searchHistory = [];
    }
}

function saveToHistory(topic, chatLog, summary) {
    const entry = {
        id: Date.now(),
        topic: topic,
        timestamp: new Date().toISOString(),
        chatLog: chatLog || [],
        summary: summary || ""
    };
    AppState.searchHistory.unshift(entry); // newest first
    if (AppState.searchHistory.length > 50) AppState.searchHistory.pop(); // cap at 50
    try {
        localStorage.setItem("truthlens_history", JSON.stringify(AppState.searchHistory));
    } catch (e) {
        console.warn("Could not save history:", e);
    }
    // Update badge count
    renderHistoryBadge();
}

function renderHistoryBadge() {
    if (!historyNavBtn) return;
    const count = AppState.searchHistory.length;
    let badge = historyNavBtn.querySelector(".history-badge");
    if (!badge) {
        badge = document.createElement("span");
        badge.className = "history-badge";
        historyNavBtn.appendChild(badge);
    }
    badge.textContent = count;
    badge.style.display = count > 0 ? "inline-flex" : "none";
}

function showHistory() {
    // Toggle slide-in drawer anchored to the history button
    let drawer = document.getElementById("history-drawer");
    if (drawer) {
        const isOpen = !drawer.classList.contains("hidden");
        if (isOpen) {
            drawer.classList.add("hidden");
            return;
        }
    } else {
        drawer = document.createElement("div");
        drawer.id = "history-drawer";
        drawer.className = "history-drawer";
        document.querySelector(".app-header").appendChild(drawer);
    }
    renderHistoryList(drawer);
    drawer.classList.remove("hidden");

    // Close drawer when clicking outside
    const closeOutside = (e) => {
        if (!drawer.contains(e.target) && e.target !== historyNavBtn && !historyNavBtn.contains(e.target)) {
            drawer.classList.add("hidden");
            document.removeEventListener("click", closeOutside, true);
        }
    };
    setTimeout(() => document.addEventListener("click", closeOutside, true), 100);
}

function renderHistoryList(drawer) {
    if (!drawer) return;
    const history = AppState.searchHistory;

    if (history.length === 0) {
        drawer.innerHTML = `
            <div class="history-drawer-header">
                <span><i data-lucide="history" style="width:14px;height:14px;"></i> Search History</span>
                <button class="history-clear-btn" onclick="clearHistory()">Clear All</button>
            </div>
            <div class="history-empty">No searches yet. Start an investigation!</div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
    }

    const items = history.map((entry, idx) => {
        const date = new Date(entry.timestamp);
        const timeStr = date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) + " " +
            date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
        const isUrl = /^https?:\/\//i.test(entry.topic);
        const topicDisplay = isUrl ? new URL(entry.topic).hostname : entry.topic;
        const chatCount = entry.chatLog.filter(m => m.role === "user").length;

        return `
            <div class="history-item" data-idx="${idx}">
                <div class="history-item-header" onclick="toggleHistoryItem(${idx})">
                    <div class="history-item-meta">
                        <span class="history-type-icon">${isUrl ? '<i data-lucide="link" style="width:11px;height:11px;"></i>' : '<i data-lucide="search" style="width:11px;height:11px;"></i>'}</span>
                        <div>
                            <p class="history-topic">${escapeHTML(topicDisplay)}</p>
                            <p class="history-time">${timeStr} &bull; ${chatCount} follow-up${chatCount !== 1 ? "s" : ""}</p>
                        </div>
                    </div>
                    <div class="history-item-actions">
                        <button class="history-rerun-btn" onclick="event.stopPropagation(); rerunFromHistory(${idx})" title="Re-analyze"><i data-lucide="refresh-cw" style="width:12px;height:12px;"></i></button>
                        <i data-lucide="chevron-down" class="history-chevron" id="chevron-${idx}" style="width:14px;height:14px;"></i>
                    </div>
                </div>
                <div class="history-chat-log" id="history-log-${idx}" style="display:none;">
                    ${renderHistoryChatLog(entry)}
                </div>
            </div>
        `;
    }).join("");

    drawer.innerHTML = `
        <div class="history-drawer-header">
            <span><i data-lucide="history" style="width:14px;height:14px;"></i> Search History (${history.length})</span>
            <button class="history-clear-btn" onclick="clearHistory()">Clear All</button>
        </div>
        <div class="history-items-list">${items}</div>
    `;
    if (window.lucide) lucide.createIcons();
}

function renderHistoryChatLog(entry) {
    if (!entry.chatLog || entry.chatLog.length === 0) {
        if (entry.summary) {
            return `<div class="history-log-summary">${escapeHTML(entry.summary)}</div>`;
        }
        return `<div class="history-log-empty">No follow-up conversation recorded.</div>`;
    }

    return entry.chatLog.map(msg => {
        const isUser = msg.role === "user";
        return `
            <div class="history-msg ${isUser ? "history-msg-user" : "history-msg-ai"}">
                <span class="history-msg-label">${isUser ? "You" : "AI"}</span>
                <p class="history-msg-text">${escapeHTML(msg.content)}</p>
            </div>
        `;
    }).join("");
}

window.toggleHistoryItem = function(idx) {
    const log = document.getElementById(`history-log-${idx}`);
    const chevron = document.getElementById(`chevron-${idx}`);
    if (!log) return;
    const isOpen = log.style.display !== "none";
    log.style.display = isOpen ? "none" : "block";
    if (chevron) chevron.style.transform = isOpen ? "" : "rotate(180deg)";
};

window.rerunFromHistory = function(idx) {
    const entry = AppState.searchHistory[idx];
    if (!entry) return;
    // Close the drawer
    const drawer = document.getElementById("history-drawer");
    if (drawer) drawer.classList.add("hidden");
    // Re-run fresh live analysis (no cache)
    if (searchInput) searchInput.value = entry.topic;
    const urlPattern = /^https?:\/\//i;
    if (urlPattern.test(entry.topic)) {
        startURLAnalysis(entry.topic);
    } else {
        startNewAnalysis(entry.topic);
    }
};

window.clearHistory = function() {
    AppState.searchHistory = [];
    try { localStorage.removeItem("truthlens_history"); } catch(e) {}
    renderHistoryBadge();
    const drawer = document.getElementById("history-drawer");
    if (drawer) renderHistoryList(drawer);
};


// 11. Utilities Helper
function escapeHTML(str) {
    return String(str ?? "").replace(/[&<>'"]/g,
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

function cleanJSONString(str) {
    let cleaned = String(str || "").trim();
    if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(json)?/i, "").trim();
        cleaned = cleaned.replace(/```$/i, "").trim();
    }

    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.slice(firstBrace, lastBrace + 1);
    }

    cleaned = cleaned
        .replace(/[\u201C\u201D]/g, '"')
        .replace(/[\u2018\u2019]/g, "'")
        .replace(/,\s*([}\]])/g, "$1")
        .trim();

    return cleaned;
}

function extractModelText(data) {
    const content = data?.choices?.[0]?.message?.content;
    if (typeof content === "string") {
        return content.trim();
    }

    if (Array.isArray(content)) {
        return content
            .map((part) => typeof part === "string" ? part : part?.text || "")
            .join("")
            .trim();
    }

    if (typeof data?.output_text === "string") {
        return data.output_text.trim();
    }

    return "";
}

function parseAnalysisResponse(responseText) {
    const cleaned = cleanJSONString(responseText);

    try {
        return JSON.parse(cleaned);
    } catch (error) {
        const repaired = attemptRepairAnalysisJSON(cleaned);
        if (repaired) {
            return repaired;
        }

        console.error("Failed to parse AI JSON response:", cleaned);
        throw new Error(`AI returned malformed JSON: ${error.message}`);
    }
}

function attemptRepairAnalysisJSON(cleaned) {
    try {
        const repaired = {
            bias: extractBiasBlock(cleaned),
            sensationalism: extractNumberField(cleaned, "sensationalism", 0),
            sensationalismDesc: extractStringField(cleaned, "sensationalismDesc", "Unavailable"),
            sentiment: extractNumberField(cleaned, "sentiment", 0),
            sentimentDesc: extractStringField(cleaned, "sentimentDesc", "Neutral"),
            summary: extractStringArrayField(cleaned, "summary") || extractStringArrayField(cleaned, "summary_en"),
            suggestedFollowUps: extractStringArrayField(cleaned, "suggestedFollowUps"),
            claims: extractObjectArrayField(cleaned, "claims"),
            sources: extractObjectArrayField(cleaned, "sources")
        };

        normalizeBiasTotals(repaired.bias);
        return repaired;
    } catch (repairError) {
        console.warn("JSON repair attempt failed:", repairError.message);
        return null;
    }
}

function extractBiasBlock(text) {
    const left = extractNumberField(text, "left", 0);
    const center = extractNumberField(text, "center", 0);
    const right = extractNumberField(text, "right", 0);
    return { left, center, right };
}

function extractNumberField(text, fieldName, fallbackValue) {
    const match = text.match(new RegExp(`"${fieldName}"\\s*:\\s*(-?\\d+(?:\\.\\d+)?)`, "i"));
    return match ? Number(match[1]) : fallbackValue;
}

function extractStringField(text, fieldName, fallbackValue) {
    const match = text.match(new RegExp(`"${fieldName}"\\s*:\\s*"([\\s\\S]*?)"`, "i"));
    return match ? match[1].trim() : fallbackValue;
}

function extractStringArrayField(text, fieldName) {
    const match = text.match(new RegExp(`"${fieldName}"\\s*:\\s*\\[([\\s\\S]*?)\\]`, "i"));
    if (!match) return [];

    return [...match[1].matchAll(/"([\s\S]*?)"/g)].map((item) => item[1].trim()).filter(Boolean);
}

function extractObjectArrayField(text, fieldName) {
    const match = text.match(new RegExp(`"${fieldName}"\\s*:\\s*\\[([\\s\\S]*?)\\]`, "i"));
    if (!match) return [];

    const objectMatches = match[1].match(/\{[\s\S]*?\}/g) || [];
    return objectMatches.map((objText) => {
        try {
            return JSON.parse(cleanJSONString(objText));
        } catch {
            return {};
        }
    }).filter((obj) => Object.keys(obj).length > 0);
}

function normalizeBiasTotals(bias) {
    const total = Number(bias.left || 0) + Number(bias.center || 0) + Number(bias.right || 0);
    if (total === 100 || total === 0) {
        return;
    }

    bias.left = Math.round((Number(bias.left || 0) / total) * 100);
    bias.center = Math.round((Number(bias.center || 0) / total) * 100);
    bias.right = 100 - bias.left - bias.center;
}

function hasReadableLocalizedSummary(summary) {
    if (!Array.isArray(summary) || summary.length === 0) {
        return false;
    }

    const combined = summary.join(" ").trim();
    if (!combined) {
        return false;
    }

    const suspiciousChars = (combined.match(/[�\u0000-\u001f]/g) || []).length;
    return suspiciousChars < Math.max(3, combined.length * 0.05);
}

// 12. Conversational Q&A follow-up helpers
function generateInitialSuggestions(topic) {
    const cleanTopic = topic.toLowerCase().trim();
    if (cleanTopic.includes("climate") || cleanTopic.includes("warm")) {
        return [
            "What are the immediate economic impacts of these policy delays?",
            "Which countries are currently leading in carbon offset efficiency?",
            "How do fossil fuel subsidy levels compare to renewable funding?"
        ];
    }
    if (cleanTopic.includes("inflation") || cleanTopic.includes("econom") || cleanTopic.includes("price")) {
        return [
            "How do interest rate hikes directly curb inflation rates?",
            "Which specific sectors are hit hardest by supply chain issues?",
            "What is the global outlook for food and energy prices this year?"
        ];
    }
    if (cleanTopic.includes("artificial") || cleanTopic.includes("intelligence") || cleanTopic.includes("ai")) {
        return [
            "Will AI completely automate software development jobs soon?",
            "What are the key copyright and fair use debates in AI model training?",
            "How are major governments regulating generative AI platforms?"
        ];
    }
    // General fallback suggestions
    return [
        `What are the primary conflicting arguments surrounding ${topic}?`,
        `Are there any recent legislative or policy updates regarding ${topic}?`,
        `Which major countries or demographics are most affected by ${topic}?`
    ];
}

function generateNextSuggestions(question) {
    // Generate fresh suggested questions based on past interaction
    const cleanQ = question.toLowerCase().trim();
    if (cleanQ.includes("climate") || cleanQ.includes("policy") || cleanQ.includes("carbon")) {
        return [
            "How do nuclear energy costs compare to solar and wind?",
            "What is carbon tax pricing and which countries use it?",
            "What are the carbon neutral deadlines of the top 3 global economies?"
        ];
    }
    if (cleanQ.includes("job") || cleanQ.includes("automate") || cleanQ.includes("dev") || cleanQ.includes("ai")) {
        return [
            "How are developers upskilling to work alongside AI models?",
            "What fields of work are considered AI-safe or automation-resistant?",
            "What are the privacy risks of uploading code to proprietary AI tools?"
        ];
    }
    return [
        "Can you provide more statistical data or percentages on this point?",
        "What are the long-term future projections for this scenario?",
        "How does public opinion differ from corporate lobbying on this topic?"
    ];
}

function renderSuggestedQuestions(suggestions) {
    if (!suggestedQuestions) return;
    suggestedQuestions.innerHTML = "";

    if (!suggestions || suggestions.length === 0) {
        suggestedQuestions.classList.add("hidden");
        return;
    }

    suggestions.forEach(q => {
        const pill = document.createElement("button");
        pill.className = "suggested-pill";
        pill.textContent = q;
        pill.title = q;
        pill.addEventListener("click", () => {
            if (searchInput) {
                if (AppState.activeTopic && AppState.analysisResult) {
                    setInputMode("followup");
                }
                searchInput.value = q;
                performAnalysis();
            }
        });
        suggestedQuestions.appendChild(pill);
    });

    suggestedQuestions.classList.remove("hidden");
}

function appendChatBubble(sender, text) {
    if (!chatThread) return;

    // Remove placeholder on first message
    const placeholder = chatThread.querySelector(".chat-placeholder");
    if (placeholder) placeholder.remove();

    const bubble = document.createElement("div");
    bubble.className = `chat-bubble ${sender}-bubble`;

    // Convert newlines in AI text to HTML paragraphs for clean formatting
    if (sender === "ai") {
        bubble.innerHTML = text.split("\n\n").map(p => {
            // Basic markdown list formatter inside bubbles
            if (p.trim().startsWith("-") || p.trim().startsWith("*")) {
                const listItems = p.split(/\n[\-\*]\s+/).map(item => item.trim() ? `<li>${escapeHTML(item.trim().replace(/^[\-\*]\s+/, ""))}</li>` : "");
                return `<ul>${listItems.join("")}</ul>`;
            }
            return `<p>${escapeHTML(p.trim())}</p>`;
        }).join("");
    } else {
        bubble.textContent = text;
    }

    chatThread.appendChild(bubble);
    chatThread.scrollTop = chatThread.scrollHeight;
}

function showChatSpinner() {
    if (!chatThread) return null;

    // Remove placeholder if present
    const placeholder = chatThread.querySelector(".chat-placeholder");
    if (placeholder) placeholder.remove();

    const spinner = document.createElement("div");
    spinner.className = "local-chat-spinner";
    spinner.innerHTML = `
        <span class="spinner-text">Thinking (Analyzing question context...)</span>
        <div class="chat-dot"></div>
        <div class="chat-dot"></div>
        <div class="chat-dot"></div>
    `;
    chatThread.appendChild(spinner);
    chatThread.scrollTop = chatThread.scrollHeight;

    const chatSteps = [
        "Thinking (Analyzing question context...)",
        "Thinking (Reading background summary...)",
        "Thinking (Llama-3.3 is writing...)",
        "Thinking (Formatting HTML response...)"
    ];
    let step = 0;
    const spinnerText = spinner.querySelector(".spinner-text");

    const localInterval = setInterval(() => {
        step++;
        if (step < chatSteps.length && spinnerText) {
            spinnerText.textContent = chatSteps[step];
        } else if (spinnerText) {
            spinnerText.textContent = "Thinking (Synthesizing response...)";
        }
    }, 1200);

    // Bind interval ID to clear it later
    spinner.dataset.intervalId = localInterval;

    return spinner;
}

async function fetchFollowUpAnswer(question) {
    const langNameMap = { "en": "English", "hi": "Hindi", "es": "Spanish" };
    const activeLangName = langNameMap[AppState.activeLanguage] || "English";

    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    if (!isLocalhost || !AppState.azureEndpoint || !AppState.azureKey) {
        // Live hosted site or no local keys, use Netlify Serverless Function proxy
        const response = await fetch("/.netlify/functions/followup", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                question: question,
                topic: AppState.activeTopic,
                chatHistory: AppState.chatHistory,
                summary: AppState.analysisResult ? (AppState.analysisResult.summary || AppState.analysisResult.summary_en || []) : [],
                articles: AppState.aggregatedArticles,
                lang: AppState.activeLanguage
            })
        });
        if (!response.ok) {
            throw new Error("Azure credentials are required. Serverless function returned error: " + response.statusText);
        }
        const data = await response.json();
        return data.content;
    }

    const summaryText = AppState.analysisResult
        ? (AppState.analysisResult.summary || AppState.analysisResult.summary_en || []).slice(0, 3).join("\n")
        : "No summary available.";
    const articleContext = (AppState.aggregatedArticles || [])
        .map((art, idx) => `Article ${idx + 1}: ${art.title} | ${art.source} | ${art.description}`)
        .join("\n");
    const followUpPrompt = `
You are a careful news analysis assistant. Answer only from the provided investigation context.
If the available evidence is insufficient, say that clearly instead of inventing facts.

Current topic: "${AppState.activeTopic}"

Background summary:
${summaryText}

Related live articles:
${articleContext}

User follow-up question:
"${question}"

Write a detailed, readable, well-structured answer in ${activeLangName}. Use short paragraphs and bullet points when helpful.
At the very end of your response, output a delimiter block "===SUGGESTIONS===" followed by exactly 3 suggested follow-up questions in ${activeLangName} (each on a new line). Do not wrap the suggestions in any JSON or array brackets.

Example structure:
[Your detailed answer here]

===SUGGESTIONS===
First suggested question?
Second suggested question?
Third suggested question?
`;

    const response = await fetch(AppState.azureEndpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "api-key": AppState.azureKey
        },
        body: JSON.stringify({
            messages: [
                {
                    role: "system",
                    content: "You are an expert news analyst. Be precise, transparent about uncertainty, and never fabricate missing facts."
                },
                {
                    role: "user",
                    content: followUpPrompt
                }
            ],
            model: "Llama-3.3-70B-Instruct",
            max_tokens: 1200,
            temperature: 0.2
        })
    });

    if (!response.ok) {
        throw new Error(`Azure API follow-up responded with status ${response.status}`);
    }

    const data = await response.json();
    const reply = extractModelText(data);
    if (!reply) {
        throw new Error("Azure AI returned an empty follow-up response.");
    }
    return reply;
}

async function submitFollowUp(question) {
    const cleanQ = question.trim();
    if (!cleanQ) return;

    if (chatCard) {
        chatCard.classList.remove("hidden");
        chatCard.classList.add("active");
    }

    if (searchInput) searchInput.value = "";

    stopSpeaking();
    appendChatBubble("user", cleanQ);
    AppState.chatHistory.push({ role: "user", content: cleanQ });

    const spinner = showChatSpinner();
    if (suggestedQuestions) suggestedQuestions.classList.add("hidden");

    try {
        const rawReply = await fetchFollowUpAnswer(cleanQ);

        let reply = rawReply;
        let nextSuggestions = [];

        if (rawReply.includes("===SUGGESTIONS===")) {
            const parts = rawReply.split("===SUGGESTIONS===");
            reply = parts[0].trim();
            if (parts[1]) {
                nextSuggestions = parts[1]
                    .split("\n")
                    .map(line => line.replace(/^[-*•\d+.]\s*/, "").trim())
                    .filter(line => line.length > 3);
            }
        }

        if (spinner) {
            if (spinner.dataset.intervalId) {
                clearInterval(parseInt(spinner.dataset.intervalId, 10));
            }
            spinner.remove();
        }

        appendChatBubble("ai", reply);
        AppState.chatHistory.push({ role: "ai", content: reply });
        
        // Sync follow-up chat log back to search history entry
        updateHistoryChatLog();

        if (nextSuggestions.length === 0) {
            nextSuggestions = generateNextSuggestions(cleanQ);
        }
        renderSuggestedQuestions(nextSuggestions);
    } catch (e) {
        console.error("Conversational follow-up failed:", e);

        if (spinner) {
            if (spinner.dataset.intervalId) {
                clearInterval(parseInt(spinner.dataset.intervalId, 10));
            }
            spinner.remove();
        }

        appendChatBubble("ai", `I could not complete the live follow-up analysis. Reason: ${e.message}`);
    }
}

function updateHistoryChatLog() {
    if (!AppState.activeTopic) return;
    const entry = AppState.searchHistory.find(e => e.topic === AppState.activeTopic);
    if (entry) {
        entry.chatLog = [...AppState.chatHistory];
        try {
            localStorage.setItem("truthlens_history", JSON.stringify(AppState.searchHistory));
        } catch (e) {
            console.warn("Could not update history chat log:", e);
        }
    }
}


