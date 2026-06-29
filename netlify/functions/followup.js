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
    const { question, topic, chatHistory, summary, articles, lang } = JSON.parse(event.body);

    const activeLangName = { "en": "English", "hi": "Hindi", "es": "Spanish" }[lang] || "English";

    const summaryText = Array.isArray(summary) ? summary.slice(0, 3).join("\n") : "No summary available.";
    const articleContext = (articles || [])
      .map((art, idx) => `Article ${idx + 1}: ${art.title} | ${art.source} | ${art.description}`)
      .join("\n");

    const followUpPrompt = `
You are a careful news analysis assistant. Answer only from the provided investigation context.
If the available evidence is insufficient, say that clearly instead of inventing facts.

Current topic: "${topic}"

Background summary:
${summaryText}

Related live articles:
${articleContext}

User follow-up question:
"${question}"

Answer the user's question directly, clearly, and concisely in ${activeLangName}. Keep the length of the response natural and proportional to the complexity of the question: for simple questions keep it brief and short, and use bullet points or brief paragraphs only when necessary for complex inquiries.
At the very end of your response, output a delimiter block "===SUGGESTIONS===" followed by exactly 3 suggested follow-up questions in ${activeLangName} (each on a new line). Do not wrap the suggestions in any JSON or array brackets.

Example structure:
[Your concise answer here]

===SUGGESTIONS===
First suggested question?
Second suggested question?
Third suggested question?
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
