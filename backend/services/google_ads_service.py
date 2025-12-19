# services/google_ads_service.py

import os
import json
import requests
import logging
from datetime import date, datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from models.google_ads_account import GoogleAdsAccount
from models.client_model import Client
from models.campaign_model import Campaign
from models.recommendation_model import Recommendation

from models.asset_model import Asset
from models.campaign_asset_performance import CampaignAssetPerformance
from models.asset_set_model import AssetSet
from models.asset_set_asset_model import AssetSetAsset
from models.campaign_asset_set_link import CampaignAssetSetLink
from models.customer_asset_set_link import CustomerAssetSetLink
from models.conversion_action_model import ConversionAction
from models.campaign_conversion_stat import CampaignConversionStat
from models.bidding_strategy_model import BiddingStrategy

from .google_ads_sync_helpers import (
    save_campaigns_from_rows,
    save_assets_from_rows,
    save_campaign_assets_from_rows,
    save_asset_sets_from_rows,
    save_conversion_actions_from_rows,
    save_campaign_conversion_stats_from_rows,
    save_bidding_strategies_from_rows,
)

# -------------------- Logger Setup --------------------
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# -------------------- Google API Endpoints --------------------
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_ADS_SEARCH_URL = "https://googleads.googleapis.com/v22/customers"


def _float_or_zero(value) -> float:
    try:
        return float(value)
    except Exception:
        return 0.0


def _normalize_ctr(raw_ctr: float) -> float:
    """Google Ads may return CTR as a fraction or percentage. Normalize to %."""
    if raw_ctr <= 1:
        return raw_ctr * 100
    return raw_ctr


def _format_money(amount: float, currency_code: str) -> str:
    try:
        return f"{currency_code} {amount:,.2f}"
    except Exception:
        return f"{currency_code} {amount}"


