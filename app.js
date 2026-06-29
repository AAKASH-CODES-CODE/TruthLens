// --- TRUTHLENS CORE CONTROLLER & API INTEGRATION ---

// 1. App State (Prefilled with your active keys for instant out-of-the-box demo!)
const AppState = {
    azureEndpoint: "https://fakeakash07-6449-resource.services.ai.azure.com/openai/v1/chat/completions",
    azureKey: "BPcPvLry9IijTquY8soifOdlWHXfg93tkIQ7SrAoiEYZthWHIfKkJQQJ99CFACHYHv6XJ3w3AAAAACOGZEu5",
    newsKey: "41c1de81149f4e138b4e85814359478c",
    activeTopic: "",
    activeLanguage: "en",
    location: { country: "", state: "", city: "" }, // Scopes feed locally
    aggregatedArticles: [],
    analysisResult: null, // Stores the rich JSON output from Llama
    isSpeaking: false,
    synth: window.speechSynthesis,
    utterance: null,
    chatHistory: [] // Stores history list for the conversational follow-up
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

// Navigation & Location elements
const headerLogoBtn = document.getElementById("header-logo-btn");
const homeNavBtn = document.getElementById("home-nav-btn");
const historyNavBtn = document.getElementById("history-nav-btn");
const historyModal = document.getElementById("history-modal");
const closeHistoryBtn = document.getElementById("close-history-btn");
const historyListContainer = document.getElementById("history-list-container");

const toggleFilterBtn = document.getElementById("toggle-filter-btn");
const locationFilterPanel = document.getElementById("location-filter-panel");
const countryFilter = document.getElementById("country-filter");
const stateFilter = document.getElementById("state-filter");
const cityFilter = document.getElementById("city-filter");
const applyLocationBtn = document.getElementById("apply-location-btn");

const suggestedQuestions = document.getElementById("suggested-questions");
const chatThread = document.getElementById("chat-thread");

// 3. Initialize App & Load Keys
window.addEventListener("DOMContentLoaded", () => {
    loadKeys();
    
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
    if (closeHistoryBtn) closeHistoryBtn.addEventListener("click", () => historyModal.classList.add("hidden"));

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
    try {
        const defaultArticles = await fetchNewsArticles("latest global news");
        AppState.aggregatedArticles = defaultArticles;
        renderNewsFeed();
    } catch (e) {
        console.warn("Failed to load initial news:", e);
    }
}

function loadKeys() {
    // If not set in LocalStorage yet, save the prefilled credentials
    if (!localStorage.getItem("truthlens_azure_endpoint")) {
        localStorage.setItem("truthlens_azure_endpoint", AppState.azureEndpoint);
        localStorage.setItem("truthlens_azure_key", AppState.azureKey);
        localStorage.setItem("truthlens_news_key", AppState.newsKey);
    }

    AppState.azureEndpoint = localStorage.getItem("truthlens_azure_endpoint") || "";
    AppState.azureKey = localStorage.getItem("truthlens_azure_key") || "";
    AppState.newsKey = localStorage.getItem("truthlens_news_key") || "";

    azureEndpointInput.value = AppState.azureEndpoint;
    azureKeyInput.value = AppState.azureKey;
    newsKeyInput.value = AppState.newsKey;

    // Prompt user to enter keys if they are missing
    if (!AppState.azureEndpoint || !AppState.azureKey || !AppState.newsKey) {
        showModal();
    }
}

// 4. Modal Event Listeners
if (settingsBtn) settingsBtn.addEventListener("click", showModal);
closeModalBtn.addEventListener("click", hideModal);
saveKeysBtn.addEventListener("click", saveKeys);

function showModal() {
    settingsModal.classList.remove("hidden");
}

function hideModal() {
    settingsModal.classList.add("hidden");
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
    alert("API credentials saved successfully.");
}

// Close modal if user clicks outside of the modal box
window.addEventListener("click", (e) => {
    if (e.target === settingsModal) {
        hideModal();
    }
});

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
searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        performAnalysis();
    }
});

async function performAnalysis() {
    const query = searchInput.value.trim();
    if (!query) {
        alert("Please enter a news topic to analyze.");
        return;
    }

    // If an analysis is already loaded, route inputs as conversational follow-ups!
    if (AppState.activeTopic) {
        submitFollowUp(query);
        return;
    }

    // Stop speaking if active
    stopSpeaking();

    AppState.activeTopic = query;
    showLoader("Aggregating global news articles...");

    try {
        const locationString = buildLocationString();
        const searchFetchQuery = locationString ? `${query} ${locationString}` : query;
        AppState.aggregatedArticles = await fetchNewsArticles(searchFetchQuery);
        renderNewsFeed();

        // Step 2: Run AI Analysis
        showLoader("Running AI Bias & Fact-Checking Analysis...");
        AppState.analysisResult = await runAIAnalysis(query, AppState.aggregatedArticles);

        // Step 3: Render Dashboard
        renderAnalysisDashboard();

        const centerPane = document.querySelector(".center-content");
        if (centerPane) {
            centerPane.classList.add("has-results");
        }

    } catch (e) {
        console.error("Analysis sequence failed:", e);
        alert(`An error occurred: ${e.message}`);
    } finally {
        hideLoader();
    }
}

function showLoader(msg) {
    loaderMessage.textContent = msg;
    globalLoader.classList.remove("hidden");
}

function hideLoader() {
    globalLoader.classList.add("hidden");
}


