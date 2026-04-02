# html_test.py
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from html.parser import HTMLParser
import re
import json
import os
from datetime import datetime

class HTMLValidator(HTMLParser):
    """Detects unclosed or malformed HTML tags."""
    def __init__(self):
        super().__init__()
        self.open_tags = []
        self.errors = []

    def handle_starttag(self, tag, attrs):
        self.open_tags.append(tag)

    def handle_endtag(self, tag):
        if tag in self.open_tags:
            self.open_tags.remove(tag)
        else:
            self.errors.append(f"Unexpected closing tag </{tag}> found.")

    def close(self):
        for tag in self.open_tags:
            self.errors.append(f"Unclosed <{tag}> tag detected.")
        super().close()


class WebsiteHTMLAuditor:
    """Audits website HTML, meta tags, headings, links, and images."""
    def __init__(self, base_url, max_pages=50):
        self.base_url = self.normalize_url(base_url)
        self.max_pages = max_pages
        self.pages_checked = []
        self.session = requests.Session()
        self.session.headers.update({'User-Agent': 'HTMLAuditBot/1.0'})
        self.report = {"base_url": self.base_url, "pages": []}

    def normalize_url(self, url):
        if not url.startswith(("http://", "https://")):
            url = "https://" + url
        return url.rstrip("/")

    def audit_page(self, url):
        errors = []
        try:
            res = self.session.get(url, timeout=10)
            html = res.text
            soup = BeautifulSoup(html, "html.parser")

            # --- HTML validation ---
            validator = HTMLValidator()
            validator.feed(html)
            validator.close()
            if validator.errors:
                errors.extend(validator.errors)

            # --- Title ---
            title = soup.title.string.strip() if soup.title and soup.title.string else ""
            if not title:
                errors.append("Missing <title> tag.")
            elif len(title) < 40 or len(title) > 60:
                errors.append(f"<title> length is {len(title)} chars (recommended 50-60).")

            # --- Meta description ---
            meta_desc = soup.find("meta", attrs={"name":"description"})
            if not meta_desc or not meta_desc.get("content"):
                errors.append("Missing meta description.")
            else:
                desc_len = len(meta_desc["content"].strip())
                if desc_len < 150 or desc_len > 160:
                    errors.append(f"Meta description length is {desc_len} chars (recommended 150-160).")

            # --- Canonical ---
            canonical = soup.find("link", rel="canonical")
            if not canonical or not canonical.get("href"):
                errors.append("Missing canonical tag.")

            # --- Viewport ---
            viewport = soup.find("meta", attrs={"name":"viewport"})
            if not viewport:
                errors.append("Missing viewport meta tag.")

            # --- Headings ---
            headings = soup.find_all(re.compile('^h[1-6]$'))
            if not any(h.name == "h1" for h in headings):
                errors.append("No <h1> tag found.")
            levels = [int(h.name[1]) for h in headings]
            for i in range(1, len(levels)):
                if levels[i] > levels[i-1]+1:
                    errors.append("Heading level skip detected.")
                    break

            # --- Images alt attributes ---
            imgs = soup.find_all("img")
            missing_alt = [img for img in imgs if not img.get("alt") or img.get("alt").strip() == ""]
            if missing_alt:
                errors.append(f"{len(missing_alt)} images missing alt attributes.")

            # --- Duplicate IDs ---
            ids = [tag.get("id") for tag in soup.find_all(id=True)]
            dup_ids = [i for i in set(ids) if ids.count(i) > 1]
            if dup_ids:
                errors.append(f"Duplicate IDs found: {', '.join(dup_ids)}")

            # --- Broken links (limited to 20) ---
            links = [a.get("href") for a in soup.find_all("a", href=True)]
            broken_links = []
            for link in links[:20]:
                try:
                    full_link = urljoin(url, link)
                    r = self.session.head(full_link, timeout=5)
                    if r.status_code >= 400:
                        broken_links.append(full_link)
                except:
                    broken_links.append(full_link)
            if broken_links:
                errors.append(f"{len(broken_links)} broken links: {broken_links}")

            return {"url": url, "errors": errors or ["No issues found."]}

        except Exception as e:
            return {"url": url, "errors": [str(e)]}

    def crawl_site(self):
        """Crawl site up to max_pages and audit each page."""
        pages_to_visit = [self.base_url]
        visited = set()

        while pages_to_visit and len(visited) < self.max_pages:
            page = pages_to_visit.pop(0)
            if page in visited:
                continue
            visited.add(page)
            page_report = self.audit_page(page)
            self.report["pages"].append(page_report)

            # Discover internal links
            try:
                res = self.session.get(page, timeout=5)
                soup = BeautifulSoup(res.text, "html.parser")
                for a in soup.find_all("a", href=True):
                    link = urljoin(page, a["href"])
                    if link.startswith(self.base_url) and link not in visited:
                        pages_to_visit.append(link)
            except:
                continue

        return self.report

    # Alias for FastAPI compatibility
    def detect_errors(self):
        """Alias for crawl_site() to keep compatibility with main.py."""
        # Save JSON report automatically
        result = self.crawl_site()
        os.makedirs("seo_reports", exist_ok=True)
        filename = f"seo_reports/html_audit_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2)
        return result

    def print_report(self):
        report = self.report
        print(f"\n=== HTML Audit Report ===")
        print(f"Base URL: {report['base_url']}")
        for page in report["pages"]:
            print(f"\nPage: {page['url']}")
            for e in page["errors"]:
                print(f" - {e}")

if __name__ == "__main__":
    site = input("Enter your website URL: ")
    auditor = WebsiteHTMLAuditor(site, max_pages=50)
    auditor.detect_errors()
    auditor.print_report()
