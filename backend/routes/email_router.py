from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from typing import List, Optional
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from dotenv import load_dotenv
import os
import base64

load_dotenv()

router = APIRouter()


class EmailPayload(BaseModel):
    to: List[EmailStr]
    cc: Optional[List[EmailStr]] = []
    subject: str
    message: str
    project_name: str
    include_report: Optional[bool] = True
    report_id: Optional[int] = None
    auth_token: Optional[str] = None
    pdf_base64: Optional[str] = None       # ← base64 encoded PDF bytes
    pdf_filename: Optional[str] = None     # ← desired filename


@router.post("/api/send-report-email")
async def send_report_email(payload: EmailPayload):
    smtp_user = os.getenv("MAIL_USERNAME")
    smtp_pass = os.getenv("MAIL_PASSWORD")

    if not smtp_user or not smtp_pass:
        raise HTTPException(
            status_code=500,
            detail="Email credentials not configured in .env"
        )

    # ── HTML email body ───────────────────────────────────────────
    html_body = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #EF4F6E; padding: 24px; border-radius: 12px 12px 0 0;">
            <h2 style="color: white; margin: 0; font-size: 20px;">QA Audit Report</h2>
            <p style="color: rgba(255,255,255,0.85); margin: 6px 0 0; font-size: 14px;">
                {payload.project_name}
            </p>
        </div>
        <div style="background: #ffffff; border: 1px solid #e8eaf0; border-top: none;
                    padding: 28px; border-radius: 0 0 12px 12px;">
            <pre style="font-family: sans-serif; white-space: pre-wrap;
                        color: #374151; line-height: 1.7; margin: 0;">{payload.message}</pre>
            <hr style="border: none; border-top: 1px solid #f0f1f5; margin: 24px 0;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                Sent via <strong>Atlas QA Dashboard</strong>
            </p>
        </div>
    </div>
    """

    # ── Build MIME message ────────────────────────────────────────
    msg = MIMEMultipart("mixed")
    msg["Subject"] = payload.subject
    msg["From"]    = f"Atlas QA <{smtp_user}>"
    msg["To"]      = ", ".join(str(e) for e in payload.to)
    if payload.cc:
        msg["Cc"]  = ", ".join(str(e) for e in payload.cc)

    alt_part = MIMEMultipart("alternative")
    alt_part.attach(MIMEText(payload.message, "plain"))
    alt_part.attach(MIMEText(html_body, "html"))
    msg.attach(alt_part)

    # ── Attach PDF from base64 ────────────────────────────────────
    pdf_attached = False
    if payload.include_report and payload.pdf_base64:
        try:
            pdf_bytes = base64.b64decode(payload.pdf_base64)
            print(f"📄 PDF decoded: {len(pdf_bytes)} bytes")

            if len(pdf_bytes) > 500 and pdf_bytes[:4] == b"%PDF":
                attachment = MIMEBase("application", "pdf")
                attachment.set_payload(pdf_bytes)
                encoders.encode_base64(attachment)

                safe_name = (
                    payload.pdf_filename
                    or f"{payload.project_name.replace(' ', '_')}_report.pdf"
                )
                attachment.add_header(
                    "Content-Disposition",
                    f'attachment; filename="{safe_name}"'
                )
                msg.attach(attachment)
                pdf_attached = True
                print(f"✅ PDF attached: {len(pdf_bytes)} bytes")
            else:
                print(f"⚠️ Invalid PDF bytes: size={len(pdf_bytes)}, header={pdf_bytes[:8]}")

        except Exception as pdf_err:
            print(f"⚠️ PDF attachment error: {pdf_err}")

    # ── Send via Gmail SMTP ───────────────────────────────────────
    try:
        all_recipients = (
            [str(e) for e in payload.to] +
            [str(e) for e in (payload.cc or [])]
        )

        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.ehlo()
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_user, all_recipients, msg.as_string())

        return {
            "success": True,
            "message": f"Email sent to {', '.join(str(e) for e in payload.to)}",
            "pdf_attached": pdf_attached,
        }

    except smtplib.SMTPAuthenticationError:
        raise HTTPException(
            status_code=500,
            detail="Gmail auth failed — check MAIL_USERNAME and App Password in .env"
        )
    except smtplib.SMTPException as e:
        raise HTTPException(status_code=500, detail=f"SMTP error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))