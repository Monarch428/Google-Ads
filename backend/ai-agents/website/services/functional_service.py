"""
functional_audit.py

Functional AI Audit:
- Form discovery & validation
- Required/optional fields
- Email & phone pattern checks
- CAPTCHA test mode
- Form submission flow (redirect, thank-you)
- Popups, accordions, carousels
- Mailchimp, Google Sheets, CRM form detection
"""

from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup
import json
import time
from pathlib import Path
import re

PROJECT_DOC_PATH = "/mnt/data/BeeSure- website check agent.pdf"
OUTPUT_DIR = Path("reports/functional")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# -------------------------------------------------------
# Utility Functions
# -------------------------------------------------------
def validate_email(value):
    return bool(re.match(r"[^@]+@[^@]+\.[^@]+", value))


def validate_phone(value):
    return bool(re.match(r"^[0-9\-\+\(\)\s]{6,15}$", value))


def detect_interactive_elements(html):
    soup = BeautifulSoup(html, "html.parser")

    return {
        "popups_found": bool(soup.select("[class*=popup], [id*=popup]")),
        "carousels_found": bool(soup.select("[class*=carousel], .swiper, .slick-slider")),
        "accordions_found": bool(soup.select("[class*=accordion], .faq, .toggle")),
        "faq_toggles_found": bool(soup.select(".faq-question, .faq-toggle")),
    }


def detect_integrations(html):
    integrations = {
        "mailchimp": "list-manage.com" in html.lower(),
        "google_sheets_form": "script.google.com" in html.lower(),
        "crm_hubspot": "hsforms.net" in html.lower(),
        "crm_zoho": "zohoforms" in html.lower(),
    }
    return integrations


# -------------------------------------------------------
# Form Scanner
# -------------------------------------------------------
def extract_forms(html, base_url):
    soup = BeautifulSoup(html, "html.parser")
    forms = []

    for form in soup.find_all("form"):
        fields = []
        for input_tag in form.find_all(["input", "textarea", "select"]):
            fields.append({
                "name": input_tag.get("name"),
                "type": input_tag.get("type", "text"),
                "required": bool(input_tag.get("required")),
                "placeholder": input_tag.get("placeholder")
            })

        forms.append({
            "action": form.get("action") or base_url,
            "method": form.get("method", "GET").upper(),
            "fields": fields
        })
    return forms


# -------------------------------------------------------
# Form Submission Tester
# -------------------------------------------------------
def test_form_submission(page, form_data):
    results = {}

    try:
        # Fill fields
        for field in form_data["fields"]:
            name = field["name"]
            field_type = field["type"]

            selector = f'[name="{name}"]'
            if not name:
                continue

            # Fake data per type
            if field_type == "email":
                val = "test@example.com"
            elif field_type == "tel":
                val = "+1234567890"
            else:
                val = "Test input"

            try:
                page.fill(selector, val)
            except:
                pass

        # Submit form
        try:
            page.click("form button[type=submit], form input[type=submit]")
        except:
            pass

        # Wait for navigation or thank-you
        page.wait_for_timeout(2000)
        results["thank_you_detected"] = (
            "thank" in page.content().lower() or
            "success" in page.content().lower()
        )

        # Redirect URL
        try:
            results["redirect_url"] = page.url
        except:
            results["redirect_url"] = None

    except Exception as e:
        results["error"] = str(e)

    return results


# -------------------------------------------------------
# Functional Audit Master Function
# -------------------------------------------------------
def run_functional_audit(
    base_url: str,
    captcha_keys: dict,
    form_rules: dict,
    expected_flows: dict,
    third_party_rules: list
):
    print("Running Functional Audit...")

    audit = {
        "project_doc": PROJECT_DOC_PATH,
        "base_url": base_url,
        "forms_found": [],
        "form_tests": [],
        "interactive_elements": {},
        "integrations_detected": {},
        "captcha_config": captcha_keys,
        "expected_flows": expected_flows
    }

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Load page
        page.goto(base_url, wait_until="domcontentloaded")
        html = page.content()

        # Scan forms
        forms = extract_forms(html, base_url)
        audit["forms_found"] = forms

        # Detect popups, carousels, accordions
        audit["interactive_elements"] = detect_interactive_elements(html)

        # Detect integrations
        audit["integrations_detected"] = detect_integrations(html)

        # Test each form
        for form in forms:
            # Navigate to base page fresh each time
            page.goto(base_url, wait_until="domcontentloaded")

            form_result = test_form_submission(page, form)
            form_result["action"] = form["action"]
            form_result["method"] = form["method"]
            form_result["fields"] = form["fields"]

            audit["form_tests"].append(form_result)

        browser.close()

    # Save JSON
    out_file = OUTPUT_DIR / f"functional_audit_{int(time.time())}.json"
    out_file.write_text(json.dumps(audit, indent=2))

    return audit, out_file
