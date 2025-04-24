require("dotenv").config({ path: __dirname + '/.env' });
const http = require("http");
const { CombinedFactCheckAgent } = require("./whole");

// Helper function to parse JSON body (reused from server.js pattern)
async function parseJSONBody(req) {
  return new Promise((resolve) => {
    let body = [];
    req.on("data", (chunk) => body.push(chunk));
    req.on("end", () => {
      if (body.length === 0) return resolve({});
      try {
        return resolve(JSON.parse(Buffer.concat(body).toString()));
      } catch (e) {
        return resolve({});
      }
    });
  });
}

// Initialize the agent
const factCheckAgent = new CombinedFactCheckAgent();

const requestHandler = async (req, res) => {
  try {
    // Set CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    // Fact check endpoint
    if (req.url === "/api/agent/fact-check" && req.method === "POST") {
      const { text } = await parseJSONBody(req);
      
      if (!text) {
        res.writeHead(400, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ error: "Missing text to fact check" }));
      }

      try {
        const fullResult = await factCheckAgent.run(text);
        
        // Extract only the necessary data for the response
        // Remove embeddings, chunks, and other processing data
        const cleanResult = {
          summary: fullResult.summary,
          report: fullResult.report,
          // Include only the URLs from relevant_metadata for reference
          sources: fullResult.relevant_metadata || []
        };
        
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ 
          success: true,
          result: cleanResult
        }));
      } catch (error) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ 
          error: "Fact check processing failed",
          details: error.message 
        }));
      }
    } else {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Endpoint not found" }));
    }
  } catch (error) {
    console.error(error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error", details: error.message }));
  }
};

// Create and start the server
const PORT = process.env.AGENT_PORT || 3001;
http.createServer(requestHandler).listen(PORT, () => {
  console.log(`Agent API server running at http://localhost:${PORT}`);
});