def _build_recommendations_from_metrics(
    db: Session,
    client_db_id: int,
    response_data,
    *,
    currency_code: str = "USD",
    customer_id: str | None = None,
    asset_rows: list | None = None,
    campaign_asset_rows: list | None = None,
    bidding_strategy_rows: list | None = None,
):
    """Generate actionable campaign recommendations from Google Ads metrics.

    The function now considers campaign, asset, and bidding strategy data to
    surface richer improvement ideas (budget pacing, auction/rank share, asset
    health, and bid strategy alignment) alongside the existing performance
    heuristics.
    """

    if customer_id:
        db.query(Recommendation).filter(
            Recommendation.client_id == client_db_id,
            Recommendation.customer_id == customer_id,
        ).delete(synchronize_session=False)

    recommendations: list[dict] = []

    # Normalize optional datasets
    asset_rows = asset_rows or []
    campaign_asset_rows = campaign_asset_rows or []
    bidding_strategy_rows = bidding_strategy_rows or []

    # Map bidding strategies by resource for quick lookups when iterating campaigns
    bidding_by_resource: dict[str, dict] = {}
    for batch in bidding_strategy_rows:
        for row in batch.get("results", []):
            strategy = row.get("biddingStrategy", row.get("bidding_strategy", {}))
            resource = strategy.get("resourceName") or strategy.get("resource_name")
            if resource:
                bidding_by_resource[resource] = strategy

    # Capture asset performance for creative-level recommendations
    asset_performance: list[dict] = []
    for batch in campaign_asset_rows:
        for row in batch.get("results", []):
            asset_info = row.get("asset", {})
            campaign_info = row.get("campaign", {})
            metrics = row.get("metrics", {})

            impressions = int(metrics.get("impressions", 0) or 0)
            clicks = int(metrics.get("clicks", 0) or 0)
            conversions = _float_or_zero(metrics.get("conversions", 0))
            ctr_value = (clicks / impressions * 100) if impressions else 0
            conv_rate = (conversions / clicks * 100) if clicks else 0

            asset_performance.append(
                {
                    "campaign_name": campaign_info.get("name", "Unknown campaign"),
                    "asset_name": asset_info.get("name", "Unnamed asset"),
                    "asset_type": asset_info.get("type"),
                    "impressions": impressions,
                    "clicks": clicks,
                    "conversions": conversions,
                    "ctr": round(ctr_value, 2),
                    "conv_rate": round(conv_rate, 2),
                }
            )

    # 🔁 IMPORTANT: response_data is searchStream → list[batch]
    for batch in response_data:
        for row in batch.get("results", []):
            metrics = row.get("metrics", {})
            campaign_info = row.get("campaign", {})

            campaign_name = campaign_info.get("name", "Unnamed Campaign")
            impressions = int(metrics.get("impressions", 0) or 0)
            clicks = int(metrics.get("clicks", 0) or 0)
            conversions = _float_or_zero(metrics.get("conversions", 0))
            cost_micros = int(metrics.get("costMicros", 0) or 0)

            ctr_value = _normalize_ctr(_float_or_zero(metrics.get("ctr", 0)))
            cost = cost_micros / 1_000_000
            avg_cpc = cost / clicks if clicks else 0
            conv_rate = (conversions / clicks) * 100 if clicks else 0
            cpa = (cost / conversions) if conversions else None

            search_impression_share = _normalize_ctr(
                _float_or_zero(
                    metrics.get("searchImpressionShare")
                    or metrics.get("search_impression_share")
                )
            )
            rank_lost_share = _normalize_ctr(
                _float_or_zero(
                    metrics.get("searchRankLostImpressionShare")
                    or metrics.get("search_rank_lost_impression_share")
                )
            )
            budget_lost_share = _normalize_ctr(
                _float_or_zero(
                    metrics.get("searchBudgetLostImpressionShare")
                    or metrics.get("search_budget_lost_impression_share")
                )
            )

            budget_info = row.get("campaignBudget", row.get("campaign_budget", {}))
            budget_micros = int(budget_info.get("amountMicros") or 0)
            daily_budget = budget_micros / 1_000_000 if budget_micros else None

            bidding_resource = campaign_info.get("biddingStrategy")
            bidding_strategy = bidding_by_resource.get(bidding_resource, {})
            target_cpa_micros = (
                bidding_strategy.get("targetCpa", {}) or {}
            ).get("targetCpaMicros")
            target_cpa = target_cpa_micros / 1_000_000 if target_cpa_micros else None
            target_roas = (
                bidding_strategy.get("targetRoas", {}) or {}
            ).get("targetRoas")

            snapshot = {
                "impressions": impressions,
                "clicks": clicks,
                "ctr": round(ctr_value, 2),
                "conversions": round(conversions, 2),
                "avg_cpc": round(avg_cpc, 2),
                "conv_rate": round(conv_rate, 2),
                "cost": round(cost, 2),
                "cpa": round(cpa, 2) if cpa else None,
                "currency_code": currency_code,
                "customer_id": customer_id,
                "search_impression_share": round(search_impression_share, 2)
                if search_impression_share
                else None,
                "search_rank_lost_impression_share": round(rank_lost_share, 2)
                if rank_lost_share
                else None,
                "search_budget_lost_impression_share": round(budget_lost_share, 2)
                if budget_lost_share
                else None,
                "daily_budget": round(daily_budget, 2) if daily_budget else None,
                "target_cpa": round(target_cpa, 2) if target_cpa else None,
                "target_roas": round(target_roas, 2) if target_roas else None,
                "optimization_score": _float_or_zero(
                    campaign_info.get("optimizationScore")
                ),
                "bidding_strategy_type": campaign_info.get(
                    "biddingStrategyType"
                ),
            }

            if impressions > 300 and ctr_value < 1.5:
                recommendations.append(
                    {
                        "campaign_name": campaign_name,
                        "suggestion": (
                            f"CTR is only {snapshot['ctr']}% on {impressions} impressions. "
                            "Refresh headlines, add stronger calls-to-action, and test 2-3 responsive search ads to lift engagement."
                        ),
                        "action_proposal": "Test new ad copy and pin best-performing assets to raise CTR.",
                        "predicted_impact": 8.0,
                        "priority": "HIGH",
                        "snapshot": snapshot,
                    }
                )

            if clicks >= 30 and conv_rate < 2:
                recommendations.append(
                    {
                        "campaign_name": campaign_name,
                        "suggestion": (
                            f"Conversion rate is {snapshot['conv_rate']}% across {clicks} clicks. "
                            "Tighten keyword match types, add negatives, and align landing pages to queries to improve conversions."
                        ),
                        "action_proposal": "Refine targeting and landing pages to raise conversion rate above 3%.",
                        "predicted_impact": 10.0,
                        "priority": "HIGH",
                        "snapshot": snapshot,
                    }
                )

            if conversions and cpa and cpa > 50:
                recommendations.append(
                    {
                        "campaign_name": campaign_name,
                        "suggestion": (
                            f"Cost per conversion is {_format_money(snapshot['cpa'], currency_code)} with {int(conversions)} conversions. "
                            "Lower bids on expensive keywords and shift budget toward high-intent segments to reduce CPA."
                        ),
                        "action_proposal": "Apply bid adjustments and budget reallocation to cut CPA by 15-20%.",
                        "predicted_impact": 9.0,
                        "priority": "MEDIUM",
                        "snapshot": snapshot,
                    }
                )

            if conversions >= 3 and ctr_value >= 3 and conv_rate >= 4:
                recommendations.append(
                    {
                        "campaign_name": campaign_name,
                        "suggestion": (
                            f"Strong performance detected (CTR {snapshot['ctr']}%, CVR {snapshot['conv_rate']}%). "
                            "Gradually increase budget 10-15% and expand winning keywords to capture more conversions."
                        ),
                        "action_proposal": "Scale budget and duplicate top ad groups with similar audiences.",
                        "predicted_impact": 12.0,
                        "priority": "MEDIUM",
                        "snapshot": snapshot,
                    }
                )

            if impressions > 0 and clicks == 0:
                recommendations.append(
                    {
                        "campaign_name": campaign_name,
                        "suggestion": (
                            f"{impressions} impressions with zero clicks. Keywords may be misaligned with intent; "
                            "test broader variations and ensure ad extensions are active to earn initial traffic."
                        ),
                        "action_proposal": "Add sitelinks/callouts and adjust keyword themes to drive first clicks.",
                        "predicted_impact": 6.0,
                        "priority": "LOW",
                        "snapshot": snapshot,
                    }
                )

            if search_impression_share and search_impression_share < 40:
                recommendations.append(
                    {
                        "campaign_name": campaign_name,
                        "suggestion": (
                            "Low auction visibility (search impression share under 40%). "
                            "Raise budgets or improve Quality Score to win more auctions."
                        ),
                        "action_proposal": (
                            "Increase daily budget or boost ad relevance/landing page experience "
                            "to recover lost impression share."
                        ),
                        "predicted_impact": 7.0,
                        "priority": "MEDIUM",
                        "snapshot": snapshot,
                    }
                )

            if budget_lost_share and budget_lost_share > 15 and conversions >= 1:
                recommendations.append(
                    {
                        "campaign_name": campaign_name,
                        "suggestion": (
                            f"{budget_lost_share:.1f}% impressions lost to budget despite {conversions:.0f} conversions. "
                            "Loosen the budget cap to capture more volume."
                        ),
                        "action_proposal": "Increase budget or redistribute spend from low performers to this campaign.",
                        "predicted_impact": 8.5,
                        "priority": "HIGH",
                        "snapshot": snapshot,
                    }
                )

            if rank_lost_share and rank_lost_share > 25 and ctr_value < 3:
                recommendations.append(
                    {
                        "campaign_name": campaign_name,
                        "suggestion": (
                            f"{rank_lost_share:.1f}% impression share lost to rank with CTR {snapshot['ctr']}%. "
                            "Improve ad relevance and landing pages to raise Quality Score."
                        ),
                        "action_proposal": "Tighten keywords, refresh ad copy, and ensure landing page experience aligns with queries.",
                        "predicted_impact": 7.5,
                        "priority": "MEDIUM",
                        "snapshot": snapshot,
                    }
                )

            if target_cpa and cpa and cpa > target_cpa * 1.2:
                recommendations.append(
                    {
                        "campaign_name": campaign_name,
                        "suggestion": (
                            f"CPA {snapshot['cpa']} exceeds Target CPA {target_cpa:.2f}. "
                            "Tighten targeting and exclude expensive queries to realign with target."
                        ),
                        "action_proposal": "Add negatives, pause low-quality keywords, and lower bids on costly segments.",
                        "predicted_impact": 9.0,
                        "priority": "HIGH",
                        "snapshot": snapshot,
                    }
                )

            strategy_type = snapshot.get("bidding_strategy_type") or ""
            if strategy_type in {"MANUAL_CPC", "ENHANCED_CPC"} and conversions >= 15:
                recommendations.append(
                    {
                        "campaign_name": campaign_name,
                        "suggestion": (
                            "Sufficient conversion volume detected. Switch from manual bidding to Smart Bidding "
                            "(Maximize Conversions/Target CPA) to automate bid optimization."
                        ),
                        "action_proposal": "Test Maximize Conversions with a learning period, then layer a Target CPA.",
                        "predicted_impact": 8.0,
                        "priority": "MEDIUM",
                        "snapshot": snapshot,
                    }
                )

            opt_score = snapshot.get("optimization_score")
            if opt_score and opt_score < 60:
                recommendations.append(
                    {
                        "campaign_name": campaign_name,
                        "suggestion": (
                            f"Optimization Score is {opt_score:.0f}%. Apply Google Ads recommendations (ad strength, sitelinks, conversions) to lift score."
                        ),
                        "action_proposal": "Review auto-applied recommendations and enable high-confidence items like sitelinks and callouts.",
                        "predicted_impact": 6.0,
                        "priority": "LOW",
                        "snapshot": snapshot,
                    }
                )

            if daily_budget and cost and cost >= daily_budget * 0.95 and conv_rate >= 3:
                recommendations.append(
                    {
                        "campaign_name": campaign_name,
                        "suggestion": (
                            "Campaign is consistently hitting daily budget with healthy conversion rate. "
                            "Consider scaling budget to avoid throttling."
                        ),
                        "action_proposal": "Raise budget 10-20% and monitor CPA stability over the next week.",
                        "predicted_impact": 7.5,
                        "priority": "MEDIUM",
                        "snapshot": snapshot,
                    }
                )

    # Asset-level recommendations (creative quality/coverage)
    for perf in asset_performance:
        if perf["impressions"] >= 80 and perf["ctr"] < 1:
            recommendations.append(
                {
                    "campaign_name": perf["campaign_name"],
                    "suggestion": (
                        f"Asset '{perf['asset_name']}' has CTR {perf['ctr']}% over {perf['impressions']} impressions. "
                        "Refresh creative or test new variations to improve engagement."
                    ),
                    "action_proposal": "Create alternate headlines/descriptions and rotate responsive ads to find stronger assets.",
                    "predicted_impact": 5.5,
                    "priority": "LOW",
                    "snapshot": perf,
                }
            )

        if perf["conversions"] >= 3 and perf["conv_rate"] >= 5:
            recommendations.append(
                {
                    "campaign_name": perf["campaign_name"],
                    "suggestion": (
                        f"Asset '{perf['asset_name']}' converts well (CVR {perf['conv_rate']}%). "
                        "Pin or reuse this asset in top ad groups to scale results."
                    ),
                    "action_proposal": "Duplicate high-performing assets into other campaigns/ad groups and prioritize placements.",
                    "predicted_impact": 6.5,
                    "priority": "MEDIUM",
                    "snapshot": perf,
                }
            )

    asset_types: list[str] = []
    for batch in asset_rows:
        for row in batch.get("results", []):
            asset = row.get("asset", {})
            asset_type = asset.get("type")
            if asset_type:
                asset_types.append(asset_type)
    if asset_types and "YOUTUBE_VIDEO" not in asset_types:
        recommendations.append(
            {
                "campaign_name": "Account-level",
                "suggestion": "No video assets detected. Add YouTube or video creatives to improve ad strength and coverage.",
                "action_proposal": "Create at least one vertical and one horizontal video to unlock additional placements.",
                "predicted_impact": 4.5,
                "priority": "LOW",
                "snapshot": {"asset_types": asset_types},
            }
        )

    created: list[Recommendation] = []
    for rec in recommendations:
        created_rec = Recommendation(
            client_id=client_db_id,
            campaign_name=rec["campaign_name"],
            suggestion=rec["suggestion"],
            data_snapshot=json.dumps(rec["snapshot"]),
            customer_id=customer_id,
            predicted_impact=rec.get("predicted_impact"),
            action_proposal=rec.get("action_proposal"),
            priority=rec.get("priority", "MEDIUM"),
            status="PENDING",
        )
        created.append(created_rec)
        logger.info(
            "Generated recommendation for %s: %s",
            rec["campaign_name"],
            rec["suggestion"],
        )

    if created:
        db.add_all(created)
        db.commit()

    return recommendations


