import fs from "fs";
import path from "path";

const API_KEY = process.env.GOOGLE_API_KEY;

if (!API_KEY) {
  console.error("❌ ERROR: GOOGLE_API_KEY environment variable is missing.");
  console.error("Please ensure you ran 'set GOOGLE_API_KEY=your_key_here' in THIS command prompt.");
  process.exit(1);
}

// Target endpoint for Gemini/Google video generation 
// Testing the Generative Language REST endpoint with Veo 3.1
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-generate-video:predict?key=${API_KEY}`;

async function generateVideo() {
  console.log("🎬 Initializing Google AI Video Generation...");
  console.log("🔑 API Key Found:", API_KEY.substring(0, 8) + "...");
  console.log("🔗 Connecting to endpoint...");

  try {
    // This payload is a standard mock structure for testing video generation access.
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [
          {
            prompt: "Cinematic 60fps screen recording of a dashboard transitioning smoothly.",
          }
        ],
        parameters: { fps: 60, aspect_ratio: "16:9" }
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log("✅ API Request Accepted! Generation started.");
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.error("\n❌ API Request Failed:");
      console.error(JSON.stringify(data, null, 2));
      console.log("\n⚠️ Note: Veo 3.1 video generation is currently restricted to Google Cloud Vertex AI and requires GCP authentication (`gcloud auth login`), not just an AI Studio API key. Your key might only have text/image access.");
    }
  } catch (error) {
    console.error("❌ Network or Execution Error:", error.message);
  }
}

generateVideo();