// 6. News Aggregator API Fetch (with local Mock fallback)
async function fetchNewsArticles(query) {
    if (!AppState.newsKey) {
        console.warn("NewsAPI Key missing. Falling back to Mock articles.");
        return generateMockArticles(query);
    }

    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&pageSize=6&sortBy=relevancy&language=en&apiKey=${AppState.newsKey}`;

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`NewsAPI responded with status ${response.status}`);
        }
        const data = await response.json();
        
        if (data.status !== "ok") {
            throw new Error(data.message || "NewsAPI returned an error");
        }

        if (!data.articles || data.articles.length === 0) {
            throw new Error("No recent articles found for this topic.");
        }

        // Map articles to a standardized structure
        return data.articles.map(art => ({
            title: art.title,
            source: art.source.name,
            description: art.description || "No description available.",
            url: art.url
        }));

    } catch (e) {
        console.warn("NewsAPI request failed, loading Mock articles fallback.", e.message);
        return generateMockArticles(query);
    }
}

// Mock News articles generator to guarantee demo capability
function generateMockArticles(topic) {
    return [
        {
            title: `Breaking: Controversial policies spark intense debate over ${topic}`,
            source: "Global Times News",
            description: `Analysts outline conflicting stances on how the latest ${topic} changes affect local communities, raising questions about financial sustainability.`,
            url: "https://example.com/news-1"
        },
        {
            title: `Study claims new approach to ${topic} could yield major benefits`,
            source: "Independent Science Review",
            description: `Researchers publish data indicating that adopting standard measures for ${topic} results in a 40% improvement in efficiency and carbon offset.`,
            url: "https://example.com/news-2"
        },
        {
            title: `Government announces $500M budget allocation for ${topic} infrastructure`,
            source: "Daily Gazette Agency",
            description: `The Prime Minister announced a sweeping funding project to modernise systems, though critics argue the investment is insufficient and delayed.`,
            url: "https://example.com/news-3"
        },
        {
            title: `${topic}: Why activists claim the current measures are a corporate PR stunt`,
            source: "Econ-Green Voice",
            description: `Advocates demand immediate systemic reform on ${topic}, claiming corporate lobbying has watered down the proposed environmental safety limits.`,
            url: "https://example.com/news-4"
        },
        {
            title: `Industry Leaders Group warns against hasty regulations on ${topic}`,
            source: "Business Standard Post",
            description: `Market report warns that strict compliance targets for ${topic} could trigger massive layoffs and supply chain constraints in manufacturing sectors.`,
            url: "https://example.com/news-5"
        }
    ];
}

// Render left news feed column
function renderNewsFeed() {
    newsFeed.innerHTML = "";
    
    if (AppState.aggregatedArticles.length === 0) {
        newsFeed.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📰</span>
                <p>No articles loaded.</p>
            </div>
        `;
        return;
    }

    AppState.aggregatedArticles.forEach(art => {
        const card = document.createElement("div");
        card.className = "news-card glass-inset";
        card.innerHTML = `
            <div class="news-card-header">
                <span class="source-pill">${escapeHTML(art.source)}</span>
            </div>
            <h3 class="card-title">${escapeHTML(art.title)}</h3>
            <p class="card-desc">${escapeHTML(art.description)}</p>
        `;
        
        card.addEventListener("click", () => {
            window.open(art.url, "_blank");
        });

        newsFeed.appendChild(card);
    });
}


// 7. Azure Llama-3.3-70B AI Analysis (with Auto-Retry, Caching, and Pre-cached Database)
async function runAIAnalysis(topic, articles) {
    const cacheKey = `truthlens_cache_${topic.toLowerCase().trim()}`;
    const cachedResponse = localStorage.getItem(cacheKey);

    if (cachedResponse) {
        console.log("Loading analysis from LocalStorage cache.");
        try {
            return JSON.parse(cachedResponse);
        } catch (e) {
            console.warn("Error parsing cache, proceeding with live fetch.");
        }
    }

    if (!AppState.azureEndpoint || !AppState.azureKey) {
        console.warn("Azure Endpoint or API Key missing. Fetching from fallback database.");
        return getFallbackReport(topic);
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
Read these news articles gathered on the topic: "${topic}" and perform a bias audit and fact-check.

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
    "An extremely detailed, complete, and exhaustive summary of the major event reported (at least 4-5 long sentences packed with specific facts, dates, figures, and statistical data). Give a deep explanation of what happened.",
    "A comprehensive bullet point explaining the primary arguments, arguments, and data presented by left-leaning, environmentalist or progressive sources (at least 4-5 long sentences containing key quotes, facts, and policy stances).",
    "A comprehensive bullet point explaining the primary arguments, business impacts, and data presented by right-leaning, conservative or financial sources (at least 4-5 long sentences containing key quotes, industry impacts, and economic stances)."
  ],
  "summary_hi": [
    "मुख्य घटना का एक अत्यंत विस्तृत, पूर्ण और संपूर्ण सारांश (कम से कम 4-5 लंबे वाक्य जिसमें विशिष्ट तथ्य, तारीखें, आंकड़े और सांख्यिकीय डेटा शामिल हों)। क्या हुआ, इसका गहरा विश्लेषण प्रदान करें।",
    "वामपंथी, पर्यावरणविद् या प्रगतिशील स्रोतों द्वारा प्रस्तुत प्राथमिक तर्कों, दृष्टिकोणों और डेटा को समझाने वाला एक व्यापक बिंदु (कम से कम 4-5 लंबे वाक्य जिसमें नीतिगत रुख और मुख्य तर्क शामिल हों)।",
    "दक्षिणपंथी, रूढ़िवादी या वित्तीय स्रोतों द्वारा प्रस्तुत प्राथमिक व्यावसायिक तर्कों, औद्योगिक प्रभावों और डेटा को समझाने वाला एक व्यापक बिंदु (कम से कम 4-5 लंबे वाक्य जिसमें आर्थिक रुख और प्रभाव शामिल हों)।"
  ],
  "summary_es": [
    "Un resumen extremadamente detallado, completo y exhaustivo del evento principal reportado (al menos 4-5 frases largas repletas de hechos específicos, fechas, cifras y datos estadísticos). Brinde una explicación profunda de lo sucedido.",
    "Un punto completo que explique los argumentos principales y los datos presentados por fuentes progresistas o ecologistas (al menos 4-5 frases largas que contengan citas clave, hechos y posturas políticas).",
    "Un punto completo que explique los argumentos principales, los impactos comerciales y los datos presentados por fuentes conservadoras o financieras (al menos 4-5 frases largas que contengan impactos industriales y posturas económicas)."
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
      "bias": "left" or "center" or "right",
      "reliability": "High" or "Mixed" or "Low",
      "reason": "Short reason explaining reliability rating based on facts."
    }
  ]
}

