import asyncio
import json
import os
import re

from fastapi import HTTPException
from sqlalchemy.orm import Session

from models.run_new_check import RunNewCheck
from schemas.run_new_check_schema import RunNewCheckCreate

from ..services.content_service import content_ai_from_url
from ..services.design_service import DesignCheckAgent
from ..services.seo_service import SEOAnalyzer
from ..services.technical_service import run_technical_audit
from ..services.accessibility_service import main_async as run_accessibility_audit


# ─── helper: run async accessibility inside sync service ─────────────────────
def _run_accessibility_sync(urls, wcag_level, browsers, breakpoints):
    """
    run_new_check_service is called from a sync FastAPI route.
    accessibility_service.main_async is an async function (uses Playwright async API).
    We must run it in a fresh event loop — we cannot use asyncio.run() if there is
    already a running loop (e.g. on Windows with ProactorEventLoop), so we create
    a brand-new loop explicitly.
    """
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(
            run_accessibility_audit(
                urls=urls,
                breakpoints=breakpoints,
                browsers=browsers,
                wcag_level=wcag_level,
            )
        )
    finally:
        loop.close()


# ─── wcag level helper ────────────────────────────────────────────────────────
def _wcag_level(standard: str) -> str:
    if not standard:
        return "AA"
    s = standard.upper()
    if "AAA" in s:
        return "AAA"
    if "AA" in s:
        return "AA"
    return "A"


# ─── browser name normaliser ──────────────────────────────────────────────────
def _normalise_browsers(browsers: list[str]) -> list[str]:
    """Map user-friendly browser names to Playwright browser names."""
    mapping = {
        "chrome":        "chromium",
        "chromium":      "chromium",
        "edge":          "chromium",
        "opera":         "chromium",
        "firefox":       "firefox",
        "safari":        "webkit",
        "mobile safari": "webkit",
        "webkit":        "webkit",
    }
    seen, result = set(), []
    for b in browsers:
        pw = mapping.get(b.lower().strip(), "chromium")
        if pw not in seen:
            seen.add(pw)
            result.append(pw)
    return result or ["chromium"]


