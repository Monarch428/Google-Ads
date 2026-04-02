# seo_scoring.py

class SEOScorer:
    def __init__(self, content_report=None, technical_report=None, links_report=None, speed_report=None):
        """
        content_report: dict from ContentSEOOtimizer.run_all_checks()
        technical_report: dict from WebErrorDetector.analyze_website()
        links_report: dict (internal/external links check)
        speed_report: dict from SpeedAnalyzer.run_full_analysis() or test_page_speed()
        """
        self.content_report = content_report or {}
        self.technical_report = technical_report or {}
        self.links_report = links_report or {}
        self.speed_report = speed_report or {}
        self.scores = {}

    # ----------------------- Individual Category Scoring -----------------------
    def score_content(self):
        """
        Score content based on:
        - Keyword usage
        - Readability
        - Content length
        """
        score = 0
        max_score = 40

        content = self.content_report.get('content_quality', {})
        keyword_data = self.content_report.get('keyword_research', {})

        # Content length
        word_count = content.get('details', {}).get('word_count', 0)
        if 300 <= word_count <= 2000:
            score += 15
        elif word_count > 2000:
            score += 10
        else:
            score += 5

        # Readability
        readability = content.get('details', {}).get('readability_score', 0)
        if readability > 60:
            score += 15
        elif readability > 30:
            score += 10
        else:
            score += 5

        # Keywords presence
        keywords = keyword_data.get('keywords', [])
        if keywords:
            score += 10
        else:
            score += 5

        self.scores['content'] = min(score, max_score)
        return self.scores['content']

    def score_technical(self):
        """
        Score technical SEO based on:
        - HTTPS
        - Robots.txt
        - Sitemap
        - Canonical
        - No critical errors
        """
        score = 0
        max_score = 20
        errors = self.technical_report.get('errors', [])
        error_types = [e.get('type') for e in errors]

        # HTTPS
        if 'NO_HTTPS' not in error_types:
            score += 5
        # Robots.txt
        if 'ROBOTS_MISSING' not in error_types:
            score += 5
        # Sitemap
        if 'SITEMAP_MISSING' not in error_types:
            score += 5
        # Canonical
        if 'MISSING_CANONICAL' not in error_types:
            score += 5

        self.scores['technical'] = min(score, max_score)
        return self.scores['technical']

    def score_links(self):
        """
        Score links based on:
        - Broken links
        - Internal vs external links
        """
        score = 0
        max_score = 15

        broken_links = self.links_report.get('broken_links_summary', {}).get('total', 0)

        if broken_links == 0:
            score = 15
        elif broken_links <= 5:
            score = 10
        else:
            score = 5

        self.scores['links'] = score
        return score

    def score_performance(self):
        """
        Score performance based on page speed
        """
        score = 0
        max_score = 25

        # Use desktop average load time if available
        avg_time = None
        if self.speed_report.get('desktop_speed'):
            avg_time = self.speed_report['desktop_speed'].get('average_load_time')
        elif self.speed_report.get('average_load_time'):
            avg_time = self.speed_report.get('average_load_time')

        avg_time = avg_time or 10  # default if not found

        if avg_time <= 2:
            score = 25
        elif avg_time <= 4:
            score = 15
        else:
            score = 5

        self.scores['performance'] = score
        return score

    # ----------------------- Aggregate Score & Traffic Light -----------------------
    def calculate_total_score(self):
        self.score_content()
        self.score_technical()
        self.score_links()
        self.score_performance()

        total_score = sum(self.scores.values())
        self.scores['total'] = total_score

        # Traffic light
        if total_score >= 80:
            self.scores['grade'] = 'Green'
        elif total_score >= 50:
            self.scores['grade'] = 'Orange'
        else:
            self.scores['grade'] = 'Red'

        return self.scores


# ----------------------- Example Usage -----------------------
if __name__ == "__main__":
    # Example dummy reports
    content_report = {
        'content_quality': {'details': {'word_count': 500, 'readability_score': 65}},
        'keyword_research': {'keywords': [('seo', 10), ('python', 5)]}
    }
    technical_report = {
        'errors': []  # No errors for perfect site
    }
    links_report = {
        'broken_links_summary': {'total': 0},
        'internal_links': {'total': 20},
        'external_links': {'total': 10},
    }
    speed_report = {
        'desktop_speed': {'average_load_time': 1.8},
        'mobile_speed': {'average_load_time': 2.5}
    }

    scorer = SEOScorer(content_report, technical_report, links_report, speed_report)
    final_scores = scorer.calculate_total_score()
    print("Final SEO Score Report:")
    print(final_scores)
