# services/report_service.py
"""
BeeSure AI – Unified Website Report Generator
Uses:
1. Content AI  (your custom functions)
2. SEO AI      (SEOAnalyzer class)
3. Design AI   (DesignCheckAgent class)
"""
from .content_service import (
    extract_text_from_url,
    analyze_content,
    content_ai_from_url
)
from .seo_service import SEOAnalyzer
from .design_service import DesignCheckAgent

class BeeSureAIReport:

    def __init__(self):
        self.seo_ai = SEOAnalyzer()
        self.design_ai = DesignCheckAgent()

    def generate_report(
        self,
        url: str,
        region: str = "US",

        # ----- Content AI -----
        sitemap=None,
        content_map=None,
        tone_rules=None,
        missing_notes=None,
        meeting_notes=None,

        # ----- SEO AI -----
        keyword_targets=None,
        priority_pages=None,

        # ----- Design AI -----
        brand_colors=None,
        brand_fonts=None,
        competitors=None,
        layout_rules=None
    ):
        try:
            # Get raw text
            text, error = extract_text_from_url(url)
            if error:
                content_result = {"error": error}
            else:
                # Full content analysis
                content_result = analyze_content(
                    text=text,
                    region=region,
                    tone_rules=tone_rules,
                    missing_notes=missing_notes,
                    meeting_notes=meeting_notes
                )

                # Page + placement validation 
                if content_map:
                    placement_data = content_ai_from_url(
                        url=url,
                        sitemap=sitemap or {},
                        content_map=content_map,
                        region=region
                    )
                    content_result["placement_issues"] = placement_data.get("placement_issues", {})

        except Exception as e:
            content_result = {"error": f"Content AI failed: {e}"}

        try:
            seo_result = self.seo_ai.analyze_url(
                url=url,
                target_keywords=keyword_targets or [],
                priority_pages=priority_pages or []
            )
        except Exception as e:
            seo_result = {"error": f"SEO AI failed: {e}"}

        try:
            design_result = self.design_ai.analyze(
                url=url,
                brand_colors=brand_colors or [],
                brand_fonts=brand_fonts or [],
                competitors=competitors or [],
                layout_rules=layout_rules or {}
            )
        except Exception as e:
            design_result = {"error": f"Design AI failed: {e}"}

        technical_result = {
            "status": "coming_soon",
            "message": "Technical AI module is under development."
        }

        return {
            "website": url,
            "content_ai": content_result,
            "seo_ai": seo_result,
            "design_ai": design_result,
            "technical_ai": technical_result
        }
    









    
