# services/seo_service.py

import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin


class SEOAnalyzer:


    def fetch_html(self, url):
        headers = {"User-Agent": "Mozilla/5.0"}
        try:
            r = requests.get(url, headers=headers, timeout=15)
            r.raise_for_status()
        except Exception as e:
            return None, f"Error fetching URL: {e}"

        return r.text, None

    def extract_seo_elements(self, html, base_url):
        soup = BeautifulSoup(html, "html.parser")

        # Title
        title_tag = soup.find('title')
        title = title_tag.text.strip() if title_tag else ""

        # Meta Description
        desc_tag = soup.find("meta", attrs={"name": "description"})
        description = desc_tag["content"].strip() if desc_tag else ""

        # Canonical tag
        canonical_tag = soup.find("link", rel="canonical")
        canonical = canonical_tag["href"].strip() if canonical_tag else ""

        # Index / No-index
        robots_tag = soup.find("meta", attrs={"name": "robots"})
        robots = robots_tag["content"].lower() if robots_tag else "index, follow"

        # Headings (H1 / H2 / H3)
        h1 = [h.get_text(strip=True) for h in soup.find_all("h1")]
        h2 = [h.get_text(strip=True) for h in soup.find_all("h2")]
        h3 = [h.get_text(strip=True) for h in soup.find_all("h3")]

        # Alt text extraction
        imgs = soup.find_all("img")
        alt_texts = []
        missing_alts = 0

        for img in imgs:
            alt = img.get("alt")
            src = img.get("src")
            if alt and alt.strip():
                alt_texts.append({"src": src, "alt": alt})
            else:
                missing_alts += 1

        return {
            "title": title,
            "description": description,
            "canonical": canonical,
            "robots": robots,
            "h1": h1,
            "h2": h2,
            "h3": h3,
            "alt_texts": alt_texts,
            "missing_alts": missing_alts,
            "total_images": len(imgs),
            "text_content": soup.get_text(separator=" ", strip=True)[:10000]
        }


    def keyword_density(self, text, keywords):
        text_lower = text.lower()

        density_report = {}
        for kw in keywords:
            count = text_lower.count(kw.lower())
            density_report[kw] = count

        return density_report


    def validate_headings(self, h1):
        issues = []

        # Only one H1 recommended
        if len(h1) == 0:
            issues.append("Missing H1 tag – required for SEO.")
        elif len(h1) > 1:
            issues.append("Multiple H1 tags detected – should be only one.")

        return issues

    def validate_meta(self, title, description):
        issues = []

        if not title or len(title) < 10:
            issues.append("Meta title is too short (recommended 45–60 characters).")

        if len(title) > 65:
            issues.append("Meta title is too long (should be under 60 characters).")

        if not description or len(description) < 30:
            issues.append("Meta description too short (recommended 140–160 characters).")

        if len(description) > 170:
            issues.append("Meta description too long (should be under 160 characters).")

        return issues


    def check_index_status(self, robots):
        if "noindex" in robots:
            return "NO_INDEX"
        return "INDEX"

    def compute_seo_score(self, elements, meta_issues, h1_issues):
        score = 100

        # Missing H1 reduces score
        if h1_issues:
            score -= 10

        # Meta issues
        score -= len(meta_issues) * 2

        # Missing alt tags
        score -= min(elements["missing_alts"], 20)

        # Penalize long/short content
        word_count = len(elements["text_content"].split())
        if word_count < 300:
            score -= 10

        return max(0, score)
        
    def analyze_url(self, url, target_keywords=None, priority_pages=None):
        html, err = self.fetch_html(url)
        if err:
            return {"error": err}

        elements = self.extract_seo_elements(html, base_url=url)

        # Validate meta tags
        meta_issues = self.validate_meta(elements["title"], elements["description"])

        # Validate heading structure
        h1_issues = self.validate_headings(elements["h1"])

        # Keyword density
        density = self.keyword_density(
            text=elements["text_content"],
            keywords=target_keywords or []
        )

        # Index / no index
        index_status = self.check_index_status(elements["robots"])

        # Score
        score = self.compute_seo_score(elements, meta_issues, h1_issues)

        # Final report
        return {
            "url": url,
            "title": elements["title"],
            "description": elements["description"],
            "canonical": elements["canonical"],
            "robots": elements["robots"],
            "index_status": index_status,
            "headers": {
                "h1": elements["h1"],
                "h2": elements["h2"],
                "h3": elements["h3"]
            },
            "alt_texts": elements["alt_texts"],
            "missing_alt_tags": elements["missing_alts"],
            "keyword_density": density,
            "meta_issues": meta_issues,
            "heading_issues": h1_issues,
            "seo_score": score
        }
