exports.handler = async function(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const azureEndpoint = process.env.AZURE_API_ENDPOINT;
  const azureKey = process.env.AZURE_API_KEY;

  if (!azureEndpoint || !azureKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "AZURE_API_ENDPOINT or AZURE_API_KEY is not configured in Netlify." })
    };
  }

  try {
    const { topicLabel, articles, lang } = JSON.parse(event.body);

    const activeLangName = { "en": "English", "hi": "Hindi", "es": "Spanish" }[lang] || "English";

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

    const response = await fetch(azureEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": azureKey
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

    if (!response.ok) {
      return { statusCode: response.status, body: `Azure API returned error: ${response.statusText}` };
    }

    const data = await response.json();
    const responseText = data?.choices?.[0]?.message?.content || "";

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ content: responseText })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
