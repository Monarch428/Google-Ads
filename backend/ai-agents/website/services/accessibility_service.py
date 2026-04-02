"""
accessibility_audit.py

Runs accessibility + responsiveness checks across breakpoints & browsers
using Playwright + axe-core.
Outputs JSON and CSV reports.
"""

import asyncio
import json
from pathlib import Path
from datetime import datetime, timezone
from typing import Any

import pandas as pd
import requests
from playwright.async_api import async_playwright

PROJECT_DOC_PATH = "/mnt/data/BeeSure- website check agent.pdf"
OUTPUT_DIR = Path("reports")
AXE_CDN = "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.6.3/axe.min.js"

DEFAULT_BREAKPOINTS = {
    "desktop": {"width": 1920, "height": 1080},
    "tablet": {"width": 768, "height": 1024},
    "mobile": {"width": 375, "height": 812},
}

DEFAULT_BROWSERS = ["chromium", "webkit", "firefox"]

WCAG_RULESET = {
    "A": "wcag2a",
    "AA": "wcag2aa",
    "AAA": "wcag2aaa",
}

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


# ─────────────────────── Utilities ───────────────────────────────

def timestamp() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def sanitize_filename(text: str) -> str:
    return (
        text.replace("://", "_")
        .replace("/", "_")
        .replace("\\", "_")
        .replace("?", "_")
        .replace("&", "_")
        .replace("=", "_")
        .replace(":", "_")
    )


def normalize_breakpoints(breakpoints: dict | None) -> dict:
    if not breakpoints:
        return DEFAULT_BREAKPOINTS

    normalized = {}
    for name, dims in breakpoints.items():
        if not isinstance(dims, dict):
            raise ValueError(f"Breakpoint '{name}' must be an object with width and height.")

        width = dims.get("width")
        height = dims.get("height")

        if not isinstance(width, int) or not isinstance(height, int):
            raise ValueError(f"Breakpoint '{name}' must have integer width and height.")

        normalized[name] = {"width": width, "height": height}

    return normalized


def normalize_browsers(browsers: list | None) -> list:
    if not browsers:
        return DEFAULT_BROWSERS

    allowed = {"chromium", "webkit", "firefox"}
    cleaned = []

    for browser in browsers:
        if browser not in allowed:
            raise ValueError(
                f"Unsupported browser '{browser}'. Allowed values: {sorted(allowed)}"
            )
        cleaned.append(browser)

    return cleaned


def normalize_wcag_level(wcag_level: str | None) -> str:
    level = (wcag_level or "AA").upper()
    if level not in WCAG_RULESET:
        raise ValueError("wcag_level must be one of: A, AA, AAA")
    return level


def download_axe_js(local_path: Path) -> Path:
    if local_path.exists() and local_path.stat().st_size > 0:
        return local_path

    response = requests.get(AXE_CDN, timeout=30)
    response.raise_for_status()
    local_path.write_bytes(response.content)
    return local_path


# ─────────────────────── Axe helpers ─────────────────────────────

async def ensure_axe_loaded(page, axe_source: Path) -> None:
    axe_js = axe_source.read_text(encoding="utf-8")
    await page.add_script_tag(content=axe_js)

    exists = await page.evaluate("typeof window.axe !== 'undefined'")
    if not exists:
        raise RuntimeError("axe-core failed to load on the page")


async def run_axe_on_page(page, axe_source: Path, wcag_level: str = "AA") -> dict[str, Any]:
    await ensure_axe_loaded(page, axe_source)

    run_only = {
        "type": "tag",
        "values": [WCAG_RULESET[wcag_level]],
    }

    result = await page.evaluate(
        """async (runOnly) => {
            return await window.axe.run(document, { runOnly });
        }""",
        run_only,
    )
    return result


# ─────────────────────── Core audit ──────────────────────────────

async def audit_single_configuration(
    browser_type,
    browser_name: str,
    url: str,
    breakpoint_name: str,
    dims: dict,
    axe_local_path: Path,
    wcag_level: str,
) -> dict[str, Any]:
    browser = None
    context = None
    page = None

    try:
        browser = await browser_type.launch(headless=True)

        context = await browser.new_context(
            viewport={"width": dims["width"], "height": dims["height"]}
        )
        page = await context.new_page()

        response = await page.goto(url, wait_until="domcontentloaded", timeout=60000)
        await page.wait_for_load_state("networkidle", timeout=60000)
        await asyncio.sleep(1)

        status = response.status if response else None
        title = await page.title()

        try:
            axe_results = await run_axe_on_page(page, axe_local_path, wcag_level)
        except Exception as axe_error:
            axe_results = {"error": f"axe_error: {type(axe_error).__name__}: {repr(axe_error)}"}

        screenshot_path = (
            OUTPUT_DIR
            / f"{sanitize_filename(url)}_{browser_name}_{breakpoint_name}_{timestamp()}.png"
        )

        try:
            await page.screenshot(path=str(screenshot_path), full_page=True)
            screenshot_value = str(screenshot_path)
        except Exception as screenshot_error:
            screenshot_value = None
            print(f"Screenshot failed for {url} [{browser_name}/{breakpoint_name}]: {screenshot_error}")

        return {
            "url": url,
            "browser": browser_name,
            "breakpoint": breakpoint_name,
            "width": dims["width"],
            "height": dims["height"],
            "status": status,
            "title": title,
            "screenshot": screenshot_value,
            "axe": axe_results,
            "project_doc": PROJECT_DOC_PATH,
            "required_accessibility_level": wcag_level,
        }

    except Exception as e:
        return {
            "url": url,
            "browser": browser_name,
            "breakpoint": breakpoint_name,
            "width": dims.get("width"),
            "height": dims.get("height"),
            "status": "audit_error",
            "title": None,
            "screenshot": None,
            "axe": {
                "error": f"{type(e).__name__}: {repr(e)}"
            },
            "project_doc": PROJECT_DOC_PATH,
            "required_accessibility_level": wcag_level,
        }

    finally:
        if page:
            await page.close()
        if context:
            await context.close()
        if browser:
            await browser.close()