# -------------------- STEP 1: REFRESH ACCESS TOKEN --------------------
def refresh_access_token(
    refresh_token: str,
    *,
    google_client_id: str | None = None,
    google_client_secret: str | None = None,
) -> str:
    """
    Refresh the access token using stored refresh token.
    """
    client_id = google_client_id or os.getenv("GOOGLE_CLIENT_ID")
    client_secret = google_client_secret or os.getenv("GOOGLE_CLIENT_SECRET")

    if not all([client_id, client_secret, refresh_token]):
        raise HTTPException(
            status_code=400,
            detail="Missing Google OAuth credentials required for token refresh",
        )

    payload = {
        "client_id": client_id,
        "client_secret": client_secret,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }

    logger.info(
        "Refreshing Google access token — payload keys: %s", list(payload.keys())
    )
    try:
        response = requests.post(GOOGLE_TOKEN_URL, data=payload, timeout=15)
    except Exception as e:
        logger.exception("Exception while contacting Google token endpoint")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to contact Google token endpoint: {e}",
        )

    logger.info("Google token endpoint returned status %s", response.status_code)
    try:
        body = response.json()
    except Exception:
        body = response.text

    logger.info("Google token endpoint response body: %s", body)

    if response.status_code != 200:
        try:
            error_detail = response.json()
        except ValueError:
            error_detail = response.text
        logger.error("❌ Failed to refresh token: %s", error_detail)
        raise HTTPException(
            status_code=400,
            detail=f"Failed to refresh Google token: {error_detail}",
        )

    data = response.json()
    access_token = data.get("access_token")
    if not access_token:
        logger.error("No access_token present in Google response: %s", data)
        raise HTTPException(
            status_code=400,
            detail=f"Failed to refresh Google token (no access_token): {data}",
        )

    logger.info("Access token refreshed successfully (expires_in=%s)", data.get("expires_in"))
    return access_token


