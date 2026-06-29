exports.handler = async function(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const azureEndpoint = process.env.AZURE_API_ENDPOINT;
  const azureKey = process.env.AZURE_API_KEY;

  if (!azureEndpoint || !azureKey) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "AZURE_API_ENDPOINT or AZURE_API_KEY is not configured." })
    };
  }

  try {
    const { query } = JSON.parse(event.body);

    const response = await fetch(azureEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": azureKey
      },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: `Correct any spelling mistakes or typos in this search term so it works well for a news search engine: '${query}'. Return ONLY the corrected search term. Do not write anything else, no explanations, no quotes.`
          }
        ],
        model: "Llama-3.3-70B-Instruct",
        max_tokens: 50,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      return { statusCode: response.status, body: `Azure API error: ${response.statusText}` };
    }

    const data = await response.json();
    const corrected = data?.choices?.[0]?.message?.content || "";

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({ corrected: corrected.replace(/['"‘“’”.]/g, "").trim() })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
