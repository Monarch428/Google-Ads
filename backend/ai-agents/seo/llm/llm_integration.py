# llm_integration.py
import os
import json
from datetime import datetime
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
llm_client = OpenAI(api_key=OPENAI_API_KEY)

# Functions 

def analyze_seo_reports_with_llm(folder_path: str) -> str:
    """
    Consolidate multiple JSON SEO reports from folder and generate LLM-based improvements.
    """
    try:
        all_reports = []
        for file in os.listdir(folder_path):
            if file.endswith(".json"):
                with open(os.path.join(folder_path, file), "r", encoding="utf-8") as f:
                    all_reports.append(json.load(f))

        if not all_reports:
            return "[Error] No JSON reports found in the folder."

        reports_text = json.dumps(all_reports, indent=2)

        prompt = f"""
You are an expert SEO consultant. Consolidate all the following SEO reports:

{reports_text}

Generate a detailed improvement plan for each type of SEO issue, covering:
- Technical SEO
- On-Page SEO
- Content SEO
- Performance
- Links & Authority

Provide actionable steps, tools to fix, and best practices.
Also, give Quick Wins and Long-Term SEO Strategies.
"""
        response = llm_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a professional SEO analyst."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=4000
        )

        return response.choices[0].message.content

    except Exception as e:
        return f"[Error] {str(e)}"


def save_analysis(result_text: str, output_file: str = "seo_consolidated_report.md"):
    """
    Save the LLM SEO analysis to a markdown file
    """
    try:
        with open(output_file, "w", encoding="utf-8") as f:
            f.write(f"# Consolidated SEO Improvement Report\nGenerated on {datetime.now()}\n\n")
            f.write(result_text)
    except Exception as e:
        print(f"[Error] Could not save analysis: {e}")