# -------------------- STEP 2: RUN GOOGLE ADS QUERY --------------------
def run_google_ads_query(
    access_token: str,
    customer_id: str,
    query: str,
    developer_token: str | None = None,
    login_customer_id: str | None = None,
):
    customer_id_clean = "".join(ch for ch in str(customer_id) if ch.isdigit())
    login_customer_id_clean = (
        "".join(ch for ch in str(login_customer_id) if ch.isdigit())
        if login_customer_id
        else None
    )

    headers = {
        "Authorization": f"Bearer {access_token}",
        "developer-token": developer_token or os.getenv("DEVELOPER_TOKEN"),
        "login-customer-id": "4395201423",  # MCC account ID
        "Content-Type": "application/json",
    }
    if login_customer_id_clean:
        headers["login-customer-id"] = login_customer_id_clean

    url = f"{GOOGLE_ADS_SEARCH_URL}/{customer_id_clean}/googleAds:searchStream"

    logger.info(
        "📡 Calling Google Ads API: url=%s customer_id=%s login_customer_id=%s",
        url,
        customer_id_clean,
        login_customer_id_clean,
    )

    try:
        response = requests.post(
            url,
            headers=headers,
            json={"query": query},
            timeout=5000,
        )
        response.raise_for_status()
        logger.info(
            "✅ Google Ads query OK. customer_id=%s login_customer_id=%s",
            customer_id_clean,
            login_customer_id_clean,
        )
        return response.json()
    except requests.HTTPError as e:
        logger.error(
            "❌ Google Ads API query failed (HTTP %s): %s\n"
            "customer_id=%s login_customer_id=%s\n"
            "URL=%s\nQuery=%s\nBody=%s",
            response.status_code if "response" in locals() else "N/A",
            e,
            customer_id_clean,
            login_customer_id_clean,
            url,
            query,
            getattr(response, "text", ""),
        )
        raise HTTPException(status_code=500, detail=f"Google Ads query failed: {e}")
    except Exception as e:
        logger.error(
            "❌ Google Ads API query failed (non-HTTP): %s\n"
            "customer_id=%s login_customer_id=%s\nURL=%s\nQuery=%s",
            e,
            customer_id_clean,
            login_customer_id_clean,
            url,
            query,
        )
        raise HTTPException(status_code=500, detail=f"Google Ads query failed: {e}")


