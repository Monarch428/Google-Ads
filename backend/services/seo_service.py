# seo_service.py
import sys
import os
import asyncio

sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'ai-agents\\seo'))
from llm.llm_integration import analyze_seo_reports_with_llm

from sqlalchemy.orm import Session
from models.seo_model import SeoReport

# Correct class names matching the actual agent files
from agents.html_test import WebsiteHTMLAuditor
from agents.keyword_extractor import ContentSEOOptimizer
from agents.link_check import LinkSEOOtimizer
from agents.technical_seo import WebErrorDetector
from agents.seo_scoring import SEOScorer
from agents.speed_analyzer import SpeedAnalyzer

# SpeedAnalyzer API key — move this to your .env later
PAGESPEED_API_KEY = "AIzaSyDUM7Mi_P82ePNWsxAgBbtjzxFIC61u2kE"

def generate_ai_insights(report_id: int, db: Session):
    report = db.query(SeoReport).filter(SeoReport.id == report_id).first()
    if not report:
        return None

    try:
        results_text = json.dumps(report.results, indent=2)
        prompt = f"""
You are an expert SEO consultant. Analyze the following SEO report for {report.url}:
{results_text}
Overall SEO score: {report.overall_score}/100.
Provide:
1. Top 3 Quick Wins
2. Technical SEO fixes
3. Content improvements
4. Long-Term Strategy (3-6 months)
5. What is working well
Be specific and actionable.
"""
        from openai import OpenAI
        load_dotenv()
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a professional SEO analyst."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=4000
        )
        ai_text = response.choices[0].message.content

        # ← SAVE to DB
        report.ai_insights = ai_text
        db.commit()
        db.refresh(report)

        return ai_text

    except Exception as e:
        return f"[Error] {str(e)}"

def run_seo_analysis(url: str, db: Session):
    results = {}

    # 1. HTML Audit
    try:
        auditor = WebsiteHTMLAuditor(url, max_pages=5)  # max_pages=5 for speed
        results["html"] = auditor.detect_errors()
    except Exception as e:
        results["html"] = {"error": str(e)}

    # 2. Keyword & Content Analysis
    try:
        content = ContentSEOOptimizer(url)
        results["content"] = content.run_all_checks()
    except Exception as e:
        results["content"] = {"error": str(e)}

    # 3. Link Check
    try:
        links = LinkSEOOtimizer(url)
        links.run_all_checks(max_depth=1, max_pages=10, max_workers=5)
        # Convert sets to lists so JSON can serialize them
        link_report = links.report
        link_report["internal_links"]["urls"] = list(link_report["internal_links"]["urls"])
        link_report["external_links"]["urls"] = list(link_report["external_links"]["urls"])
        results["links"] = link_report
    except Exception as e:
        results["links"] = {"error": str(e)}

    # 4. Technical SEO
    try:
        detector = WebErrorDetector()
        results["technical"] = detector.analyze_website(url, check_js=False)
    except Exception as e:
        results["technical"] = {"error": str(e)}

    # 5. Speed Analysis (async — must run in event loop)
    try:
        speed_analyzer = SpeedAnalyzer(api_key=PAGESPEED_API_KEY)
        raw_speed = asyncio.run(speed_analyzer.check_speed(url))
        results["speed"] = SpeedAnalyzer.extract_metrics(raw_speed)
    except Exception as e:
        results["speed"] = {"error": str(e)}

    # 6. Score everything
    try:
        scorer = SEOScorer(
            content_report=results.get("content"),
            technical_report=results.get("technical"),
            links_report=results.get("links"),
            speed_report=results.get("speed"),
        )
        final_scores = scorer.calculate_total_score()  # correct method name
        results["scores"] = final_scores
        overall_score = final_scores.get("total")
    except Exception as e:
        results["scores"] = {"error": str(e)}
        overall_score = None

    scores = results.get("scores", {})
    # 7. Save to DB
    report = SeoReport(
        url=url,
        status="completed",
        overall_score=scores.get("total"),
        content_score=scores.get("content"),       
        technical_score=scores.get("technical"), 
        links_score=scores.get("links"),          
        performance_score=scores.get("performance"),
        grade=scores.get("grade"),                
        results=results,
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return report