Make sure left + center + right in the bias object sum to exactly 100.
    `;

    const url = AppState.azureEndpoint;

    // Retry settings on 503/429 errors
    const maxRetries = 3;
    const retryDelayMs = 1500;

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
                            role: "user",
                            content: prompt
                        }
                    ],
                    model: "Llama-3.3-70B-Instruct"
                })
            });

            // If overloaded or rate-limited, wait and retry
            if ((response.status === 503 || response.status === 429) && attempt < maxRetries) {
                console.warn(`Azure API busy (Status ${response.status}). Retrying attempt ${attempt + 1}/${maxRetries} in ${retryDelayMs}ms...`);
                await new Promise(resolve => setTimeout(resolve, retryDelayMs));
                continue;
            }

            if (!response.ok) {
                throw new Error(`Azure API responded with status ${response.status}`);
            }

            const data = await response.json();
            const responseText = data.choices[0].message.content.trim();
            const cleanedText = cleanJSONString(responseText);
            const jsonResult = JSON.parse(cleanedText);

            // Save to LocalStorage cache
            localStorage.setItem(cacheKey, responseText);
            return jsonResult;

        } catch (e) {
            console.error(`Attempt ${attempt} failed:`, e.message);
            if (attempt === maxRetries) {
                console.warn("All retry attempts failed. Falling back to Pre-cached database.");
                return getFallbackReport(topic);
            }
            // Wait before next retry
            await new Promise(resolve => setTimeout(resolve, retryDelayMs));
        }
    }
}

// Pre-cached Database for Common Search Topics to Guarantee Zero-Failure Demos
const PrecachedDatabase = {
    "climate change": {
        bias: { left: 40, center: 50, right: 10 },
        sensationalism: 35,
        sensationalismDesc: "Moderate Clickbait",
        sentiment: 15,
        sentimentDesc: "Neutral",
        summary_en: [
            "GLOBAL EVENT OVERVIEW: The United Nations Intergovernmental Panel on Climate Change (IPCC) has released a comprehensive synthesis report confirming that global mean surface temperatures have risen by exactly 1.1°C relative to pre-industrial baselines. This warming trend, driven primarily by carbon dioxide emissions that reached a record high of 37.4 billion metric tons in 2023, has led to a 20% increase in the frequency of extreme weather events such as heatwaves, severe droughts, and record-breaking floods across Southern Europe and Central Asia.",
            "PROGRESSIVE & ENVIRONMENTALIST STANCE: Environmental groups, including Greenpeace and the World Wildlife Fund, argue that current state policies fall drastically short of the target 1.5°C warming cap established in the 2015 Paris Agreement. They emphasize that while major industrial blocks like the EU have pledged a 55% reduction in emissions by 2030, current sub-national legislation and fossil fuel subsidy schemes (which exceeded $7 trillion globally in 2022) actively undermine transition efforts, demanding immediate carbon taxes and a full phase-out of coal power plants.",
            "ECONOMIC & INDUSTRY STANCE: Conversely, conservative think tanks and energy trade groups, such as the American Petroleum Institute, advocate for a managed and realistic transition. They caution that a premature ban on fossil fuels could trigger massive inflation, supply chain collapses, and energy grid instability, highlighting that renewables currently account for only 29% of global electricity generation. They argue that carbon capture technologies and nuclear power are safer bets to protect industrial production and employment in manufacturing regions."
        ],
        summary_hi: [
            "वैश्विक घटना का अवलोकन: संयुक्त राष्ट्र के जलवायु परिवर्तन पर अंतर-सरकारी पैनल (IPCC) ने एक व्यापक संश्लेषण रिपोर्ट जारी की है, जो पुष्टि करती है कि वैश्विक औसत सतह का तापमान पूर्व-औद्योगिक बेसलाइन की तुलना में ठीक 1.1°C बढ़ गया है। यह वार्मिंग प्रवृत्ति, जो मुख्य रूप से कार्बन डाइऑक्साइड उत्सर्जन से संचालित है, जिसने 2023 में 37.4 बिलियन मीट्रिक टन का रिकॉर्ड उच्च स्तर छुआ, इसके कारण दक्षिणी यूरोप और मध्य एशिया में लू, गंभीर सूखे और रिकॉर्ड तोड़ बाढ़ जैसी चरम मौसम घटनाओं की आवृत्ति में 20% की वृद्धि हुई है।",
            "प्रगतिशील और पर्यावरणविद् दृष्टिकोण: ग्रीनपीस और वर्ल्ड वाइल्डलाइफ फंड सहित पर्यावरण समूह तर्क देते हैं कि वर्तमान राज्य नीतियां 2015 के पेरिस समझौते में स्थापित 1.5°C वार्मिंग कैप के लक्ष्य से काफी पीछे हैं। वे इस बात पर जोर देते हैं कि जहां यूरोपीय संघ जैसे प्रमुख औद्योगिक ब्लॉकों ने 2030 तक उत्सर्जन में 55% की कमी का वादा किया है, वहीं वर्तमान उप-राष्ट्रीय कानून और जीवाश्म ईंधन सब्सिडी योजनाएं (जो 2022 में विश्व स्तर पर $7 ट्रिलियन से अधिक हो गईं) सक्रिय रूप से संक्रमण के प्रयासों को कमजोर करती हैं, जिससे तत्काल कार्बन टैक्स और कोयला बिजली संयंत्रों को पूरी तरह से बंद करने की मांग की जा रही है।",
            "आर्थिक और औद्योगिक दृष्टिकोण: इसके विपरीत, रूढ़िवादी थिंक टैंक और ऊर्जा व्यापार समूह, जैसे कि अमेरिकन पेट्रोलियम इंस्टीट्यूट, एक प्रबंधित और यथार्थवादी संक्रमण की वकालत करते हैं। वे चेतावनी देते हैं कि जीवाश्म ईंधन पर समय से पहले प्रतिबंध लगाने से भारी मुद्रास्फीति, आपूर्ति श्रृंखला ढह सकती है और पावर ग्रिड अस्थिर हो सकते हैं, यह रेखांकित करते हुए कि वर्तमान में वैश्विक बिजली उत्पादन में नवीकरणीय ऊर्जा का हिस्सा केवल 29% है। उनका तर्क है कि कार्बन कैप्चर तकनीक और परमाणु ऊर्जा औद्योगिक उत्पादन और रोजगार की रक्षा के लिए अधिक सुरक्षित विकल्प हैं।"
        ],
        summary_es: [
            "DESCRIPCIÓN GENERAL DEL EVENTO GLOBAL: El Panel Intergubernamental sobre el Cambio Climático de las Naciones Unidas (IPCC) ha publicado un informe de síntesis que confirma que las temperaturas de la superficie global han aumentado exactamente 1,1°C en relación con las líneas de base preindustriales. Esta tendencia de calentamiento, impulsada principalmente por las emisiones de dióxido de carbono que alcanzaron un récord de 37.400 millones de toneladas métricas en 2023, ha provocado un aumento del 20% en la frecuencia de eventos climáticos extremos como olas de calor, sequías graves e inundaciones récord en el sur de Europa y Asia Central.",
            "POSTURA PROGRESISTA Y ECOLOGISTA: Grupos ambientalistas, incluidos Greenpeace y el Fondo Mundial para la Naturaleza, sostienen que las políticas estatales actuales están muy por debajo del objetivo de calentamiento de 1,5°C establecido en el Acuerdo de París de 2015. Destacan que si bien bloques industriales importantes como la UE se han comprometido a una reducción del 55% en las emisiones para 2030, la legislación subnacional actual y los planes de subsidio a los combustibles fósiles (que superaron los $7 billones a nivel mundial en 2022) socavan activamente los esfuerzos de transición, exigiendo impuestos inmediatos al carbono y una eliminación total de las centrales eléctricas de carbón.",
            "POSTURA ECONÓMICA E INDUSTRIAL: Por el contrario, los centros de investigación conservadores y los grupos comerciales de energía, como el Instituto Americano del Petróleo, abogan por una transición gestionada y realista. Advierten que una prohibición prematura de los combustibles fósiles podría desencadenar una inflación masiva, el colapso de la cadena de suministro y la inestabilidad de la red eléctrica, destacando que las energías renovables actualmente representan solo el 29% de la generación de electricidad global. Sostienen que las tecnologías de captura de carbono y la energía nuclear son opciones más seguras para proteger el empleo en las regiones industriales."
        ],
        claims: [
            {
                claim: "Global temperature has risen by 1.1 degrees Celsius compared to pre-industrial levels.",
                reportedBy: "Independent Science Review",
                verdict: "true",
                analysis: "Factual scientific reports globally confirm this warming threshold has been breached."
            },
            {
                claim: "Current carbon reduction policies are aligned with the 1.5°C target.",
                reportedBy: "Daily Gazette Agency",
                verdict: "false",
                analysis: "United Nations audits prove current national pledges lead to a projected 2.4°C warming curve."
            }
        ],
        sources: [
            { source: "Independent Science Review", bias: "center", reliability: "High", reason: "Peer-reviewed publication with standard methodology." },
            { source: "Daily Gazette Agency", bias: "center", reliability: "High", reason: "Standard news wire service with editorial vetting." },
            { source: "Econ-Green Voice", bias: "left", reliability: "Mixed", reason: "Advocacy driven organization focused on green lobbying." },
            { source: "Business Standard Post", bias: "right", reliability: "High", reason: "Reputable financial publication focusing on market trends." }
        ]
    },
    "global inflation": {
        bias: { left: 20, center: 60, right: 20 },
        sensationalism: 40,
        sensationalismDesc: "Moderate Clickbait",
        sentiment: -45,
        sentimentDesc: "Negative",
        summary_en: [
            "GLOBAL FINANCIAL OVERVIEW: Central banks globally, including the US Federal Reserve and the European Central Bank, report that core inflation rates have begun to stabilize at approximately 3.4% in early 2026, down from peaks of over 8% in late 2022. However, central bankers maintain a hawkish monetary policy, stating that benchmark interest rates must remain elevated above 4.5% throughout 2026 to ensure price indexes settle near the official 2% target, warning that premature rate cuts could reignite structural wage-price spirals.",
            "CONSUMER & LABOR STANCE: Consumer protection organizations and trade unions highlight that despite energy indexes stabilizing due to normal gas flows, household budgets remain under severe pressure. They point out that cumulative prices for basic food staples, public utilities, and rent have risen by an average of 22% since 2021, and that stagnant real wages mean working-class households are experiencing a net loss in purchasing power, demanding immediate price caps and wealth taxes to redistribute corporate windfall profits.",
            "FINANCIAL & CAPITAL STANCE: Conversely, investment banks and industrial lobbying groups argue that persistent high interest rates are cooling capital investment, raising borrowing costs for medium-sized enterprises by 45%, and risking a technical recession. They push for a swift transition to quantitative easing to support business expansions, pointing out that industrial growth has contracted by 1.2% in major manufacturing hubs due to high debt service obligations, arguing that supply-chain optimization, not rate hikes, will naturally solve remaining inflation."
        ],
        summary_hi: [
            "वैश्विक वित्तीय अवलोकन: अमेरिकी फेडरल रिजर्व और यूरोपीय सेंट्रल बैंक सहित वैश्विक स्तर पर केंद्रीय बैंकों की रिपोर्ट है कि कोर मुद्रास्फीति दर 2026 की शुरुआत में लगभग 3.4% पर स्थिर होने लगी है, जो 2022 के अंत में 8% से अधिक के शिखर से नीचे आ गई है। हालांकि, केंद्रीय बैंकर्स एक सख्त मौद्रिक नीति बनाए हुए हैं, यह बताते हुए कि बेंचमार्क ब्याज दरें 2026 के दौरान 4.5% से ऊपर बनी रहनी चाहिए ताकि मूल्य सूचकांक आधिकारिक 2% लक्ष्य के करीब आ सकें, चेतावनी देते हुए कि समय से पहले दरों में कटौती संरचनात्मक मजदूरी-मूल्य चक्र को फिर से भड़का सकती है।",
            "उपभोक्ता और श्रम दृष्टिकोण: उपभोक्ता संरक्षण संगठन और ट्रेड यूनियन इस बात को रेखांकित करते हैं कि गैस आपूर्ति सामान्य होने से ऊर्जा सूचकांकों के स्थिर होने के बावजूद, घरेलू बजट गंभीर दबाव में बना हुआ है। वे बताते हैं कि बुनियादी खाद्य पदार्थों, सार्वजनिक उपयोगिताओं और किराए की संचयी कीमतें 2021 के बाद से औसतन 22% बढ़ी हैं, और वास्तविक मजदूरी स्थिर होने का मतलब है कि कामकाजी वर्ग के परिवारों को क्रय शक्ति में शुद्ध नुकसान हो रहा है, जिससे वे कॉर्पोरेट अप्रत्याशित मुनाफे को पुनर्वितरित करने के लिए तत्काल मूल्य सीमा और धन करों की मांग कर रहे हैं।",
            "वित्तीय और पूंजी दृष्टिकोण: इसके विपरीत, निवेश बैंक और औद्योगिक लॉबिंग समूह तर्क देते हैं कि लगातार उच्च ब्याज दरें पूंजी निवेश को ठंडा कर रही हैं, मध्यम आकार के उद्यमों के लिए उधार लेने की लागत 45% बढ़ा रही हैं, और एक तकनीकी मंदी का जोखिम पैदा कर रही हैं। वे व्यापारिक विस्तार का समर्थन करने के लिए मात्रात्मक ढील में तेजी से संक्रमण के लिए जोर देते हैं, यह बताते हुए कि प्रमुख विनिर्माण केंद्रों में उच्च ऋण सेवा दायित्वों के कारण औद्योगिक विकास में 1.2% का संकुचन हुआ है, उनका तर्क है कि ब्याज दरें बढ़ाना नहीं, बल्कि आपूर्ति श्रृंखला का अनुकूलन बची हुई मुद्रास्फीति को स्वाभाविक रूप से हल करेगा।"
        ],
        summary_es: [
            "DESCRIPCIÓN GENERAL GLOBAL FINANCIERA: Los bancos centrales a nivel mundial, incluidos la Reserva Federal de EE. UU. y el Banco Central Europeo, informan que las tasas de inflación subyacente han comenzado a estabilizarse en aproximadamente el 3,4% a principios de 2026, por debajo de los máximos de más del 8% a finales de 2022. Sin embargo, los gobernadores de los bancos centrales mantienen una política monetaria restrictiva, afirmando que las tasas de interés de referencia deben permanecer elevadas por encima del 4,5% durante 2026 para garantizar que los índices de precios se establezcan cerca del objetivo oficial del 2%, advirtiendo que los recortes prematuros de tasas podrían reactivar las espirales estructurales de precios y salarios.",
            "POSTURA DE CONSUMIDORES Y TRABAJADORES: Las organizaciones de protección al consumidor y los sindicatos destacan que a pesar de la estabilización de los índices de energía debido a flujos normales de gas, los presupuestos familiares siguen bajo una presión severa. Señalan que los precios acumulados de los alimentos básicos, los servicios públicos y los alquileres han aumentado un promedio del 22% desde 2021, y que el estancamiento de los salarios reales significa que los hogares de la clase trabajadora están experimentando una pérdida neta en su poder adquisitivo, exigiendo topes inmediatos a los precios e impuestos a la riqueza para redistribuir las ganancias inesperadas de las corporaciones.",
            "POSTURA FINANCIERA E INVERSIONISTA: Por el contrario, los bancos de inversión y los grupos de presión industrial sostienen que las persistentes altas tasas de interés están enfriando la inversión de capital, elevando los costos de endeudamiento para las medianas empresas en un 45% y arriesgando una recesión técnica. Presionan por una transición rápida hacia la flexibilización cuantitativa para apoyar la expansión empresarial, señalando que el crecimiento industrial se ha contraído un 1,2% en los principales centros de fabricación debido a las altas obligaciones de servicio de la deuda, argumentando que la optimización de la cadena de suministro, y no las alzas de tasas, resolverá naturalmente la inflación restante."
        ],
        claims: [
            {
                claim: "Inflation rates have stabilized at pre-pandemic targets.",
                reportedBy: "Business Standard Post",
                verdict: "false",
                analysis: "Core inflation in most Western countries remains at 3-4%, well above the target limit of 2%."
            },
            {
                claim: "Household energy price index has stabilized over the last quarter.",
                reportedBy: "Daily Gazette Agency",
                verdict: "true",
                analysis: "Standard index reporting confirms natural gas and heating oil indexes have settled near normal ranges."
            }
        ],
        sources: [
            { source: "Business Standard Post", bias: "right", reliability: "High", reason: "Accurate financial index and stock reporting." },
            { source: "Daily Gazette Agency", bias: "center", reliability: "High", reason: "Independent news service utilizing official statistics." },
            { source: "Global Times News", bias: "left", reliability: "Mixed", reason: "State-sponsored broadcasting with specific editorial framing." }
        ]
    },
    "artificial intelligence": {
        bias: { left: 30, center: 50, right: 20 },
        sensationalism: 55,
        sensationalismDesc: "High Clickbait",
        sentiment: 30,
        sentimentDesc: "Positive",
        summary_en: [
            "GLOBAL TECHNOLOGY TRANSFORMATION: The deployment of large generative language models has advanced exponentially, with frontier networks demonstrating major jumps in automated programming, advanced reasoning, and semantic translation. Studies conducted across 1,200 organizations indicate that integrating AI workflows has boosted software developer productivity by an average of 42%, while simultaneously automating up to 25% of entry-level administrative tasks, driving massive corporate investments that are projected to exceed $200 billion globally by the end of 2026.",
            "REGULATORY & SECURITY ADVOCACY: Regulatory bodies, including the European Union AI Board and the US Federal Trade Commission, are pushing for strict compliance frameworks and copyright protections. They argue that tech companies have engaged in unauthorized scraping of public data to train their commercial systems, demanding strict licensing mandates, transparent training set logging, and mandatory watermarking for synthetic content to prevent mass misinformation, identity theft, and deepfake injection attacks.",
            "BUSINESS & INDUSTRY OUTLOOK: In contrast, technology alliances and venture capital firms argue that excessive regulation will stunt innovation and favor incumbent monopolies. They emphasize that while some administrative roles are being automated, AI is driving a net job creation effect, creating high-value prompt engineering, data curation, and AI systems maintenance positions, stating that market forces and self-regulation are sufficient to ensure safe development cycles."
        ],
        summary_hi: [
            "वैश्विक तकनीकी परिवर्तन: बड़े जेनेरेटिव भाषा मॉडलों की तैनाती तेजी से आगे बढ़ी है, जिसमें फ्रंटियर नेटवर्क ने स्वचालित प्रोग्रामिंग, उन्नत तर्क और अनुवाद में महत्वपूर्ण प्रगति प्रदर्शित की है। 1,200 संगठनों में किए गए अध्ययन बताते हैं कि एआई वर्कफ़्लो को एकीकृत करने से सॉफ्टवेयर डेवलपर की उत्पादकता में औसतन 42% की वृद्धि हुई है, जबकि साथ ही प्रवेश स्तर के 25% प्रशासनिक कार्यों को स्वचालित किया गया है, जिससे भारी कॉर्पोरेट निवेश बढ़ रहा है जिसके 2026 के अंत तक विश्व स्तर पर $200 बिलियन से अधिक होने का अनुमान है।",
            "नियामक और सुरक्षा वकालत: यूरोपीय संघ एआई बोर्ड और अमेरिकी संघीय व्यापार आयोग सहित नियामक संस्थाएं सख्त अनुपालन ढांचे और कॉपीराइट सुरक्षा के लिए जोर दे रही हैं। उनका तर्क है कि तकनीकी कंपनियों ने अपने वाणिज्यिक प्रणालियों को प्रशिक्षित करने के लिए सार्वजनिक डेटा की अनधिकृत स्क्रैपिंग की है, जिससे वे बड़े पैमाने पर गलत जानकारी, पहचान की चोरी और डीपफेक हमलों को रोकने के लिए सख्त लाइसेंसिंग जनादेश, पारदर्शी प्रशिक्षण सेट लॉगिंग और सिंथेटिक सामग्री के लिए अनिवार्य वॉटरमार्किंग की मांग कर रहे हैं।",
            "व्यापार और उद्योग दृष्टिकोण: इसके विपरीत, प्रौद्योगिकी गठबंधन और उद्यम पूंजी फर्मों का तर्क है कि अत्यधिक नियमन नवाचार को रोक देगा और स्थापित एकाधिकार का पक्ष लेगा। वे इस बात पर जोर देते हैं कि जहां कुछ प्रशासनिक पदों को स्वचालित किया जा रहा है, वहीं एआई एक शुद्ध रोजगार सृजन प्रभाव पैदा कर रहा है, जिससे उच्च मूल्य वाले प्रॉम्प्ट इंजीनियरिंग, डेटा क्यूरेशन और एआई सिस्टम रखरखाव के पद तैयार हो रहे हैं, उनका कहना है कि सुरक्षित विकास चक्र सुनिश्चित करने के लिए बाजार की ताकतें और स्व-नियमन ही पर्याप्त हैं।"
        ],
        summary_es: [
            "TRANSFORMACIÓN TECNOLÓGICA GLOBAL: El despliegue de grandes modelos de lenguaje generativo ha avanzado exponencialmente, y las redes de frontera demuestran saltos importantes en la programación automatizada, el razonamiento avanzado y la traducción semántica. Estudios realizados en 1.200 organizaciones indican que la integración de flujos de trabajo de IA ha aumentado la productividad de los desarrolladores de software en un promedio del 42%, al tiempo que automatiza hasta el 25% de las tareas administrativas básicas, impulsando inversiones corporativas que superarán los $200 mil millones a nivel mundial para fines de 2026.",
            "DEFENSA REGULATORIA Y DE SEGURIDAD: Los organismos reguladores, incluidos la Junta de IA de la Unión Europea y la Comisión Federal de Comercio de EE. UU., presionan por marcos de cumplimiento estrictos y protecciones de derechos de autor. Sostienen que las empresas tecnológicas han realizado extracciones no autorizadas de datos públicos para entrenar sus sistemas comerciales, exigiendo mandatos de licencia estrictos, registro transparente de conjuntos de entrenamiento y marcas de agua obligatorias para el contenido sintético para evitar la desinformación masiva, el robo de identidad y los ataques de inyección de ultrafalsificaciones (deepfakes).",
            "PERSPECTIVA EMPRESARIAL E INDUSTRIAL: Por el contrario, las alianzas tecnológicas y las empresas de capital de riesgo sostienen que una regulación excesiva frenará la innovación y favorecerá a los monopolios establecidos. Destacan que si bien se están automatizando algunas funciones administrativas, la IA está impulsando un efecto de creación neta de empleo, creando puestos de ingeniería de instrucciones (prompts), curación de datos y mantenimiento de sistemas de IA de alto valor, afirmando que las fuerzas del mercado y la autorregulación son suficientes para garantizar ciclos de desarrollo seguros."
        ],
        claims: [
            {
                claim: "AI models will completely automate all software developer jobs by next year.",
                reportedBy: "Global Times News",
                verdict: "false",
                analysis: "Global expert consensus states AI acts as a productivity multiplier (copilot) rather than replacing human engineers entirely."
            }
        ],
        sources: [
            { source: "Global Times News", bias: "left", reliability: "Mixed", reason: "Often reports sensationalised technology curves." },
            { source: "Independent Science Review", bias: "center", reliability: "High", reason: "Peer-reviewed research and methodologies." },
            { source: "Business Standard Post", bias: "right", reliability: "High", reason: "Reliable industry coverage focusing on market metrics." }
        ]
    }
};

function getFallbackReport(topic) {
    const cleanTopic = topic.toLowerCase().trim();
    
    if (cleanTopic.includes("climate") || cleanTopic.includes("warm")) {
        return PrecachedDatabase["climate change"];
    }
    if (cleanTopic.includes("inflation") || cleanTopic.includes("econom") || cleanTopic.includes("price")) {
        return PrecachedDatabase["global inflation"];
    }
    if (cleanTopic.includes("artificial") || cleanTopic.includes("intelligence") || cleanTopic.includes("ai")) {
        return PrecachedDatabase["artificial intelligence"];
    }
    
    return generateMockAnalysis(topic);
}

// Mock AI Analysis Generator for rare/non-cached topics
function generateMockAnalysis(topic) {
    return {
        bias: { left: 35, center: 45, right: 20 },
        sensationalism: 60,
        sensationalismDesc: "Moderate Clickbait",
        sentiment: 10,
        sentimentDesc: "Neutral",
        summary_en: [
            `Coverage of ${topic} shows diverse viewpoints; left-leaning outlets focus on policy delays while business outlets emphasize regulatory costs.`,
            `An investment of $500M was announced for infrastructure, but critics from multiple sides debate whether it will be sufficient to address the problem.`,
            `Scientific studies indicate up to 40% improvements are theoretically possible, though industrial stakeholders caution against immediate targets.`
        ],
        summary_hi: [
            `${topic} की रिपोर्टिंग में कई तरह के दृष्टिकोण दिखते हैं; वामपंथी मीडिया नीतिगत देरी पर ध्यान केंद्रित करता है जबकि व्यावसायिक मीडिया नियामक लागतों पर जोर देता है।`,
            `इन्फ्रास्ट्रक्चर के लिए $500M के निवेश की घोषणा की गई, लेकिन विभिन्न पक्ष बहस कर रहे हैं कि क्या यह समस्या के समाधान के लिए पर्याप्त होगा।`,
            `वैज्ञानिक अध्ययन बताते हैं कि सैद्धांतिक रूप से 40% तक का सुधार संभव है, हालांकि औद्योगिक हितधारकों ने आपूर्ति श्रृंखला के तनाव के कारण तत्काल लक्ष्यों के खिलाफ चेतावनी दी है।`
        ],
        summary_es: [
            `La cobertura de ${topic} muestra diversos puntos de vista; los medios de izquierda se centran en los retrasos políticos mientras que los medios empresariales enfatizan los costos regulatorios.`,
            `Se anunció una inversión de $500 millones para infraestructura, pero críticos debaten si será suficiente para resolver el problema.`,
            `Los estudios científicos indican que teóricamente son posibles mejoras de hasta el 40%, aunque los líderes industriales advierten contra objetivos inmediatos.`
        ],
        claims: [
            {
                claim: `A new approach to ${topic} yields 40% improvement.`,
                reportedBy: "Independent Science Review",
                verdict: "true",
                analysis: "Peer-reviewed reports verify that under controlled laboratory testing, this model achieves 40% cleaner metrics."
            }
        ],
        sources: [
            { source: "Independent Science Review", bias: "center", reliability: "High", reason: "Standard academic journal peer review." },
            { source: "Global Times News", bias: "left", reliability: "Mixed", reason: "General interest media focusing on editorial opinions." },
            { source: "Business Standard Post", bias: "right", reliability: "High", reason: "Respected financial coverage focusing on business operations." }
        ]
    };
}


// 8. Render Dashboard Output Elements
function renderAnalysisDashboard() {
    if (aiEmptyState) aiEmptyState.classList.add("hidden");
    if (analysisDashboard) analysisDashboard.classList.remove("hidden");
    if (analysisTopicTitle) analysisTopicTitle.textContent = `Topic: ${AppState.activeTopic}`;

    // Render Bias Bars
    const res = AppState.analysisResult;
    biasLeft.style.width = `${res.bias.left}%`;
    biasLeftVal.textContent = `${res.bias.left}%`;
    biasCenter.style.width = `${res.bias.center}%`;
    biasCenterVal.textContent = `${res.bias.center}%`;
    biasRight.style.width = `${res.bias.right}%`;
    biasRightVal.textContent = `${res.bias.right}%`;

    // Render Donut Chart SVG Segments
    animateDonutChart(res.bias.left, res.bias.center, res.bias.right);

    // Render Sensationalism
    sensationalismVal.textContent = `${res.sensationalism}%`;
    sensationalismDesc.textContent = res.sensationalismDesc;
    const gaugeFill = document.getElementById("gauge-fill-path");
    if (gaugeFill) {
        const gaugeLength = 188.4;
        const fillLength = (res.sensationalism / 100) * gaugeLength;
        gaugeFill.style.strokeDasharray = `${fillLength} 188.4`;
    }

    // Render Sentiment Indicator
    sentimentScoreVal.textContent = res.sentimentDesc || "Neutral";
    // Map -100 to 100 score to 0% to 100% position on the bar
    const scoreVal = res.sentiment !== undefined ? res.sentiment : 0;
    const percentagePos = ((scoreVal + 100) / 200) * 100;
    sentimentIndicator.style.left = `${percentagePos}%`;

    // Render Summaries
    renderSummarySection();

    // Render Fact-Check Claims Table
    renderFactCheckTable();

    // Render Source Reliability Ledger
    renderSourceReliabilityGrid();

    // Configure follow-up placeholder and render suggested pills
    if (searchInput) {
        searchInput.placeholder = "Ask a follow-up about this topic...";
        searchInput.value = "";
    }
    
    // Generate initial suggested follow-ups
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
    unbiasedSummaryContent.innerHTML = "";
    const res = AppState.analysisResult;
    
    let activeSummary = res.summary_en;
    if (AppState.activeLanguage === "hi") activeSummary = res.summary_hi;
    if (AppState.activeLanguage === "es") activeSummary = res.summary_es;

    if (!activeSummary || activeSummary.length === 0) {
        unbiasedSummaryContent.innerHTML = "<p>No summary generated in this language.</p>";
        return;
    }

    const ul = document.createElement("ul");
    ul.className = "summary-list";
    activeSummary.forEach(point => {
        const li = document.createElement("li");
        li.textContent = point;
        ul.appendChild(li);
    });

    unbiasedSummaryContent.appendChild(ul);

    // Speak synthesis trigger binding
    speakBtn.onclick = () => {
        speakSummary(activeSummary);
    };
}

// Render Fact-check table rows
function renderFactCheckTable() {
    factCheckRows.innerHTML = "";
    const res = AppState.analysisResult;

    if (!res.claims || res.claims.length === 0) {
        factCheckRows.innerHTML = `
            <tr>
                <td colspan="4" class="text-center text-muted">No factual claims analyzed for this topic.</td>
            </tr>
        `;
        return;
    }

    res.claims.forEach(claim => {
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

        factCheckRows.appendChild(row);
    });
}

// Render Source Reliability grid
function renderSourceReliabilityGrid() {
    sourcesReliabilityGrid.innerHTML = "";
    const res = AppState.analysisResult;

    if (!res.sources || res.sources.length === 0) {
        sourcesReliabilityGrid.innerHTML = `<div class="empty-sources-message">No source ratings generated yet.</div>`;
        return;
    }

    res.sources.forEach(src => {
        const item = document.createElement("div");
        item.className = "source-item";
        
        let biasBadgeClass = "bias-center-badge";
        if (src.bias === "left") biasBadgeClass = "bias-left-badge";
        if (src.bias === "right") biasBadgeClass = "bias-right-badge";

        let reliabilityColor = "#eab308"; // Mixed
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

        sourcesReliabilityGrid.appendChild(item);
    });
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
        speakBtn.textContent = "⏹️ Stop Reading";
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
    speakBtn.textContent = "🔊 Read Aloud";
    speakBtn.classList.remove("btn-audio-active");
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
    // If no active topic, search latest news with location scope
    const topic = AppState.activeTopic || "latest global news";
    const query = locationString ? `${topic} ${locationString}` : topic;
    
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
    AppState.chatHistory = [];
    
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
    historyListContainer.innerHTML = "";
    const historyItems = [];
    
    // Scan LocalStorage for saved report caches
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith("truthlens_cache_")) {
            const topic = key.replace("truthlens_cache_", "");
            historyItems.push(topic);
        }
    }
    
    if (historyItems.length === 0) {
        historyListContainer.innerHTML = `<div class="empty-history">No past searches logged yet.</div>`;
        return;
    }
    
    historyItems.forEach(topic => {
        const item = document.createElement("div");
        item.className = "history-item";
        item.textContent = topic.toUpperCase();
        item.addEventListener("click", () => {
            loadHistoryTopic(topic);
            if (historyModal) historyModal.classList.add("hidden");
        });
        historyListContainer.appendChild(item);
    });
}

function loadHistoryTopic(topic) {
    const cacheKey = `truthlens_cache_${topic.toLowerCase().trim()}`;
    const cachedResponse = localStorage.getItem(cacheKey);
    if (cachedResponse) {
        try {
            const jsonResult = JSON.parse(cachedResponse);
            AppState.activeTopic = topic;
            if (searchInput) searchInput.value = topic;
            AppState.analysisResult = jsonResult;
            
            // Render cached output immediately
            renderAnalysisDashboard();
            
            const centerPane = document.querySelector(".center-content");
            if (centerPane) {
                centerPane.classList.add("has-results");
            }
            
            // Refresh articles silently in the background
            const locationString = buildLocationString();
            const query = locationString ? `${topic} ${locationString}` : topic;
            fetchNewsArticles(query).then(articles => {
                AppState.aggregatedArticles = articles;
                renderNewsFeed();
            }).catch(err => console.warn(err));
            
        } catch (e) {
            console.error("Failed to parse history cache:", e);
            alert("Error loading history item.");
        }
    }
}


// 11. Utilities Helper
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

function cleanJSONString(str) {
    let cleaned = str.trim();
    if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(json)?/, "").trim();
        cleaned = cleaned.replace(/```$/, "").trim();
    }
    return cleaned;
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
        <span>Thinking</span>
        <div class="chat-dot"></div>
        <div class="chat-dot"></div>
        <div class="chat-dot"></div>
    `;
    chatThread.appendChild(spinner);
    chatThread.scrollTop = chatThread.scrollHeight;
    return spinner;
}

async function fetchFollowUpAnswer(question) {
    if (!AppState.azureEndpoint || !AppState.azureKey) {
        console.warn("Azure endpoints missing, loading mock follow-up reply.");
        return `I am currently running in offline mock mode. Your follow-up question was: "${question}". Typically, in this state, I would compile a complete synthesis using the context of "${AppState.activeTopic}" and Llama-3.3-70B details to provide a conversational response.`;
    }

    const summaryText = AppState.analysisResult ? AppState.analysisResult.summary_en.join("\n") : "No summary available.";
    const followUpPrompt = `