# -------------------- STEP 3: OLD SAVE (kept for reference; unused) --------------------
def _parse_ga_date(date_str: str):
    return datetime.strptime(date_str, "%Y-%m-%d").date()


def save_campaign_data(db: Session, client_db_id: int, response_data):
    """
    (Legacy) Parse Google Ads API data and save/update Campaign records.
    Not used now, kept just in case.
    """
    saved_count = 0
    for batch in response_data:
        for row in batch.get("results", []):
            cname = row["campaign"]["name"]
            impressions = int(row["metrics"].get("impressions", 0))
            clicks = int(row["metrics"].get("clicks", 0))
            conversions = int(row["metrics"].get("conversions", 0))
            ctr = float(row["metrics"].get("ctr", 0))

            average_cpc_micros = float(row["metrics"].get("averageCpc", 0))
            average_cpc = average_cpc_micros / 1_000_000 if average_cpc_micros else 0.0

            conversion_value = float(row["metrics"].get("conversionsValue", 0.0))
            cost_micros = int(row["metrics"].get("costMicros", 0))
            cost_per_conversion_micros = float(
                row["metrics"].get("costPerConversion", 0)
            )
            cost_per_conversion = (
                cost_per_conversion_micros / 1_000_000 if cost_per_conversion_micros else 0.0
            )

            campaign_date_str = row["segments"]["date"]
            campaign_date = _parse_ga_date(campaign_date_str)

            existing = (
                db.query(Campaign)
                .filter(
                    Campaign.name == cname,
                    Campaign.client_id == client_db_id,
                    Campaign.date == campaign_date,
                )
                .first()
            )

            if existing:
                existing.impressions = impressions
                existing.clicks = clicks
                existing.conversions = conversions
                existing.ctr = ctr
                existing.average_cpc = average_cpc
                existing.cost = cost_micros / 1_000_000
                existing.conversion_value = conversion_value
                existing.cost_per_conversion = cost_per_conversion
            else:
                new_campaign = Campaign(
                    client_id=client_db_id,
                    name=cname,
                    impressions=impressions,
                    clicks=clicks,
                    conversions=conversions,
                    ctr=ctr,
                    average_cpc=average_cpc,
                    cost=cost_micros / 1_000_000,
                    conversion_value=conversion_value,
                    cost_per_conversion=cost_per_conversion,
                    date=campaign_date,
                )
                db.add(new_campaign)
                saved_count += 1

    db.commit()
    return saved_count


