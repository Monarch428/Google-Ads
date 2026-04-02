import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from bs4 import BeautifulSoup
from urllib.parse import urljoin
from datetime import datetime
import logging
import concurrent.futures
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import json


class WebErrorDetector:
    def __init__(self, timeout=10, max_workers=5):
        self.timeout = timeout
        self.max_workers = max_workers
        self.session = requests.Session()
        self._setup_retry()
        self._setup_logging()
        self.chrome_options = self._setup_selenium()

    # ----------------------- Setup -----------------------
    def _setup_retry(self):
        retry_strategy = Retry(
            total=3,
            backoff_factor=1,
            status_forcelist=[429, 500, 502, 503, 504]
        )
        adapter = HTTPAdapter(max_retries=retry_strategy)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)

    def _setup_logging(self):
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)

    def _setup_selenium(self):
        options = Options()
        options.add_argument('--headless')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        return options

    # ----------------------- HTTP Check -----------------------
    def check_http_errors(self, url):
        errors = []
        try:
            response = self.session.get(url, timeout=self.timeout)
            if response.status_code >= 400:
                errors.append({
                    'type': 'HTTP_ERROR',
                    'code': response.status_code,
                    'message': f'HTTP {response.status_code} error',
                    'url': url
                })
            if response.elapsed.total_seconds() > 5:
                errors.append({
                    'type': 'SLOW_RESPONSE',
                    'response_time': response.elapsed.total_seconds(),
                    'message': f'Slow response: {response.elapsed.total_seconds():.2f}s',
                    'url': url
                })
            return response, errors
        except requests.exceptions.Timeout:
            errors.append({'type': 'TIMEOUT', 'message': f'Request timeout after {self.timeout}s', 'url': url})
        except requests.exceptions.ConnectionError:
            errors.append({'type': 'CONNECTION_ERROR', 'message': 'Failed to connect to server', 'url': url})
        except Exception as e:
            errors.append({'type': 'REQUEST_ERROR', 'message': str(e), 'url': url})
        return None, errors

    # ----------------------- HTML Check -----------------------
    def check_html_errors(self, response, url):
        errors = []
        if not response:
            return errors
        try:
            soup = BeautifulSoup(response.content, 'html.parser')

            # Title tag
            if not soup.title or not soup.title.string.strip():
                errors.append({'type': 'MISSING_TITLE', 'message': 'Page missing title tag', 'url': url})

            # Meta description
            meta_desc = soup.find('meta', attrs={'name': 'description'})
            if not meta_desc or not meta_desc.get('content', '').strip():
                errors.append({'type': 'MISSING_META_DESCRIPTION', 'message': 'Page missing meta description', 'url': url})

            # Image alt & broken src
            for img in soup.find_all('img'):
                src = img.get('src')
                if src:
                    full_src = urljoin(url, src)
                    if not self._check_resource(full_src):
                        errors.append({'type': 'BROKEN_IMAGE', 'message': f'Broken image: {src}', 'url': url})
                if not img.get('alt'):
                    errors.append({'type': 'MISSING_ALT_TEXT', 'message': f'Image missing alt text: {src}', 'url': url})

            # Duplicate IDs
            ids = [elem.get('id') for elem in soup.find_all(id=True)]
            duplicates = [i for i in set(ids) if ids.count(i) > 1]
            for dup in duplicates:
                errors.append({'type': 'DUPLICATE_ID', 'message': f'Duplicate ID found: {dup}', 'url': url})

        except Exception as e:
            errors.append({'type': 'HTML_PARSE_ERROR', 'message': str(e), 'url': url})
        return errors

    # ----------------------- Broken Links -----------------------
    def check_broken_links(self, response, url, max_links=50):
        errors = []
        if not response:
            return errors
        try:
            soup = BeautifulSoup(response.content, 'html.parser')
            links = soup.find_all('a', href=True)[:max_links]
            with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                futures = {}
                for link in links:
                    href = link['href']
                    if href.startswith(('#', 'javascript:', 'mailto:', 'tel:')):
                        continue
                    full_url = urljoin(url, href)
                    futures[executor.submit(self._check_resource, full_url)] = (href, full_url)

                for fut in concurrent.futures.as_completed(futures):
                    href, full_url = futures[fut]
                    if not fut.result():
                        errors.append({'type': 'BROKEN_LINK', 'message': f'Broken link: {href}', 'url': url})
        except Exception as e:
            errors.append({'type': 'LINK_PARSE_ERROR', 'message': str(e), 'url': url})
        return errors

    # ----------------------- JavaScript Check -----------------------
    def check_javascript_errors(self, url):
        errors = []
        driver = None
        try:
            driver = webdriver.Chrome(options=self.chrome_options)
            driver.get(url)
            WebDriverWait(driver, 10).until(EC.presence_of_element_located((By.TAG_NAME, "body")))
            logs = driver.get_log('browser')
            for log in logs:
                if log['level'] in ['SEVERE', 'ERROR']:
                    errors.append({
                        'type': 'JAVASCRIPT_ERROR',
                        'level': log['level'],
                        'message': log['message'],
                        'url': url
                    })
        except Exception as e:
            errors.append({'type': 'SELENIUM_ERROR', 'message': str(e), 'url': url})
        finally:
            if driver:
                driver.quit()
        return errors

    # ----------------------- Technical SEO Checks -----------------------
    def check_indexability(self, response, url):
        errors = []
        if not response:
            return errors
        try:
            soup = BeautifulSoup(response.content, 'html.parser')
            meta_robots = soup.find('meta', attrs={'name': 'robots'})
            if meta_robots and 'noindex' in meta_robots.get('content', '').lower():
                errors.append({'type': 'NOINDEX_META', 'message': 'Page has noindex tag', 'url': url})
        except Exception as e:
            errors.append({'type': 'INDEXABILITY_ERROR', 'message': str(e), 'url': url})
        return errors

    def check_robots_txt(self, base_url):
        errors = []
        try:
            r = self.session.get(urljoin(base_url, '/robots.txt'), timeout=5)
            if r.status_code != 200:
                errors.append({'type': 'ROBOTS_MISSING', 'message': 'robots.txt not found', 'url': base_url})
        except:
            errors.append({'type': 'ROBOTS_ERROR', 'message': 'Failed to access robots.txt', 'url': base_url})
        return errors

    def check_sitemap(self, base_url):
        errors = []
        try:
            r = self.session.get(urljoin(base_url, '/sitemap.xml'), timeout=5)
            if r.status_code != 200:
                errors.append({'type': 'SITEMAP_MISSING', 'message': 'sitemap.xml not found', 'url': base_url})
        except:
            errors.append({'type': 'SITEMAP_ERROR', 'message': 'Failed to access sitemap.xml', 'url': base_url})
        return errors

    def check_https(self, base_url):
        errors = []
        if not base_url.startswith('https://'):
            errors.append({'type': 'NO_HTTPS', 'message': 'Site is not using HTTPS', 'url': base_url})
        return errors

    def check_canonical(self, response, url):
        errors = []
        if not response:
            return errors
        try:
            soup = BeautifulSoup(response.content, 'html.parser')
            canonical = soup.find('link', rel='canonical')
            if not canonical or not canonical.get('href'):
                errors.append({'type': 'MISSING_CANONICAL', 'message': 'Canonical URL missing', 'url': url})
        except Exception as e:
            errors.append({'type': 'CANONICAL_ERROR', 'message': str(e), 'url': url})
        return errors

    # ----------------------- Helper -----------------------
    def _check_resource(self, url):
        try:
            r = self.session.head(url, timeout=5, allow_redirects=True)
            return r.status_code < 400
        except:
            try:
                r = self.session.get(url, timeout=5, allow_redirects=True)
                return r.status_code < 400
            except:
                return False

    # ----------------------- Full Analysis -----------------------
    def analyze_website(self, url, check_js=False, check_links=True):
        self.logger.info(f"Analyzing {url}")
        all_errors = []
        start = time.time()

        response, http_errors = self.check_http_errors(url)
        all_errors.extend(http_errors)

        if response:
            all_errors.extend(self.check_html_errors(response, url))
            all_errors.extend(self.check_indexability(response, url))
            all_errors.extend(self.check_canonical(response, url))
            if check_links:
                all_errors.extend(self.check_broken_links(response, url))

        all_errors.extend(self.check_robots_txt(url))
        all_errors.extend(self.check_sitemap(url))
        all_errors.extend(self.check_https(url))

        if check_js:
            all_errors.extend(self.check_javascript_errors(url))

        return {
            'url': url,
            'timestamp': datetime.now().isoformat(),
            'analysis_time': round(time.time() - start, 2),
            'total_errors': len(all_errors),
            'errors': all_errors,
            'error_summary': self._generate_error_summary(all_errors)
        }

    def _generate_error_summary(self, errors):
        summary = {}
        for e in errors:
            summary[e['type']] = summary.get(e['type'], 0) + 1
        return summary

    def generate_report(self, results, output_file=None):
        report = {
            'scan_summary': {
                'total_urls_scanned': len(results) if isinstance(results, list) else 1,
                'total_errors_found': sum(r['total_errors'] for r in (results if isinstance(results, list) else [results])),
                'scan_timestamp': datetime.now().isoformat()
            },
            'results': results if isinstance(results, list) else [results]
        }
        if output_file:
            with open(output_file, 'w') as f:
                json.dump(report, f, indent=2)
            self.logger.info(f"Report saved to {output_file}")
        return report
