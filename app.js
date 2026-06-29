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
    newsCache: new Map(),
    analysisCache: new Map(),
    pendingNewsRequests: new Map(),
    pendingAnalysisRequests: new Map(),
    activeAnalysisRequestId: 0,
    latestRenderedSummaryKey: "",
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
const aiEmptyState = document.getElementById("ai-empty-state"); // Might be null in new layout
const analysisDashboard = document.getElementById("analysis-dashboard");
const analysisTopicTitle = document.getElementById("analysis-topic-title"); // Might be null in new layout

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
const sensationalismDesc = document.getElementById("sensationalism-desc");

const sentimentScoreVal = document.getElementById("sentiment-score-val");
const sentimentIndicator = document.getElementById("sentiment-indicator");

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
const connectionStatus = document.getElementById("connection-status");
const connectionStatusText = document.getElementById("connection-status-text");
const analysisStatusBar = document.getElementById("analysis-status-bar");
const currentTopicLabel = document.getElementById("current-topic-label");
const currentModeLabel = document.getElementById("current-mode-label");

// Navigation & Location elements
const headerLogoBtn = document.getElementById("header-logo-btn");
const homeNavBtn = document.getElementById("home-nav-btn");
const historyNavBtn = document.getElementById("history-nav-btn");
const historyModal = document.getElementById("history-modal");
const closeHistoryBtn = document.getElementById("close-history-btn");
const historyListContainer = document.getElementById("history-list-container");
const chatCard = document.querySelector(".chat-card");

const toggleFilterBtn = document.getElementById("toggle-filter-btn");
const locationFilterPanel = document.getElementById("location-filter-panel");
const countryFilter = document.getElementById("country-filter");
const stateFilter = document.getElementById("state-filter");
const cityFilter = document.getElementById("city-filter");
const applyLocationBtn = document.getElementById("apply-location-btn");

const suggestedQuestions = document.getElementById("suggested-questions");
const chatThread = document.getElementById("chat-thread");

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

// 3. Initialize App & Load Keys
window.addEventListener("DOMContentLoaded", () => {
    loadKeys();
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
            renderSummarySection();
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
    if (closeHistoryBtn && historyModal) closeHistoryBtn.addEventListener("click", () => historyModal.classList.add("hidden"));

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

    updateConnectionStatus();
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

    updateConnectionStatus();
    hideModal();
    alert("API credentials saved. TruthLens status has been updated.");
}

// Close modal if user clicks outside of the modal box
window.addEventListener("click", (e) => {
    if (settingsModal && e.target === settingsModal) {
        hideModal();
    }
    if (historyModal && e.target === historyModal) {
        historyModal.classList.add("hidden");
    }

    const newsCard = e.target.closest?.(".news-card");
    if (newsCard?.dataset?.url) {
        window.open(newsCard.dataset.url, "_blank", "noopener,noreferrer");
    }
});

function updateConnectionStatus() {
    if (!connectionStatus || !connectionStatusText) return;

    connectionStatus.classList.remove("connection-live", "connection-hybrid", "connection-demo");

    if (AppState.newsKey && AppState.azureEndpoint && AppState.azureKey) {
        connectionStatus.classList.add("connection-live");
        connectionStatusText.textContent = "Live mode • NewsAPI + Llama AI connected";
        return;
    }

    if (AppState.azureEndpoint && AppState.azureKey) {
        connectionStatus.classList.add("connection-hybrid");
        connectionStatusText.textContent = "AI ready • Connect NewsAPI for live news feed";
        return;
    }

    connectionStatus.classList.add("connection-demo");
    connectionStatusText.textContent = "Setup required • Add Azure endpoint and key to start live AI analysis";
}

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

    await startNewAnalysis(query);
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
    globalLoader.classList.remove("hidden");

    globalLoaderInterval = setInterval(() => {
        stepIdx++;
        if (stepIdx < steps.length) {
            loaderMessage.textContent = steps[stepIdx];
        } else {
            loaderMessage.textContent = "Synthesizing findings...";
        }
    }, 1200);
}