# -------------------- STEP 4A: CUSTOMER ID + CREDENTIALS --------------------
def _select_customer_id(client_record: Client, override: str | None) -> str | None:
    """Validate and pick the customer ID to use for API calls."""

    normalized_override = (
        "".join(ch for ch in str(override) if ch.isdigit()) if override else None
    )

    stored_ids: list[str] = []
    if getattr(client_record, "customer_ids", None):
        stored_ids = [
            "".join(ch for ch in str(cid) if ch.isdigit())
            for cid in client_record.customer_ids
            if str(cid).strip()
        ]
    elif client_record.customer_id:
        digits_only = "".join(
            ch for ch in str(client_record.customer_id) if ch.isdigit()
        )
        if digits_only:
            stored_ids.append(digits_only)

    if normalized_override:
        if stored_ids and normalized_override not in stored_ids:
            raise HTTPException(
                status_code=400,
                detail="Selected customer ID is not linked to this client",
            )
        return normalized_override

    if stored_ids:
        return stored_ids[0]

    return None


def _resolve_google_ads_credentials(
    db: Session, client_db_id: int, customer_id: str | None = None
):
    """Return all Google Ads credentials associated with a client."""

    client_record = db.query(Client).filter(Client.id == client_db_id).first()

    account = (
        db.query(GoogleAdsAccount)
        .filter(GoogleAdsAccount.client_id == client_db_id)
        .first()
    )

    selected_customer_id = (
        _select_customer_id(client_record, customer_id)
        if client_record
        else ("".join(ch for ch in str(customer_id) if ch.isdigit()) if customer_id else None)
    )

    if account and account.refresh_token:
        login_customer_id = account.login_customer_id or os.getenv("LOGIN_CUSTOMER_ID")
        developer_token = account.developer_token or os.getenv("DEVELOPER_TOKEN")
        return {
            "refresh_token": account.refresh_token,
            "login_customer_id": login_customer_id,
            "customer_id": selected_customer_id or account.customer_id,
            "developer_token": developer_token,
            "google_client_id": account.google_client_id,
            "google_client_secret": account.google_client_secret,
            "currency_code": getattr(client_record, "currency_code", "USD"),
        }

    if client_record and client_record.refresh_token:
        login_customer_id = client_record.login_customer_id or os.getenv("LOGIN_CUSTOMER_ID")
        return {
            "refresh_token": client_record.refresh_token,
            "login_customer_id": login_customer_id,
            "customer_id": selected_customer_id,
            "developer_token": client_record.developer_token,
            "google_client_id": client_record.client_id,
            "google_client_secret": client_record.client_secret,
            "currency_code": getattr(client_record, "currency_code", "USD"),
        }

    return None


