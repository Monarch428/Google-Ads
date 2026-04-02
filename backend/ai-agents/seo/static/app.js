const API_BASE = "http://127.0.0.1:8000";

async function runFullAnalysis() {
  const url = document.getElementById("urlInput").value.trim();
  if (!url) {
    alert("Please enter a website URL!");
    return;
  }

  document.getElementById("loading").classList.remove("hidden");
  document.getElementById("results").classList.add("hidden");

  try {
    const response = await fetch(`${API_BASE}/analyze/full?url=${encodeURIComponent(url)}`);
    const data = await response.json();

    document.getElementById("resultsOutput").textContent = JSON.stringify(data, null, 2);
    document.getElementById("loading").classList.add("hidden");
    document.getElementById("results").classList.remove("hidden");
  } catch (err) {
    console.error(err);
    alert("Error running analysis. Check console for details.");
    document.getElementById("loading").classList.add("hidden");
  }
}

async function generateLLMReport() {
  document.getElementById("llmSection").classList.remove("hidden");
  document.getElementById("llmOutput").textContent = "⏳ Generating AI insights...";

  try {
    const response = await fetch(`${API_BASE}/analyze/llm-report`);
    const data = await response.json();
    document.getElementById("llmOutput").textContent = data.llm_insights || "No insights found.";
  } catch (err) {
    console.error(err);
    document.getElementById("llmOutput").textContent = "⚠️ Error generating insights.";
  }
}
