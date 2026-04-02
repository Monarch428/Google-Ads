# keyword_extractor.py
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin
import re
from collections import Counter, defaultdict
import math
import hashlib


class ContentSEOOptimizer:
    def __init__(self, base_url):
        self.base_url = base_url
        self.report = {}
        self.session = requests.Session()
        self.session.headers.update({'User-Agent': 'ContentSEOBot/3.0'})
        self.stop_words = set([
            'a', 'an', 'the', 'and', 'or', 'but', 'if', 'while', 'at', 'by', 'for', 'with', 'about', 'against',
            'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down',
            'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when',
            'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
            'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don',
            'should', 'now'
        ])

    
    def get_page_text(self, page_url):
        """Fetch and extract clean text from the given URL."""
        try:
            response = self.session.get(page_url, timeout=10)
            if response.status_code != 200:
                return None, f"Failed to fetch page (status: {response.status_code})"

            soup = BeautifulSoup(response.text, 'html.parser')

            # Remove unwanted elements
            for tag in soup(["script", "style", "header", "footer", "nav", "aside"]):
                tag.decompose()

            text = soup.get_text(separator=' ', strip=True)
            text = re.sub(r'\s+', ' ', text)
            return text, soup
        except Exception as e:
            return None, str(e)

    # ----------------------- TF-IDF COMPUTATION -----------------------
    def compute_tfidf(self, words):
        """Compute TF-IDF scores for each keyword using internal segmentation."""
        if not words:
            return {}

        # Split text into pseudo-documents (paragraph chunks)
        chunk_size = 200
        chunks = [words[i:i + chunk_size] for i in range(0, len(words), chunk_size)]
        num_docs = len(chunks)

        # Document frequency
        df = defaultdict(int)
        for chunk in chunks:
            for term in set(chunk):
                df[term] += 1

        # TF-IDF score for each term (sum of TF-IDF across chunks)
        tfidf_scores = defaultdict(float)
        for chunk in chunks:
            word_count = Counter(chunk)
            total_words = len(chunk)
            for word, count in word_count.items():
                tf = count / total_words
                idf = math.log((num_docs + 1) / (df[word] + 1)) + 1
                tfidf_scores[word] += tf * idf

        # Normalize scores (so that top keyword ~ 1.0)
        max_score = max(tfidf_scores.values()) if tfidf_scores else 1
        for word in tfidf_scores:
            tfidf_scores[word] = round(tfidf_scores[word] / max_score, 4)

        return tfidf_scores

    # ----------------------- KEYWORD ANALYSIS -----------------------
    def extract_keywords(self, page_url=None, num_keywords=10):
        page_url = page_url or self.base_url

        text, soup = self.get_page_text(page_url)
        if not text:
            self.report['keyword_research'] = {
                'status': 'fail',
                'message': f'Error extracting keywords: {soup}'
            }
            return

        # Tokenize and filter stopwords
        words = re.findall(r'\b\w+\b', text.lower())
        filtered_words = [w for w in words if w not in self.stop_words and len(w) > 2]
        word_count = len(filtered_words)

        if word_count == 0:
            self.report['keyword_research'] = {
                'status': 'fail',
                'message': 'No valid words found for keyword extraction.'
            }
            return

        word_counts = Counter(filtered_words)
        tfidf_scores = self.compute_tfidf(filtered_words)

        # Combine frequency + TF-IDF (weighted ranking)
        combined_scores = {w: (word_counts[w] * 0.4 + tfidf_scores[w] * 0.6) for w in word_counts}
        top_keywords = sorted(combined_scores.items(), key=lambda x: x[1], reverse=True)[:num_keywords]

        title = soup.title.string.lower() if soup.title and soup.title.string else ""
        headings = " ".join([h.get_text().lower() for h in soup.find_all(['h1', 'h2', 'h3'])])
        first_para_tag = soup.find('p')
        first_para = first_para_tag.get_text().lower() if first_para_tag else ""

        keywords_info = []
        for kw, score in top_keywords:
            count = word_counts[kw]
            density = round((count / word_count) * 100, 2)
            keywords_info.append({
                'keyword': kw,
                'count': count,
                'density_percent': density,
                'tfidf_score': tfidf_scores.get(kw, 0),
                'relevance_score': round(score, 4),
                'in_title': kw in title,
                'in_headings': kw in headings,
                'in_first_paragraph': kw in first_para
            })

        self.report['keyword_research'] = {
            'status': 'pass',
            'message': 'Top keywords extracted with TF-IDF relevance and placement.',
            'keywords': keywords_info
        }

    # ----------------------- READABILITY + QUALITY -----------------------
    def count_syllables(self, word):
        """Rough syllable count for readability score."""
        word = word.lower()
        vowels = 'aeiouy'
        count = 1 if word[0] in vowels else 0
        for i in range(1, len(word)):
            if word[i] in vowels and word[i - 1] not in vowels:
                count += 1
        if word.endswith('e'):
            count -= 1
        return max(count, 1)

    def check_content_quality(self, page_url=None):
        page_url = page_url or self.base_url
        text, soup = self.get_page_text(page_url)

        if not text:
            self.report['content_quality'] = {
                'status': 'fail',
                'message': f'Error checking content: {soup}'
            }
            return

        words = re.findall(r'\b\w+\b', text)
        word_count = len(words)
        length_status = 'pass' if 300 <= word_count <= 2000 else 'warning'

        sentences = re.split(r'[.!?]+', text)
        sentences = [s.strip() for s in sentences if s.strip()]
        num_sentences = max(len(sentences), 1)
        syllables = sum(self.count_syllables(w) for w in words)
        asl = word_count / num_sentences
        asw = syllables / word_count if word_count else 0

        readability_score = 206.835 - (1.015 * asl) - (84.6 * asw)
        if readability_score > 60:
            readability_status = 'pass'
        elif 30 < readability_score <= 60:
            readability_status = 'warning'
        else:
            readability_status = 'fail'

        paragraphs = [p.get_text() for p in soup.find_all('p')]
        long_paras = [p for p in paragraphs if len(re.findall(r'\b\w+\b', p)) > 150]
        para_status = 'warning' if long_paras else 'pass'

        unique_words = len(set(words))
        uniqueness_ratio = unique_words / word_count if word_count else 0
        uniqueness_status = 'pass' if uniqueness_ratio >= 0.4 else 'warning'

        text_hash = hashlib.md5(text.encode('utf-8')).hexdigest()

        self.report['content_quality'] = {
            'status': 'pass' if all(s == 'pass' for s in [length_status, readability_status, para_status, uniqueness_status]) else 'warning',
            'message': 'Content quality assessed.',
            'details': {
                'word_count': word_count,
                'readability_score': round(readability_score, 2),
                'readability_status': readability_status,
                'length_status': length_status,
                'paragraph_length_status': para_status,
                'uniqueness_status': uniqueness_status,
                'duplicate_hash': text_hash,
                'long_paragraph_count': len(long_paras)
            }
        }

    # ----------------------- MAIN EXECUTION -----------------------
    def run_all_checks(self, page_url=None):
        self.extract_keywords(page_url)
        self.check_content_quality(page_url)
        return self.report

    # ----------------------- REPORT DISPLAY -----------------------
    def generate_report(self):
        print("\n=== Content SEO Optimization Report ===\n")
        for section, data in self.report.items():
            print(f"{section.upper()}: {data.get('status', 'N/A')} - {data.get('message', '')}")
            if 'keywords' in data:
                print("\nTop Keywords:")
                for kw in data['keywords']:
                    print(f" - {kw['keyword']} ({kw['count']}x, density={kw['density_percent']}%, "
                          f"TF-IDF={kw['tfidf_score']}, relevance={kw['relevance_score']}, "
                          f"in_title={kw['in_title']}, in_headings={kw['in_headings']}, "
                          f"in_first_para={kw['in_first_paragraph']})")
            if 'details' in data:
                print("\nDetails:")
                for key, val in data['details'].items():
                    print(f" - {key}: {val}")
            print("\n" + "-" * 60)


# ----------------------- Example Usage -----------------------
# if __name__ == "__main__":
#     seo = ContentSEOOptimizer("https://www.scubadivingraleigh.com/")
#     seo.run_all_checks()
#     seo.generate_report()
