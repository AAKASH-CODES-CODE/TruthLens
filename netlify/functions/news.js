exports.handler = async function(event, context) {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const query = event.queryStringParameters.q || "latest global news";
  
  // Support comma-separated keys for failover
  const rawKeys = process.env.NEWS_API_KEY || "";
  const apiKeys = rawKeys.split(",").map(k => k.trim()).filter(Boolean);

  if (apiKeys.length === 0) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "No API keys configured." })
    };
  }

  let lastError = null;
  for (const apiKey of apiKeys) {
    try {
      const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&pageSize=6&sortBy=relevancy&language=en&apiKey=${apiKey}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Status ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.status !== "ok") {
        throw new Error(data.message || "NewsAPI error");
      }

      const articles = (data.articles || []).map((art) => ({
        title: art.title,
        source: art.source?.name || "Unknown Source",
        description: art.description || "No description available.",
        url: art.url
      }));

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify(articles)
      };
    } catch (e) {
      console.warn(`Key ${apiKey.slice(0, 5)}... failed: ${e.message}`);
      lastError = e;
    }
  }

  return {
    statusCode: 500,
    body: JSON.stringify({ error: `All news API keys failed. Last error: ${lastError.message}` })
  };
};