function hideLoader() {
    if (!globalLoader) return;

    if (globalLoaderInterval) {
        clearInterval(globalLoaderInterval);
        globalLoaderInterval = null;
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

    if (!AppState.newsKey) {
        throw new Error("NewsAPI key is required for live news results.");
    }

    const requestPromise = (async () => {
        const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&pageSize=6&sortBy=relevancy&language=en&apiKey=${AppState.newsKey}`;

        const response = await fetch(url);
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

        const mappedArticles = data.articles.map((art) => ({
            title: art.title,
            source: art.source?.name || "Unknown Source",
            description: art.description || "No description available.",
            url: art.url
        }));

        AppState.newsCache.set(normalizedQuery, mappedArticles);
        return mappedArticles;
    })();

    AppState.pendingNewsRequests.set(normalizedQuery, requestPromise);

    try {
        return await requestPromise;
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

    if (!AppState.azureEndpoint || !AppState.azureKey) {
        throw new Error("Azure endpoint and API key are required for live Llama analysis.");
    }

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
  "sensationalismDesc": "<short description of sensationalism level, e.g., Moderate, High, Minimal>",
  "sentiment": <integer_sentiment_score_from_-100_to_100>,
  "sentimentDesc": "<Positive or Negative or Neutral>",
  "summary_en": [
    "A concise, detailed summary of the major event reported (2-3 sentences packed with specific facts and figures). Give a clear explanation of what happened.",
    "A concise bullet point explaining the primary arguments and data presented by left-leaning or progressive sources (2-3 sentences).",
    "A concise bullet point explaining the primary arguments and data presented by right-leaning or conservative sources (2-3 sentences)."
  ],
  "summary_hi": [
    "मुख्य घटना का एक संक्षिप्त और विस्तृत सारांश (2-3 वाक्य जिसमें विशिष्ट तथ्य और आंकड़े शामिल हों)। क्या हुआ, इसका स्पष्ट विश्लेषण प्रदान करें।",
    "वामपंथी या प्रगतिशील स्रोतों द्वारा प्रस्तुत प्राथमिक तर्कों को समझाने वाला एक संक्षिप्त बिंदु (2-3 वाक्य)।",
    "दक्षिणपंथी या रूढ़िवादी स्रोतों द्वारा प्रस्तुत प्राथमिक व्यावसायिक तर्कों को समझाने वाला एक संक्षिप्त बिंदु (2-3 वाक्य)।"
  ],
  "summary_es": [
    "Un resumen conciso y detallado del evento principal reportado (2-3 frases repletas de hechos y cifras). Brinde una explicación clara de lo sucedido.",
    "Un punto conciso que explique los argumentos principales presentados por fuentes progresistas (2-3 frases).",
    "Un punto conciso que explique los argumentos principales presentados por fuentes conservadoras (2-3 frases)."
  ],
  "claims": [
    {
      "claim": "Specific factual claim reported in the articles",
      "reportedBy": "Source Name",
      "verdict": "true" or "false" or "misleading",
      "analysis": "Short fact-checked analysis explaining why."
    }
  ],
  "sources": [
    {
      "source": "Source Name (e.g. BBC News)",
      "url": "Main homepage URL of this news source (e.g. https://www.bbc.com)",
      "bias": "left" or "center" or "right",
      "reliability": "High" or "Mixed" or "Low",
      "reason": "Short reason explaining reliability rating based on facts."
    }
  ]
}

Make sure left + center + right in the bias object sum to exactly 100.
    `;

    const requestPromise = (async () => {
        const url = AppState.azureEndpoint;

        // Retry settings on 503/429 errors
        const maxRetries = 3;
        const retryDelayMs = 1500;
        let lastError = null;

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
                const responseText = extractModelText(data);
                if (!responseText) {
                    console.error("Azure raw response:", data);
                    throw new Error("Azure AI returned an empty or invalid response.");
                }

                const jsonResult = parseAnalysisResponse(responseText);
                validateAnalysisPayload(jsonResult);
                return jsonResult;
            } catch (e) {
                lastError = e;
                console.error(`Attempt ${attempt} failed:`, e.message);
                if (attempt < maxRetries) {
                    await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
                }
            }
        }

        throw new Error(lastError?.message || "Live AI analysis failed after multiple attempts.");
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
    const hasSummary = Array.isArray(payload.summary_en);
    const hasClaims = Array.isArray(payload.claims);
    const hasSources = Array.isArray(payload.sources);

    if (!hasBias || !hasSummary || !hasClaims || !hasSources) {
        throw new Error("AI response format was incomplete.");
    }
}

// 8. Render Dashboard Output Elements
function renderAnalysisDashboard() {
    if (aiEmptyState) aiEmptyState.classList.add("hidden");
    if (analysisDashboard) analysisDashboard.classList.remove("hidden");
    if (analysisTopicTitle) analysisTopicTitle.textContent = `Topic: ${AppState.activeTopic}`;

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
            sensationalismDesc.textContent = res.sensationalismDesc;
            if (gaugeFill) {
                const gaugeLength = 188.4;
                const fillLength = (res.sensationalism / 100) * gaugeLength;
                gaugeFill.style.strokeDasharray = `${fillLength} 188.4`;
            }

            sentimentScoreVal.textContent = res.sentimentDesc || "Neutral";
            const scoreVal = res.sentiment !== undefined ? res.sentiment : 0;
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

    const initialSuggestions = generateInitialSuggestions(AppState.activeTopic);
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

    let activeSummary = res.summary_en;
    if (AppState.activeLanguage === "hi") activeSummary = hasReadableLocalizedSummary(res.summary_hi) ? res.summary_hi : res.summary_en;
    if (AppState.activeLanguage === "es") activeSummary = hasReadableLocalizedSummary(res.summary_es) ? res.summary_es : res.summary_en;

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

function showHistory() {
    if (historyModal) {
        historyModal.classList.remove("hidden");
        renderHistoryList();
    }
}

function renderHistoryList() {
    if (!historyListContainer) return;
    historyListContainer.innerHTML = `<div class="empty-history">Saved history has been disabled. Run a fresh live analysis each time.</div>`;
}

function loadHistoryTopic() {
    alert("Saved history playback is disabled. Please run a fresh live analysis.");
}


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
            summary_en: extractStringArrayField(cleaned, "summary_en"),
            summary_hi: extractStringArrayField(cleaned, "summary_hi"),
            summary_es: extractStringArrayField(cleaned, "summary_es"),
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
    if (!AppState.azureEndpoint || !AppState.azureKey) {
        throw new Error("Azure endpoint and API key are required for follow-up answers.");
    }

    const summaryText = AppState.analysisResult
        ? (AppState.analysisResult.summary_en || []).slice(0, 3).join("\n")
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

Write a detailed, readable, well-structured answer. Use short paragraphs and bullet points when helpful. Do not make up facts, quotes, dates, numbers, or claims that are not supported by the provided context.
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

    const spinner = showChatSpinner();
    if (suggestedQuestions) suggestedQuestions.classList.add("hidden");

    try {
        const reply = await fetchFollowUpAnswer(cleanQ);

        if (spinner) {
            if (spinner.dataset.intervalId) {
                clearInterval(parseInt(spinner.dataset.intervalId, 10));
            }
            spinner.remove();
        }

        appendChatBubble("ai", reply);
        const nextSuggestions = generateNextSuggestions(cleanQ);
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


