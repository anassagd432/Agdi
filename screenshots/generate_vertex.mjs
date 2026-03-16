import { execSync } from "child_process";

const PROJECT_ID = "abiding-sunset-479505-r6";
const LOCATION = "us-central1"; // Vertex genAI models are primarily in us-central1
const MODEL = "veo-2.0-generate-001"; // Testing the latest available public Veo model

const ENDPOINT = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL}:predictLongRunning`;

async function generateVertexVideo() {
  console.log("🎬 Initializing Vertex AI Video Generation...");
  console.log(`📦 Project: ${PROJECT_ID} | Model: ${MODEL}`);
  
  let accessToken = "";
  try {
    console.log("🔑 Fetching gcloud authentication token...");
    accessToken = execSync("gcloud auth print-access-token", { encoding: "utf8" }).trim();
  } catch (err) {
    console.error("❌ Failed to get gcloud token. Ensure you ran 'gcloud auth application-default login'");
    process.exit(1);
  }

  console.log("🔗 Connecting to Vertex AI Predict Endpoint...");

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { 
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json" 
      },
      body: JSON.stringify({
        instances: [
          {
            prompt: "Cinematic 60fps screen recording of a dashboard transitioning smoothly.",
          }
        ],
        parameters: { 
          aspectRatio: "16:9",
          personGeneration: "DONT_ALLOW"
        }
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log("✅ Vertex AI Request Accepted!");
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.error("\n❌ Vertex API Request Failed:");
      console.error(JSON.stringify(data, null, 2));
      console.log("\n⚠️ Note: The Veo model might require an allowlist on this specific GCP project or a different model ID (like 'veo-3.1-generate-preview').");
    }
  } catch (error) {
    console.error("❌ Execution Error:", error.message);
  }
}

generateVertexVideo();