# ─── file reader helpers ──────────────────────────────────────────────────────
def _read_json_file(path: str) -> dict:
    """Read and parse a JSON file. Returns error dict if file missing or invalid."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {"error": f"File not found: {path}"}
    except json.JSONDecodeError as e:
        return {"error": f"Invalid JSON in file {path}: {str(e)}"}
    except Exception as e:
        return {"error": f"Could not read file {path}: {str(e)}"}


def _read_csv_file(path: str) -> str:
    """Read a CSV file and return its contents as a string."""
    try:
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return f"File not found: {path}"
    except Exception as e:
        return f"Could not read file {path}: {str(e)}"


class RunNewCheckService:

    @staticmethod
    def get_next_project_id(db: Session) -> str:
        count = db.query(RunNewCheck).count()
        return "project_1" if count == 0 else f"project_{count + 1}"

    @staticmethod
    def create_run_new_check(db: Session, payload: RunNewCheckCreate) -> RunNewCheck:
        existing = db.query(RunNewCheck).filter(
            RunNewCheck.project_id == payload.project_id
        ).first()

        if existing:
            raise HTTPException(status_code=400, detail="Project ID already exists")

        new_check = RunNewCheck(**payload.model_dump())
        db.add(new_check)
        db.commit()
        db.refresh(new_check)
        return new_check

    @staticmethod
    def create_run_new_check_with_analysis(db: Session, payload: RunNewCheckCreate):

        new_check = RunNewCheckService.create_run_new_check(db, payload)

        # ── safe defaults ─────────────────────────────────────────────────────
        primary_color      = payload.primary_color or ""
        secondary_colors   = payload.secondary_colors or ""
        primary_font       = payload.primary_font or ""
        secondary_font     = payload.secondary_font or ""
        competitor_refs    = payload.competitor_refs or ""
        priority_pages_raw = payload.priority_pages or ""
        scripts_code       = payload.scripts_code or ""
        integrations_raw   = payload.third_party_integrations_sec or ""
        redirects_raw      = payload.redirects or ""

        # ── CONTENT AI ────────────────────────────────────────────────────────
        try:
            content_result = content_ai_from_url(
                url=payload.website_url,
                sitemap=[payload.sitemap_url] if payload.sitemap_url else [],
                content_map={},
                region=payload.client_region or "US",
            )
        except Exception as e:
            content_result = {"status": "error", "message": str(e)}

        # ── DESIGN AI ─────────────────────────────────────────────────────────
        try:
            design_agent = DesignCheckAgent()
            brand_colors = [
                c for c in [
                    primary_color,
                    *[c.strip() for c in secondary_colors.split(",") if c.strip()]
                ] if c
            ]
            brand_fonts = [f for f in [primary_font, secondary_font] if f]

            design_result = design_agent.run(
                url=payload.website_url,
                brand_colors=brand_colors,
                brand_fonts=brand_fonts,
                theme_refs=[payload.theme_demo_url] if payload.theme_demo_url else [],
                competitor_urls=[
                    c.strip() for c in competitor_refs.splitlines() if c.strip()
                ],
                custom_layout_rules={},
                priority_pages=[
                    p.strip() for p in priority_pages_raw.split(",") if p.strip()
                ],
            )
        except Exception as e:
            design_result = {"status": "error", "message": str(e)}

        # ── SEO AI ────────────────────────────────────────────────────────────
        try:
            seo_agent = SEOAnalyzer()
            seo_result = seo_agent.analyze_url(
                url=payload.website_url,
                target_keywords=[
                    kw.strip()
                    for page in (payload.seo_pages or [])
                    for kw in str(page.get("keywords", "")).split(",")
                    if kw.strip()
                ],
                priority_pages=[
                    str(page.get("page", "")).strip()
                    for page in (payload.seo_pages or [])
                    if str(page.get("page", "")).strip()
                ],
            )
        except Exception as e:
            seo_result = {"status": "error", "message": str(e)}

        # ── ACCESSIBILITY AI ──────────────────────────────────────────────────
        try:
            breakpoint_map: dict = {}
            for ds in (payload.device_sizes or []):
                m = re.search(r"\((\d+)[xX](\d+)\)", ds)
                if m:
                    label = (
                        "mobile"  if "mobile"  in ds.lower() else
                        "tablet"  if "tablet"  in ds.lower() else
                        "desktop"
                    )
                    breakpoint_map[label] = {
                        "width":  int(m.group(1)),
                        "height": int(m.group(2)),
                    }

            breakpoints = breakpoint_map or {
                "desktop": {"width": 1920, "height": 1080},
                "tablet":  {"width": 768,  "height": 1024},
                "mobile":  {"width": 375,  "height": 812},
            }

            browsers = _normalise_browsers(payload.browsers or [])
            wcag_level = _wcag_level(payload.accessibility_standard or "")

            json_path, csv_path = _run_accessibility_sync(
                urls=[payload.website_url],
                wcag_level=wcag_level,
                browsers=browsers,
                breakpoints=breakpoints,
            )

            accessibility_result = {
                "status":      "success",
                "message":     "Accessibility Audit Completed Successfully",
                "json_report": str(json_path),
                "csv_summary": str(csv_path),
            }
        except Exception as e:
            accessibility_result = {"status": "error", "message": str(e)}

        # ── TECHNICAL AI ──────────────────────────────────────────────────────
        try:
            redirect_rules: dict = {}
            if redirects_raw:
                for line in redirects_raw.splitlines():
                    parts = [p.strip() for p in line.replace("->", "→").split("→")]
                    if len(parts) == 2 and parts[0] and parts[1]:
                        redirect_rules[parts[0]] = parts[1]

            integrations = [
                i.strip().lower()
                for i in integrations_raw.replace("\n", ",").split(",")
                if i.strip()
            ]

            custom_script_rules = [
                s.strip()
                for s in scripts_code.replace("\n", ",").split(",")
                if s.strip()
            ]

            technical_data, report_file = run_technical_audit(
                base_url=payload.website_url,
                old_new_redirects=redirect_rules,
                custom_script_rules=custom_script_rules,
                performance_limits={"max_load_time": 4.0, "image_max_kb": 300},
                integrations=integrations,
                critical_pages={
                    "checkout": payload.website_url,
                    "login":    payload.website_url,
                    "cart":     payload.website_url,
                },
            )

            technical_result = {
                "data":        technical_data,
                "report_file": str(report_file),
            }
        except Exception as e:
            technical_result = {"status": "error", "message": str(e)}

        # ── BUILD REPORT RESULT (read actual file contents) ───────────────────
        report_result = {}

        # Read technical report JSON file
        if isinstance(technical_result, dict) and "report_file" in technical_result:
            tech_file_path = technical_result["report_file"]
            report_result["technical_report"] = _read_json_file(tech_file_path)

        # Read accessibility JSON report file
        if isinstance(accessibility_result, dict) and "json_report" in accessibility_result:
            json_report_path = accessibility_result["json_report"]
            report_result["accessibility_json_report"] = _read_json_file(json_report_path)

        # Read accessibility CSV summary file
        if isinstance(accessibility_result, dict) and "csv_summary" in accessibility_result:
            csv_path = accessibility_result["csv_summary"]
            report_result["accessibility_csv_summary"] = _read_csv_file(csv_path)

        # ── PERSIST TO DB ─────────────────────────────────────────────────────
        try:
            new_check.content_ai_result       = content_result
            new_check.design_ai_result        = design_result
            new_check.seo_ai_result           = seo_result
            new_check.accessibility_ai_result = accessibility_result
            new_check.technical_ai_result     = technical_result
            new_check.report_result           = report_result
            new_check.analysis_status         = "complete"
            db.commit()
            db.refresh(new_check)
        except Exception as e:
            db.rollback()
            print(f"[WARN] Failed to persist analysis results for check {new_check.id}: {e}")

        return {
            "message":          "Run New Check created successfully",
            "id":               new_check.id,
            "content_ai":       content_result,
            "design_ai":        design_result,
            "seo_ai":           seo_result,
            "accessibility_ai": accessibility_result,
            "technical_ai":     technical_result,
            "report_result":    report_result,
        }

    @staticmethod
    def list_run_new_checks(db: Session):
        return db.query(RunNewCheck).order_by(RunNewCheck.id.desc()).all()

    @staticmethod
    def get_run_new_check(db: Session, record_id: int):
        record = db.query(RunNewCheck).filter(RunNewCheck.id == record_id).first()
        if not record:
            raise HTTPException(status_code=404, detail="Record not found")
        return record