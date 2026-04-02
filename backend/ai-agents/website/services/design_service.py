# services/design_service.py 

import re
import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Optional
from PIL import Image
from io import BytesIO


class DesignCheckAgent:

    def fetch_html(self, url: str):
        headers = {"User-Agent": "Mozilla/5.0"}
        try:
            r = requests.get(url, headers=headers, timeout=15)
            r.raise_for_status()
            return r.text, None
        except Exception as e:
            return None, f"Failed to fetch URL: {e}"

    def download_image(self, url):
        try:
            r = requests.get(url, timeout=10)
            r.raise_for_status()
            return Image.open(BytesIO(r.content))
        except:
            return None

    def extract_design(self, html: str, base_url: str):
        soup = BeautifulSoup(html, "html.parser")

        # Fonts
        fonts = []
        for link in soup.find_all("link"):
            href = link.get("href", "")
            if "font" in href or "fonts.googleapis.com" in href:
                fonts.append(href)

        inline_fonts = []
        for style in soup.find_all("style"):
            ff = re.findall(r'font-family:([^;]+);', style.get_text())
            inline_fonts.extend([x.strip() for x in ff])

        # Colors
        colors = []
        inline_styles = []

        for style in soup.find_all("style"):
            css = style.get_text()
            colors.extend(re.findall(r'#[0-9a-fA-F]{3,6}', css))

        for tag in soup.find_all(True):
            style_attr = tag.get("style")
            if style_attr and "#" in style_attr:
                inline_styles.extend(re.findall(r'#[0-9a-fA-F]{3,6}', style_attr))

        all_colors = list(set(colors + inline_styles))

        # Images
        images = []
        for img in soup.find_all("img"):
            src = img.get("src")
            if not src:
                continue

            if src.startswith("http"):
                images.append(src)
            else:
                images.append(base_url.rstrip("/") + "/" + src.lstrip("/"))

        # Layout Components
        layout = {
            "has_hero_section": bool(soup.find("section", {"id": "hero"}) or soup.find("div", {"class": "hero"})),
            "has_slider": bool(soup.find("div", {"class": "slider"}) or soup.find("div", {"id": "slider"})),
            "has_animations": bool(soup.find("div", {"class": "animate"}) or soup.find_all("lottie-player")),
            "has_carousel": bool(soup.find("div", {"class": "carousel"}) or soup.find("div", {"id": "carousel"}))
        }

        return {
            "fonts": list(set(fonts + inline_fonts)),
            "colors": all_colors,
            "images": images,
            "layout": layout
        }

    def validate_colors(self, website_colors, brand_colors):
        issues = []

        matched = [c for c in website_colors if c.lower() in [b.lower() for b in brand_colors]]
        unmatched = [c for c in website_colors if c.lower() not in [b.lower() for b in brand_colors]]

        if not matched:
            issues.append("No website colors match the brand palette.")

        return issues, matched, unmatched

    def validate_fonts(self, website_fonts, brand_fonts):
        issues = []
        found = []
        missing = []

        if not website_fonts:
            issues.append("No fonts detected.")

        for bf in brand_fonts:
            matched = [wf for wf in website_fonts if bf.lower() in wf.lower()]
            if matched:
                found.extend(matched)
            else:
                missing.append(bf)

        if not found:
            issues.append("Brand fonts missing.")

        return issues, found, missing

    def validate_layout(self, layout, rules):
        issues = []

        for rule, must_exist in rules.items():
            if must_exist and not layout.get(rule):
                issues.append(f"Missing layout component: {rule.replace('_', ' ')}")

        return issues

    def compare_competitors(self, website_colors, competitors):
        similarities = {}

        for url in competitors:
            html, err = self.fetch_html(url)
            if err:
                similarities[url] = "error"
                continue

            soup = BeautifulSoup(html, "html.parser")
            competitor_colors = re.findall(r'#[0-9a-fA-F]{3,6}', soup.text)

            common = set(website_colors) & set(competitor_colors)
            score = (len(common) / max(1, len(website_colors))) * 100

            similarities[url] = round(score, 2)

        return similarities

    def compute_score(self, issues):
        score = 100 - (len(issues) * 4)
        return max(0, score)

    def run(
        self,
        url: str,
        brand_colors: List[str],
        brand_fonts: List[str],
        theme_refs: Optional[List[str]],
        competitor_urls: Optional[List[str]],
        custom_layout_rules: Optional[Dict[str, bool]],
        priority_pages: Optional[List[str]]
    ):
        html, err = self.fetch_html(url)
        if err:
            return {"error": err}

        parsed = self.extract_design(html, url)

        issues = []

        # color check
        col_issues, matched_colors, unmatched_colors = self.validate_colors(parsed["colors"], brand_colors)
        issues += col_issues

        # font check
        font_issues, used_fonts, missing_fonts = self.validate_fonts(parsed["fonts"], brand_fonts)
        issues += font_issues

        # layout check
        layout_issues = self.validate_layout(parsed["layout"], custom_layout_rules or {})
        issues += layout_issues

        # competitor check
        competitor_match = self.compare_competitors(parsed["colors"], competitor_urls or [])

        score = self.compute_score(issues)

        return {
            "url": url,
            "detected_fonts": parsed["fonts"],
            "detected_colors": parsed["colors"],
            "layout_features": parsed["layout"],
            "matched_brand_colors": matched_colors,
            "unmatched_colors": unmatched_colors,
            "used_brand_fonts": used_fonts,
            "missing_brand_fonts": missing_fonts,
            "competitor_similarity": competitor_match,
            "issues": issues,
            "design_score": score
        }