async def audit_url(
    playwright,
    url: str,
    breakpoints: dict,
    browsers: list,
    axe_local_path: Path,
    wcag_level: str = "AA",
) -> list[dict[str, Any]]:
    out = []

    for browser_name in browsers:
        try:
            browser_type = getattr(playwright, browser_name)
        except AttributeError:
            out.append({
                "url": url,
                "browser": browser_name,
                "breakpoint": None,
                "width": None,
                "height": None,
                "status": "browser_not_supported",
                "title": None,
                "screenshot": None,
                "axe": {"error": f"Unsupported browser: {browser_name}"},
                "project_doc": PROJECT_DOC_PATH,
                "required_accessibility_level": wcag_level,
            })
            continue

        for breakpoint_name, dims in breakpoints.items():
            result = await audit_single_configuration(
                browser_type=browser_type,
                browser_name=browser_name,
                url=url,
                breakpoint_name=breakpoint_name,
                dims=dims,
                axe_local_path=axe_local_path,
                wcag_level=wcag_level,
            )
            out.append(result)

    return out


# ─────────────────────── Report helpers ──────────────────────────

def summarize_axe(axe_result: dict) -> dict[str, Any]:
    if not axe_result:
        return {"error": "no_result"}

    if "error" in axe_result:
        return {"error": axe_result.get("error", "unknown_error")}

    violations = axe_result.get("violations", [])
    issues = []

    for violation in violations:
        issues.append({
            "id": violation.get("id"),
            "impact": violation.get("impact"),
            "description": violation.get("description"),
            "help": violation.get("help"),
            "nodes": len(violation.get("nodes", [])),
        })

    return {
        "violations_count": len(violations),
        "issues": sorted(
            issues,
            key=lambda x: (
                x["impact"] is None,
                str(x["impact"]),
                -x["nodes"],
            ),
        )[:10],
        "passes": len(axe_result.get("passes", [])),
        "incomplete": len(axe_result.get("incomplete", [])),
        "inapplicable": len(axe_result.get("inapplicable", [])),
    }


def write_reports(all_results: list) -> tuple[Path, Path]:
    timestamp_str = timestamp()
    json_path = OUTPUT_DIR / f"accessibility_report_{timestamp_str}.json"
    csv_path = OUTPUT_DIR / f"accessibility_summary_{timestamp_str}.csv"

    json_path.write_text(
        json.dumps(all_results, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    rows = []
    for result in all_results:
        axe_summary = summarize_axe(result.get("axe", {}))
        rows.append({
            "url": result.get("url"),
            "browser": result.get("browser"),
            "breakpoint": result.get("breakpoint"),
            "width": result.get("width"),
            "height": result.get("height"),
            "status": result.get("status"),
            "title": result.get("title"),
            "screenshot": result.get("screenshot"),
            "violations_count": axe_summary.get("violations_count"),
            "passes": axe_summary.get("passes"),
            "incomplete": axe_summary.get("incomplete"),
            "inapplicable": axe_summary.get("inapplicable"),
            "error": axe_summary.get("error"),
        })

    pd.DataFrame(rows).to_csv(csv_path, index=False)
    return json_path, csv_path


# ─────────────────────── Entry point ─────────────────────────────

async def main_async(
    urls: list,
    breakpoints: dict | None = None,
    browsers: list | None = None,
    wcag_level: str = "AA",
):
    if not isinstance(urls, list) or not urls:
        raise ValueError("urls must be a non-empty list")

    for url in urls:
        if not isinstance(url, str) or not url.strip():
            raise ValueError("Each url must be a non-empty string")

    breakpoints = normalize_breakpoints(breakpoints)
    browsers = normalize_browsers(browsers)
    wcag_level = normalize_wcag_level(wcag_level)

    axe_local = OUTPUT_DIR / "axe.min.js"
    try:
        download_axe_js(axe_local)
    except Exception as e:
        raise RuntimeError(f"Could not download axe-core: {type(e).__name__}: {repr(e)}")

    all_results = []

    try:
        async with async_playwright() as playwright:
            for url in urls:
                results = await audit_url(
                    playwright=playwright,
                    url=url,
                    breakpoints=breakpoints,
                    browsers=browsers,
                    axe_local_path=axe_local,
                    wcag_level=wcag_level,
                )
                all_results.extend(results)
    except Exception as e:
        raise RuntimeError(f"Playwright audit failed: {type(e).__name__}: {repr(e)}")

    json_path, csv_path = write_reports(all_results)
    return json_path, csv_path