# -------------------- STEP 4A: MAIN FETCH & SAVE --------------------
def fetch_and_save_campaigns(
    db: Session,
    client_db_id: int,
    start_date: str,
    end_date: str,
    customer_id: str | None = None,
):
    """
    Fetch Google Ads campaign data and related assets/conversions/bidding
    for a user-selected date range and save into DB.
    """
    logger.info(
        "📅 Fetching Google Ads data for client=%s (%s → %s)",
        client_db_id,
        start_date,
        end_date,
    )

    credentials = _resolve_google_ads_credentials(db, client_db_id, customer_id)
    if not credentials:
        return {"error": "❌ No connected Google Ads account or missing refresh token"}

    refresh_token = credentials["refresh_token"]
    login_customer_id = credentials.get("login_customer_id")
    raw_customer_id = credentials.get("customer_id")
    # customer_id = credentials.get("customer_id")
    developer_token = credentials.get("developer_token")
    currency_code = credentials.get("currency_code", "USD")

    access_token = refresh_access_token(
        refresh_token,
        google_client_id=credentials.get("google_client_id"),
        google_client_secret=credentials.get("google_client_secret"),
    )

    # customer_id = customer_id or login_customer_id or os.getenv("LOGIN_CUSTOMER_ID")
    # if not customer_id:
    #     raise HTTPException(
    #         status_code=400,
    #         detail="Missing login_customer_id for Google Ads request",
    #     )
     # -------------------- RESOLVE EFFECTIVE CUSTOMER --------------------
    # We MUST query the *client* account (customer_id) to match the UI numbers.
    # raw_customer_id = credentials.get("customer_id")
    # if not raw_customer_id:
    #     raise HTTPException(
    #         status_code=400,
    #         detail="Missing customer_id for Google Ads request. "
    #                "Please ensure the client's Google Ads customer ID is stored.",
    #     )

    # # Clean IDs (remove dashes/spaces for safety; Google accepts either but we keep it clean)
    # customer_id = "".join(ch for ch in str(raw_customer_id) if ch.isdigit())
    # login_customer_id_clean = (
    #     "".join(ch for ch in str(login_customer_id) if ch.isdigit())
    #     if login_customer_id
    #     else None
    # )

    if not raw_customer_id:
        raise HTTPException(
            status_code=400,
            detail="Missing customer_id for Google Ads request. "
                   "Ensure the client's Google Ads customer ID is stored.",
        )
    customer_id_clean = "".join(ch for ch in str(raw_customer_id) if ch.isdigit())

    # manager / MCC account we call *through*
    raw_login_customer_id = (
        login_customer_id
        or os.getenv("LOGIN_CUSTOMER_ID")
    )
    if not raw_login_customer_id:
        raise HTTPException(
            status_code=400,
            detail=(
                "Missing login_customer_id (MCC id). Google requires a manager customer id "
                "in the 'login-customer-id' header when accessing a client customer. "
                "Set LOGIN_CUSTOMER_ID env or store login_customer_id in GoogleAdsAccount."
            ),
        )

    login_customer_id_clean = "".join(
        ch for ch in str(raw_login_customer_id) if ch.isdigit()
    )

    # -------------------- GAQL QUERIES --------------------
    campaign_query = f"""
        SELECT
          campaign.id,
          campaign.resource_name,
          campaign.name,
          campaign.status,
          campaign.advertising_channel_type,
          campaign.advertising_channel_sub_type,
          campaign.bidding_strategy_type,
          campaign.bidding_strategy,
          campaign.campaign_budget,
          campaign_budget.amount_micros,
          campaign.start_date,
          campaign.end_date,
          campaign.serving_status,
          campaign.optimization_score,

          metrics.impressions,
          metrics.clicks,
          metrics.ctr,
          metrics.average_cpc,
          metrics.conversions,
          metrics.conversions_value,
          metrics.all_conversions,
          metrics.all_conversions_value,
          metrics.view_through_conversions,
          metrics.cost_micros,
          metrics.cost_per_conversion,
          metrics.search_impression_share,
          metrics.search_budget_lost_impression_share,
          metrics.search_rank_lost_impression_share,

          segments.date
        FROM campaign
        WHERE segments.date BETWEEN '{start_date}' AND '{end_date}'
        ORDER BY segments.date
    """

    asset_query = """
        SELECT
          asset.id,
          asset.resource_name,
          asset.name,
          asset.type,
          asset.source,
          asset.text_asset.text,
          asset.image_asset.full_size.url,
          asset.image_asset.file_size,
          asset.youtube_video_asset.youtube_video_id,
          asset.youtube_video_asset.youtube_video_title,
          asset.call_to_action_asset.call_to_action
        FROM asset
    """

    campaign_asset_query = f"""
        SELECT
          campaign_asset.resource_name,
          campaign_asset.status,
          campaign_asset.field_type,

          campaign.id,
          campaign.resource_name,
          campaign.name,
          campaign.advertising_channel_type,

          asset.id,
          asset.resource_name,
          asset.name,
          asset.type,

          metrics.impressions,
          metrics.clicks,
          metrics.conversions,
          metrics.conversions_value,
          metrics.cost_micros,
          segments.date
        FROM campaign_asset
        WHERE segments.date BETWEEN '{start_date}' AND '{end_date}'
    """

    asset_set_query = """
        SELECT
          asset_set.id,
          asset_set.resource_name,
          asset_set.name,
          asset_set.type,
          asset_set.status
        FROM asset_set
    """

    asset_set_asset_query = """
        SELECT
          asset_set_asset.resource_name,
          asset_set_asset.status,
          asset_set.id,
          asset_set.resource_name,
          asset_set.name,
          asset_set.type,
          asset.id,
          asset.resource_name,
          asset.name,
          asset.type
        FROM asset_set_asset
    """

    campaign_asset_set_query = """
        SELECT
          campaign_asset_set.resource_name,
          campaign_asset_set.status,
          campaign.id,
          campaign.resource_name,
          campaign.name,
          asset_set.id,
          asset_set.resource_name,
          asset_set.name,
          asset_set.type
        FROM campaign_asset_set
    """

    customer_asset_set_query = """
        SELECT
          customer_asset_set.resource_name,
          customer_asset_set.status,
          asset_set.id,
          asset_set.resource_name,
          asset_set.name,
          asset_set.type
        FROM customer_asset_set
    """

    conversion_action_query = """
        SELECT
          conversion_action.id,
          conversion_action.resource_name,
          conversion_action.name,
          conversion_action.type,
          conversion_action.category,
          conversion_action.origin,
          conversion_action.status,
          conversion_action.include_in_conversions_metric,
          conversion_action.primary_for_goal,
          conversion_action.value_settings.default_value,
          conversion_action.value_settings.always_use_default_value
        FROM conversion_action
    """

    campaign_conversion_by_action_query = f"""
        SELECT
          campaign.id,
          campaign.resource_name,
          campaign.name,
          segments.date,
          segments.conversion_action,
          metrics.conversions,
          metrics.conversions_value,
          metrics.all_conversions,
          metrics.all_conversions_value,
          metrics.view_through_conversions
        FROM campaign
        WHERE segments.date BETWEEN '{start_date}' AND '{end_date}'
    """

    bidding_strategy_query = """
        SELECT
          bidding_strategy.id,
          bidding_strategy.resource_name,
          bidding_strategy.name,
          bidding_strategy.type,
          bidding_strategy.status,
          bidding_strategy.target_cpa.target_cpa_micros,
          bidding_strategy.target_roas.target_roas,
          bidding_strategy.maximize_conversions.target_cpa_micros,
          bidding_strategy.maximize_conversion_value.target_roas
        FROM bidding_strategy
    """

    # -------------------- EXECUTE QUERIES --------------------
    common_kwargs = {
        "access_token": access_token,
        "customer_id": customer_id_clean,
        "developer_token": developer_token,
        "login_customer_id": login_customer_id_clean,
    }

    campaign_rows = run_google_ads_query(
        query=campaign_query,
        **common_kwargs,
    )

    asset_rows = run_google_ads_query(
        query=asset_query,
        **common_kwargs,
    )

    campaign_asset_rows = run_google_ads_query(
        query=campaign_asset_query,
        **common_kwargs,
    )

    asset_set_rows = run_google_ads_query(
        query=asset_set_query,
        **common_kwargs,
    )

    asset_set_asset_rows = run_google_ads_query(
        query=asset_set_asset_query,
        **common_kwargs,
    )

    campaign_asset_set_rows = run_google_ads_query(
        query=campaign_asset_set_query,
        **common_kwargs,
    )

    customer_asset_set_rows = run_google_ads_query(
        query=customer_asset_set_query,
        **common_kwargs,
    )

    conversion_action_rows = run_google_ads_query(
        query=conversion_action_query,
        **common_kwargs,
    )

    campaign_conv_by_action_rows = run_google_ads_query(
        query=campaign_conversion_by_action_query,
        **common_kwargs,
    )

    bidding_strategy_rows = run_google_ads_query(
        query=bidding_strategy_query,
        **common_kwargs,
    )

    # -------------------- CLEAR OLD CAMPAIGNS --------------------
    # db.query(Campaign).filter(Campaign.client_id == client_db_id).delete()
    # db.commit()

    db.query(CampaignAssetPerformance).filter(
        CampaignAssetPerformance.client_id == client_db_id
    ).delete()
    db.query(CampaignConversionStat).filter(
        CampaignConversionStat.client_id == client_db_id
    ).delete()
    db.commit()

    # 2) Now it's safe to delete the campaigns
    db.query(Campaign).filter(Campaign.client_id == client_db_id).delete()
    db.commit()

    # -------------------- SAVE DATA --------------------
    save_campaigns_from_rows(db, client_db_id, campaign_rows)
    save_assets_from_rows(db, client_db_id, asset_rows)
    save_campaign_assets_from_rows(db, client_db_id, campaign_asset_rows)
    save_asset_sets_from_rows(
        db,
        client_db_id,
        asset_set_rows,
        asset_set_asset_rows,
        campaign_asset_set_rows,
        customer_asset_set_rows,
    )
    save_conversion_actions_from_rows(db, client_db_id, conversion_action_rows)
    save_campaign_conversion_stats_from_rows(
        db,
        client_db_id,
        campaign_conv_by_action_rows,
    )
    save_bidding_strategies_from_rows(db, client_db_id, bidding_strategy_rows)

    # 🔁 Build AI recommendations using the same searchStream data
    generated_recs = _build_recommendations_from_metrics(
        db,
        client_db_id,
        campaign_rows,
        currency_code=currency_code,
        customer_id=customer_id,
        asset_rows=asset_rows,
        campaign_asset_rows=campaign_asset_rows,
        bidding_strategy_rows=bidding_strategy_rows,
    )

    return {
        "status": "success",
        "period": f"{start_date} → {end_date}",
        "message": f"✅ Google Ads data fetched and saved between {start_date} and {end_date}",
        "recommendations_generated": len(generated_recs),
        "recommendation_summaries": [rec.get("suggestion") for rec in generated_recs],
        "currency_code": currency_code,
        "fetched_counts": {
            "campaign_rows": len(campaign_rows),
            "asset_rows": len(asset_rows),
            "campaign_asset_rows": len(campaign_asset_rows),
            "asset_set_rows": len(asset_set_rows),
            "asset_set_asset_rows": len(asset_set_asset_rows),
            "campaign_asset_set_rows": len(campaign_asset_set_rows),
            "customer_asset_set_rows": len(customer_asset_set_rows),
            "conversion_action_rows": len(conversion_action_rows),
            "campaign_conv_by_action_rows": len(campaign_conv_by_action_rows),
            "bidding_strategy_rows": len(bidding_strategy_rows),
        },
    }


# -------------------- STEP 4B: DAILY AUTO FETCH --------------------
def fetch_and_save_daily_campaigns(
    db: Session, client_db_id: int, customer_id: str | None = None
):
    """
    ✅ Automatically fetch today's Google Ads data (based on current date)
    """
    today = date.today().strftime("%Y-%m-%d")
    logger.info("📆 Auto fetching Google Ads data for %s", today)
    return fetch_and_save_campaigns(db, client_db_id, today, today, customer_id)
