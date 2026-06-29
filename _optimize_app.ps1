$path = 'app.js'
$text = Get-Content $path -Raw

$text = $text -replace 'domCache: \{\r?\n\s*centerPane: null,\r?\n\s*gaugeFill: null\r?\n\s*\}\r?\n\};', "domCache: {`r`n        centerPane: null,`r`n        gaugeFill: null`r`n    },`r`n    fallbackReports: null,`r`n    fallbackReportsPromise: null`r`n};"
$text = $text -replace 'return getFallbackReport\(topic\);', 'return await getFallbackReport(topic);'

$replacement = @'
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
        summary_hi: [],
        summary_es: [],
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

async function loadFallbackReports() {
    if (AppState.fallbackReports) {
        return AppState.fallbackReports;
    }

    if (!AppState.fallbackReportsPromise) {
        AppState.fallbackReportsPromise = fetch("fallback-reports.json", { cache: "force-cache" })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Fallback reports responded with status ${response.status}`);
                }
                return response.json();
            })
            .then((data) => {
                AppState.fallbackReports = data || {};
                return AppState.fallbackReports;
            })
            .catch((error) => {
                console.warn("Unable to load fallback reports:", error);
                AppState.fallbackReports = {};
                return AppState.fallbackReports;
            })
            .finally(() => {
                AppState.fallbackReportsPromise = null;
            });
    }

    return AppState.fallbackReportsPromise;
}

async function getFallbackReport(topic) {
    const cleanTopic = topic.toLowerCase().trim();
    const fallbackReports = await loadFallbackReports();

    if (cleanTopic.includes("climate") || cleanTopic.includes("warm")) {
        return compactAnalysisPayload(fallbackReports["climate change"]);
    }
    if (cleanTopic.includes("inflation") || cleanTopic.includes("econom") || cleanTopic.includes("price")) {
        return compactAnalysisPayload(fallbackReports["global inflation"]);
    }
    if (cleanTopic.includes("artificial") || cleanTopic.includes("intelligence") || cleanTopic.includes("ai")) {
        return compactAnalysisPayload(fallbackReports["artificial intelligence"]);
    }

    return generateMockAnalysis(topic);
}

// 8. Render Dashboard Output Elements
'@

$text = [regex]::Replace($text, 'function generateMockAnalysis\(topic\) \{[\s\S]*?// 8\. Render Dashboard Output Elements', $replacement)
$text = [regex]::Replace($text, 'const PrecachedDatabase = \{[\s\S]*?function compactAnalysisPayload\(report\) \{', 'function compactAnalysisPayload(report) {')

Set-Content $path $text
