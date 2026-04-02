import json
from pathlib import Path
from datetime import datetime


def generate_pdf_from_report_result(report_result: dict, record: object) -> str:
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.colors import HexColor
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
        from reportlab.lib.units import cm
        from reportlab.lib import colors
    except ImportError:
        raise RuntimeError("reportlab not installed. Run: pip install reportlab")

    reports_dir = Path("reports/pdf")
    reports_dir.mkdir(parents=True, exist_ok=True)
    pdf_path = reports_dir / f"report_{record.id}_{int(datetime.now().timestamp())}.pdf"

    doc = SimpleDocTemplate(
        str(pdf_path), pagesize=A4,
        rightMargin=2 * cm, leftMargin=2 * cm,
        topMargin=2 * cm, bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    ACCENT = HexColor("#EF4F6E")

    title_style  = ParagraphStyle("T",  parent=styles["Heading1"], textColor=ACCENT, fontSize=20, spaceAfter=6)
    h2_style     = ParagraphStyle("H2", parent=styles["Heading2"], textColor=HexColor("#1a1a2e"), fontSize=13, spaceBefore=14, spaceAfter=4)
    h3_style     = ParagraphStyle("H3", parent=styles["Heading3"], textColor=HexColor("#374151"), fontSize=10, spaceBefore=8,  spaceAfter=3)
    body_style   = ParagraphStyle("B",  parent=styles["Normal"],   fontSize=8,  leading=13, textColor=HexColor("#374151"))
    label_style  = ParagraphStyle("L",  parent=styles["Normal"],   fontSize=8,  textColor=HexColor("#6b7280"), spaceAfter=2)
    meta_style   = ParagraphStyle("M",  parent=styles["Normal"],   fontSize=9,  textColor=HexColor("#6b7280"))

    story = []

    # ── Cover ─────────────────────────────────────────────────────────
    story.append(Paragraph("BeeSure AI – Website Audit Report", title_style))
    story.append(Paragraph(f"Project: <b>{getattr(record, 'project_name', 'N/A')}</b>", meta_style))
    story.append(Paragraph(f"URL: {getattr(record, 'website_url', 'N/A')}", meta_style))
    story.append(Paragraph(f"Generated: {datetime.now().strftime('%B %d, %Y at %H:%M')}", meta_style))
    story.append(HRFlowable(width="100%", thickness=2, color=ACCENT, spaceBefore=8, spaceAfter=16))

    def safe_para(text, style):
        try:
            return Paragraph(str(text)[:500], style)
        except Exception:
            return Paragraph("(unrenderable value)", style)

    def render_section(data: dict, depth=0):
        items = []
        table_rows = []
        h_style = h3_style if depth > 0 else h2_style

        for key, value in data.items():
            key_label = str(key).replace("_", " ").title()

            if isinstance(value, dict) and depth < 3:
                if table_rows:
                    items.append(_make_table(table_rows, label_style, body_style))
                    table_rows = []
                items.append(safe_para(key_label, h_style))
                items.extend(render_section(value, depth + 1))

            elif isinstance(value, list):
                if table_rows:
                    items.append(_make_table(table_rows, label_style, body_style))
                    table_rows = []
                if len(value) == 0:
                    table_rows.append([key_label, "None"])
                elif all(isinstance(v, (str, int, float, bool)) for v in value):
                    table_rows.append([key_label, ", ".join(str(v) for v in value[:20])])
                else:
                    items.append(safe_para(key_label, h_style))
                    for item in value[:15]:
                        if isinstance(item, dict):
                            items.extend(render_section(item, depth + 1))
                        else:
                            items.append(safe_para(f"• {item}", body_style))
            else:
                display = str(value)[:400] if value is not None else "N/A"
                table_rows.append([key_label, display])

        if table_rows:
            items.append(_make_table(table_rows, label_style, body_style))

        items.append(Spacer(1, 6))
        return items

    def _make_table(rows, ls, bs):
        t = Table(
            [[Paragraph(r[0], ls), Paragraph(r[1], bs)] for r in rows],
            colWidths=[5 * cm, 12 * cm],
        )
        t.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (0, -1), HexColor("#f9fafb")),
            ("GRID",          (0, 0), (-1, -1), 0.4, HexColor("#e8eaf0")),
            ("VALIGN",        (0, 0), (-1, -1), "TOP"),
            ("ROWBACKGROUNDS",(0, 0), (-1, -1), [HexColor("#ffffff"), HexColor("#f9fafb")]),
            ("LEFTPADDING",   (0, 0), (-1, -1), 6),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
            ("TOPPADDING",    (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        return t

    # ── Technical Report ──────────────────────────────────────────────
    tech = report_result.get("technical_report")
    if isinstance(tech, dict):
        story.append(Paragraph("Technical Audit", h2_style))
        story.append(HRFlowable(width="100%", thickness=1, color=HexColor("#e8eaf0"), spaceAfter=8))
        story.extend(render_section(tech))
        story.append(Spacer(1, 14))

    # ── Accessibility JSON ────────────────────────────────────────────
    acc = report_result.get("accessibility_json_report")
    if isinstance(acc, dict):
        story.append(Paragraph("Accessibility Audit", h2_style))
        story.append(HRFlowable(width="100%", thickness=1, color=HexColor("#e8eaf0"), spaceAfter=8))
        story.extend(render_section(acc))
        story.append(Spacer(1, 14))

    # ── Accessibility CSV ─────────────────────────────────────────────
    csv_text = report_result.get("accessibility_csv_summary")
    if csv_text and isinstance(csv_text, str):
        story.append(Paragraph("Accessibility Summary", h2_style))
        story.append(HRFlowable(width="100%", thickness=1, color=HexColor("#e8eaf0"), spaceAfter=8))
        lines = csv_text.strip().split("\n")[:30]
        if len(lines) > 1:
            header = [h.strip()[:40] for h in lines[0].split(",")]
            rows   = [[c.strip()[:60] for c in line.split(",")] for line in lines[1:]]
            col_w  = 17 * cm / max(len(header), 1)
            t = Table(
                [header] + rows,
                colWidths=[col_w] * len(header),
                repeatRows=1,
            )
            t.setStyle(TableStyle([
                ("BACKGROUND",  (0, 0), (-1, 0), ACCENT),
                ("TEXTCOLOR",   (0, 0), (-1, 0), colors.white),
                ("FONTSIZE",    (0, 0), (-1, -1), 7),
                ("GRID",        (0, 0), (-1, -1), 0.4, HexColor("#e8eaf0")),
                ("ROWBACKGROUNDS", (1, 0), (-1, -1), [HexColor("#ffffff"), HexColor("#f9fafb")]),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING",(0, 0), (-1, -1), 4),
                ("TOPPADDING",  (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING",(0, 0),(-1, -1), 3),
                ("VALIGN",      (0, 0), (-1, -1), "TOP"),
            ]))
            story.append(t)
        story.append(Spacer(1, 14))

    # ── Footer ────────────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=1, color=HexColor("#e8eaf0"), spaceBefore=20))
    story.append(Paragraph("Generated by BeeSure AI – BrandingBeez", label_style))

    doc.build(story)
    return str(pdf_path)