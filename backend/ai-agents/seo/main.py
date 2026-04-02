# main.py 
import os
import json
import logging
from datetime import datetime
import asyncio
from fastapi import FastAPI, HTTPException, Query
from typing import Optional
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
# ------------------- Agents -------------------
from agents.technical_seo import WebErrorDetector
from agents.html_test import WebsiteHTMLAuditor
from agents.keyword_extractor import  ContentSEOOptimizer
from agents.link_check import LinkSEOOtimizer
from agents.speed_analyzer import SpeedAnalyzer
from agents.seo_scoring import SEOScorer
from dotenv import load_dotenv
import logging
import openai

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

PSI_API_KEY = os.getenv("PSI_API_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

os.makedirs("seo_reports", exist_ok=True)
openai.api_key = OPENAI_API_KEY
                                                                                                                 
app = FastAPI(title="SEO Analysis Agent")

# Serve static folder
app.mount("/static", StaticFiles(directory="static"), name="static")

# ------------------- Helpers -------------------
def save_json(data, name_prefix: str):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"seo_reports/{name_prefix}_{timestamp}.json"
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    logger.info(f"Report saved: {filename}")
    return filename

# ------------------- SEO Manager -------------------
class SEOManager:
    def __init__(self, psi_api_key: Optional[str] = None, openai_api_key: Optional[str] = None):
        self.results = {}
        self.PSI_API_KEY = psi_api_key
        self.OPENAI_API_KEY = openai_api_key

    async def run_web_errors(self, url: str):
        return await asyncio.get_event_loop().run_in_executor(None, lambda: WebErrorDetector().analyze_website(url, check_js=False, check_links=True))

    async def run_technical_seo(self, url: str):
        return await asyncio.get_event_loop().run_in_executor(None, lambda: WebsiteHTMLAuditor(url).detect_errors())

    async def run_content_seo(self, url: str):
        return await asyncio.get_event_loop().run_in_executor(None, lambda: ContentSEOOptimizer(url).run_all_checks())

    async def run_links_seo(self, url: str):
        return await asyncio.get_event_loop().run_in_executor(None, lambda: LinkSEOOtimizer(url).run_all_checks())

    async def run_speed_test(self, url: str):
        if not self.PSI_API_KEY:
            return {"error": "PSI_API_KEY missing"}
        
        analyzer = SpeedAnalyzer(api_key=self.PSI_API_KEY)
        result = await analyzer.check_speed(url) 
        metrics = analyzer.extract_metrics(result)  
        return metrics

    async def calculate_seo_score(self, reports: dict):
        return await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: SEOScorer(
                technical_report=reports.get("technical_seo", {}),
                content_report=reports.get("content_seo", {}),
                links_report=reports.get("links_seo", {}),
                speed_report=reports.get("speed_test", {}),
            ).calculate_total_score()
        )

    async def run_full_analysis(self, url: str):
        logger.info(f"Running full SEO analysis for {url}")
        tasks = [
            self.run_web_errors(url),
            self.run_technical_seo(url),
            self.run_content_seo(url),
            self.run_links_seo(url),
            self.run_speed_test(url)
        ]
        web_errors, technical, content, links, speed = await asyncio.gather(*tasks)

        self.results = {
            "url": url,
            "web_errors": web_errors,
            "technical_seo": technical,
            "content_seo": content,
            "links_seo": links,
            "speed_test": speed
        }

        self.results["seo_score"] = await self.calculate_seo_score(self.results)
        save_json(self.results, "seo_full_report")
        return self.results

    # ------------------- LLM Report -------------------
    async def generate_llm_report(self):
        if not self.results:
            raise HTTPException(status_code=404, detail="No analysis results found. Run /analyze/full first.")
        if not self.OPENAI_API_KEY:
            raise HTTPException(status_code=500, detail="OPENAI_API_KEY not set. Cannot generate LLM report.")

        prompt = f"""
        You are an SEO expert. Analyze the following website SEO report and provide actionable insights:
        {json.dumps(self.results, indent=2)}
        Give recommendations for improving technical SEO, content, links, speed, and overall SEO score in bullet points.
        """

        response = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: openai.ChatCompletion.create(
                model="gpt-4",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.5,
                max_tokens=500
            )
        )
        insights = response.choices[0].message.content.strip()
        return {"llm_insights": insights}

manager = SEOManager(psi_api_key=PSI_API_KEY, openai_api_key=OPENAI_API_KEY)

# API Endpoints
@app.get("/health")
async def health_check():
    return {"status": "ok", "time": datetime.now().isoformat()}

# Favicon route
@app.get("/favicon.ico")
async def favicon():
    favicon_path = os.path.join("static", "favicon.ico")
    return FileResponse(favicon_path)

@app.get("/analyze/web-errors")
async def web_errors(url: str = Query(..., description="Website URL")):
    return await manager.run_web_errors(url)

@app.get("/analyze/technical-seo")
async def technical_seo(url: str = Query(..., description="Website URL")):
    return await manager.run_technical_seo(url)

@app.get("/analyze/content-seo")
async def content_seo(url: str = Query(..., description="Website URL")):
    return await manager.run_content_seo(url)

@app.get("/analyze/links-seo")
async def links_seo(url: str = Query(..., description="Website URL")):
    return await manager.run_links_seo(url)

@app.get("/speed")
async def get_speed(url: str):
    analyzer = SpeedAnalyzer()
    raw = await analyzer.check_speed(url)
    metrics = analyzer.extract_metrics(raw)
    return metrics

@app.get("/analyze/seo-score")
async def seo_score(url: str = Query(..., description="Website URL")):
    if not manager.results or manager.results.get("url") != url:
        raise HTTPException(status_code=404, detail="Run full analysis first")
    return manager.results.get("seo_score", {})

@app.get("/analyze/full")
async def full_analysis(url: str = Query(..., description="Website URL")):
    return await manager.run_full_analysis(url)

@app.get("/analyze/llm-report")
async def llm_report():
    return await manager.generate_llm_report()