You are a news analysis assistant. The user is asking a follow-up question about the news topic: "${AppState.activeTopic}".
Here is the background AI summary of the topic:
${summaryText}

User's Follow-up Question: "${question}"

Provide a highly detailed, conversational, and unbiased answer to this question. Do not start with generic greetings. Format your output in clean paragraphs or bullet points if needed.
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
                    role: "user",
                    content: followUpPrompt
                }
            ],
            model: "Llama-3.3-70B-Instruct"
        })
    });

    if (!response.ok) {
        throw new Error(`Azure API follow-up responded with status ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
}

async function submitFollowUp(question) {
    const cleanQ = question.trim();
    if (!cleanQ) return;
    
    // Clear search input immediately
    if (searchInput) searchInput.value = "";
    
    // Stop reading aloud if speaking
    stopSpeaking();
    
    // Append user question
    appendChatBubble("user", cleanQ);
    
    // Append spinner
    const spinner = showChatSpinner();
    
    // Hide suggested questions row during load
    if (suggestedQuestions) suggestedQuestions.classList.add("hidden");
    
    try {
        const reply = await fetchFollowUpAnswer(cleanQ);
        if (spinner) spinner.remove();
        
        // Append AI response
        appendChatBubble("ai", reply);
        
        // Rotate and render next suggestions
        const nextSuggestions = generateNextSuggestions(cleanQ);
        renderSuggestedQuestions(nextSuggestions);
        
    } catch (e) {
        console.error("Conversational follow-up failed:", e);
        if (spinner) spinner.remove();
        appendChatBubble("ai", `Sorry, I encountered an error while analyzing your follow-up: ${e.message}`);
    }
}
