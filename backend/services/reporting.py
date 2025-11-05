# services/reporting.py
import pandas as pd
from io import BytesIO
from datetime import datetime
import matplotlib.pyplot as plt
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

# Note: when generating charts we use matplotlib, save to BytesIO and embed in PDF
# (If you later deploy to serverless, ensure a matplotlib-compatible backend is available.)

def build_report_dataframe(recommendations):
    """
    Convert list of Recommendation ORM objects to pandas dataframe rows for CSV/PDF.
    """
    rows = []
    for r in recommendations:
        base = {
            "recommendation_id": r.id,
            "campaign_name": r.campaign_name,
            "action_proposal": r.action_proposal,
            "status": r.status,
            "predicted_impact": r.predicted_impact or 0,
            "created_at": r.created_at.isoformat()
        }
        if not r.execution_logs:
            rows.append({**base, "before_metric": None, "after_metric": None, "improvement": None, "recorded_at": None})
        else:
            for log in r.execution_logs:
                rows.append({**base,
                             "before_metric": log.before_metric,
                             "after_metric": log.after_metric,
                             "improvement": round(log.improvement, 2),
                             "recorded_at": log.recorded_at.isoformat()})
    df = pd.DataFrame(rows)
    return df

def create_performance_chart(df, metric_col="improvement"):
    """
    Create a simple time-series chart of improvements over time.
    Returns a BytesIO PNG.
    """
    buf = BytesIO()
    # aggregate average improvement per date
    if df.empty or df[metric_col].dropna().empty:
        # empty placeholder
        plt.figure(figsize=(6, 3))
        plt.text(0.5, 0.5, "No execution data yet", ha="center", va="center")
        plt.axis("off")
        plt.tight_layout()
        plt.savefig(buf, format="png", bbox_inches='tight')
        plt.close()
        buf.seek(0)
        return buf

    # ensure recorded_at is datetime
    df2 = df.dropna(subset=[metric_col, "recorded_at"]).copy()
    df2["recorded_at"] = pd.to_datetime(df2["recorded_at"])
    series = df2.groupby(df2["recorded_at"].dt.date)[metric_col].mean()

    plt.figure(figsize=(8, 3))
    plt.plot(series.index.astype(str), series.values, marker="o")
    plt.xticks(rotation=45, ha='right')
    plt.ylabel("Avg Improvement (%)")
    plt.title("Performance Improvement Over Time")
    plt.tight_layout()
    plt.savefig(buf, format="png", bbox_inches='tight')
    plt.close()
    buf.seek(0)
    return buf

def render_pdf(client_id: int, df: pd.DataFrame, chart_png: BytesIO, brand_name: str = None, logo_bytes: BytesIO = None):
    """
    Creates a PDF (BytesIO) containing the table summary and embedded chart.
    """
    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    # Header / Branding
    header_y = height - 50
    p.setFont("Helvetica-Bold", 16)
    title = f"{brand_name + ' - ' if brand_name else ''}AAA Client Report"
    p.drawString(50, header_y, title)
    p.setFont("Helvetica", 10)
    p.drawString(50, header_y - 16, f"Client ID: {client_id}  •  Generated: {datetime.utcnow().isoformat()}")

    # Optional logo on the right
    if logo_bytes:
        try:
            img = ImageReader(logo_bytes)
            p.drawImage(img, width - 150, header_y - 10, width=100, preserveAspectRatio=True, mask='auto')
        except Exception:
            pass

    y = header_y - 50

    # Add chart
    if chart_png:
        try:
            img = ImageReader(chart_png)
            p.drawImage(img, 50, y - 180, width=500, height=150, preserveAspectRatio=True, mask='auto')
            y = y - 200
        except Exception:
            pass

    # Add a small table (first 30 rows)
    p.setFont("Helvetica-Bold", 11)
    p.drawString(50, y, "Executed Actions (sample):")
    y -= 18
    p.setFont("Helvetica", 9)

    # Draw table header
    headers = ["Rec ID", "Campaign", "Action", "Before", "After", "Impr(%)", "Date"]
    col_x = [50, 95, 220, 390, 450, 510, 560]
    for i, h in enumerate(headers):
        p.drawString(col_x[i], y, h)
    y -= 14

    # Rows
    rows = df.to_dict(orient="records")
    max_rows = 25
    for i, row in enumerate(rows[:max_rows]):
        if y < 80:
            p.showPage()
            y = height - 80
        p.drawString(col_x[0], y, str(row.get("recommendation_id", "")))
        p.drawString(col_x[1], y, str(row.get("campaign_name", "")[:18]))
        p.drawString(col_x[2], y, str(row.get("action_proposal", "")[:24]))
        p.drawString(col_x[3], y, str(row.get("before_metric", "") or ""))
        p.drawString(col_x[4], y, str(row.get("after_metric", "") or ""))
        p.drawString(col_x[5], y, str(row.get("improvement", "") or ""))
        p.drawString(col_x[6], y, str(row.get("recorded_at", "")[:10] if row.get("recorded_at") else ""))
        y -= 14

    p.showPage()
    p.save()
    buffer.seek(0)
    return buffer
