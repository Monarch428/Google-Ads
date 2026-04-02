# speed_analyzer.py
import aiohttp
import asyncio

API_KEY = "AIzaSyDUM7Mi_P82ePNWsxAgBbtjzxFIC61u2kE" 
API_URL = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"

class SpeedAnalyzer:
    def __init__(self, api_key: str):
        self.api_key = api_key

    async def fetch_speed(self, session, url: str, strategy: str = "mobile"):
        params = {
            "url": url,
            "key": self.api_key,
            "strategy": strategy
        }
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                          "AppleWebKit/537.36 (KHTML, like Gecko) "
                          "Chrome/118.0.5993.90 Safari/537.36"
        }
        try:
            async with session.get(API_URL, params=params, timeout=30, headers=headers) as resp:
                if resp.status != 200:
                    return {"error": f"HTTP {resp.status} for {strategy}"}
                return await resp.json()
        except Exception as e:
            return {"error": str(e)}

    async def check_speed(self, url: str):
        async with aiohttp.ClientSession() as session:
            tasks = [
                self.fetch_speed(session, url, "desktop"),
                self.fetch_speed(session, url, "mobile")
            ]
            desktop, mobile = await asyncio.gather(*tasks)
            return {"url": url, "desktop": desktop, "mobile": mobile}

    @staticmethod
    def extract_metrics(result: dict):
        """Extract key SEO speed metrics"""
        def parse(data):
            if "error" in data:
                return {"error": data["error"]}
            audits = data.get("lighthouseResult", {}).get("audits", {})
            categories = data.get("lighthouseResult", {}).get("categories", {}).get("performance", {})
            return {
                "performance_score": categories.get("score", 0) * 100,
                "FCP": audits.get("first-contentful-paint", {}).get("displayValue", ""),
                "LCP": audits.get("largest-contentful-paint", {}).get("displayValue", ""),
                "CLS": audits.get("cumulative-layout-shift", {}).get("displayValue", ""),
                "TBT": audits.get("total-blocking-time", {}).get("displayValue", ""),
                "SpeedIndex": audits.get("speed-index", {}).get("displayValue", "")
            }
        return {
            "url": result.get("url"),
            "desktop": parse(result.get("desktop", {})),
            "mobile": parse(result.get("mobile", {}))
        }

# ------------------- Run Example -------------------
async def main():
    url = input("Enter website URL to check: ")
    analyzer = SpeedAnalyzer(api_key=API_KEY)
    raw_result = await analyzer.check_speed(url)
    metrics = analyzer.extract_metrics(raw_result)
    
    print("\n--- Website Speed Metrics ---")
    print(f"URL: {metrics['url']}")
    print("\nDesktop:")
    for k, v in metrics['desktop'].items():
        print(f"  {k}: {v}")
    print("\nMobile:")
    for k, v in metrics['mobile'].items():
        print(f"  {k}: {v}")

if __name__ == "__main__":
    asyncio.run(main())
