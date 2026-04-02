# link_check.py
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse, urldefrag
from collections import deque
from concurrent.futures import ThreadPoolExecutor, as_completed
import logging
from typing import Set, Tuple, Dict, Any

logging.basicConfig(
    level=logging.INFO,
    format='[%(levelname)s] %(asctime)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

class LinkSEOOtimizer:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.domain = urlparse(base_url).netloc
        self.visited: Set[str] = set()
        self.all_links: Set[str] = set()
        self.checked_links: Dict[str, Tuple[str, Any]] = {}

        self.report: Dict[str, Any] = {
            'internal_links': {'count': 0, 'urls': set(), 'broken': []},
            'external_links': {'count': 0, 'urls': set(), 'broken': []},
            'broken_links_summary': {'total': 0, 'internal': 0, 'external': 0}
        }

        self.session = requests.Session()
        self.session.headers.update({'User-Agent': 'LinkSEOBot/2.0'})

    # ----------------------- Utilities -----------------------
    def is_internal(self, url: str) -> bool:
        return urlparse(url).netloc == self.domain

    def normalize_url(self, url: str) -> str:
        url, _ = urldefrag(url)
        return url.rstrip('/')

    # ----------------------- Crawl Site -----------------------
    def crawl_site(self, max_depth: int = 2, max_pages: int = 50):
        queue = deque([(self.base_url, 0)])
        while queue and len(self.visited) < max_pages:
            url, depth = queue.popleft()
            url = self.normalize_url(url)
            if url in self.visited or depth > max_depth:
                continue
            try:
                response = self.session.get(url, timeout=10)
                if response.status_code != 200:
                    continue
                self.visited.add(url)
                soup = BeautifulSoup(response.text, 'html.parser')
                for link in soup.find_all('a', href=True):
                    full_url = self.normalize_url(urljoin(url, link['href']))
                    if full_url.startswith('http') and full_url not in self.all_links:
                        self.all_links.add(full_url)
                        if self.is_internal(full_url) and depth < max_depth:
                            queue.append((full_url, depth + 1))
            except requests.RequestException:
                continue
        self._classify_links()

    # ----------------------- Classify Links -----------------------
    def _classify_links(self):
        for link in self.all_links:
            if self.is_internal(link):
                self.report['internal_links']['urls'].add(link)
            else:
                self.report['external_links']['urls'].add(link)
        self.report['internal_links']['count'] = len(self.report['internal_links']['urls'])
        self.report['external_links']['count'] = len(self.report['external_links']['urls'])

    # ----------------------- Check Broken Links -----------------------
    def check_link(self, url: str) -> Tuple[str, Any]:
        if url in self.checked_links:
            return self.checked_links[url]
        try:
            response = self.session.head(url, timeout=10, allow_redirects=True)
            if response.status_code >= 400:
                status = response.status_code
            else:
                status = 200
        except requests.RequestException as e:
            status = f"Error: {str(e)}"
        self.checked_links[url] = (url, status)
        return url, status

    def check_all_links(self, max_workers: int = 10):
        for link_type in ['internal_links', 'external_links']:
            urls = self.report[link_type]['urls']
            broken = []
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures = {executor.submit(self.check_link, url): url for url in urls}
                for future in as_completed(futures):
                    url, status = future.result()
                    if status != 200:
                        broken.append((url, status))
            self.report[link_type]['broken'] = broken
            self.report['broken_links_summary'][link_type.replace('_links','')] = len(broken)
        self.report['broken_links_summary']['total'] = (
            self.report['broken_links_summary']['internal'] +
            self.report['broken_links_summary']['external']
        )

    # ----------------------- Run Full Analysis -----------------------
    def run_all_checks(self, max_depth: int = 2, max_pages: int = 50, max_workers: int = 10):
        logging.info("Crawling site...")
        self.crawl_site(max_depth=max_depth, max_pages=max_pages)
        logging.info(f"Found {len(self.all_links)} links. Checking for broken links...")
        self.check_all_links(max_workers=max_workers)

    # ----------------------- Report -----------------------
    def generate_report(self, show_broken_limit: int = 5):
        print("\n=== Link SEO Optimization Report ===")
        for link_type in ['internal_links', 'external_links']:
            total = self.report[link_type]['count']
            print(f"\n{link_type.replace('_',' ').title()}: {total}")
            print("URLs:")
            for url in sorted(self.report[link_type]['urls']):
                print(f" - {url}")
            broken = self.report[link_type]['broken']
            print(f"Broken Links ({len(broken)}):")
            for url, status in broken[:show_broken_limit]:
                print(f" - {url} ({status})")
        print("\nBroken Links Summary:", self.report['broken_links_summary'])

# ----------------------- Example -----------------------
if __name__ == "__main__":
    optimizer = LinkSEOOtimizer("https://www.scubadivingraleigh.com/")
    optimizer.run_all_checks(max_depth=2, max_pages=50, max_workers=10)
    optimizer.generate_report()
