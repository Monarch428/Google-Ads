# services/google_ads_sync_helpers.py

from datetime import datetime
from sqlalchemy.orm import Session

from models.campaign_model import Campaign
from models.asset_model import Asset
from models.campaign_asset_performance import CampaignAssetPerformance
from models.asset_set_model import AssetSet
from models.asset_set_asset_model import AssetSetAsset
from models.campaign_asset_set_link import CampaignAssetSetLink
from models.customer_asset_set_link import CustomerAssetSetLink
from models.conversion_action_model import ConversionAction
from models.campaign_conversion_stat import CampaignConversionStat
from models.bidding_strategy_model import BiddingStrategy


def _parse_date(value: str | None):
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except Exception:
        return None


def save_campaigns_from_rows(db: Session, client_id: int, rows: list[dict]):
    """
    rows = searchStream response from campaign_query:
    [
      { "results": [ { "campaign": {...}, "metrics": {...}, "segments": {...} }, ... ] },
      ...
    ]
    """
    for batch in rows:
        for row in batch.get("results", []):
            campaign = row.get("campaign", {})
            metrics = row.get("metrics", {})
            segments = row.get("segments", {})

            google_id = str(campaign.get("id")) if campaign.get("id") is not None else None
            resource_name = campaign.get("resourceName") or campaign.get("resource_name")

            date_val = _parse_date(segments.get("date"))

            average_cpc_micros = metrics.get("averageCpc", 0) or 0
            average_cpc = average_cpc_micros / 1_000_000

            cost_micros = metrics.get("costMicros", 0) or 0
            cost = cost_micros / 1_000_000

            obj = Campaign(
                client_id=client_id,
                google_campaign_id=google_id,
                resource_name=resource_name,
                name=campaign.get("name") or "Unnamed campaign",
                status=campaign.get("status"),
                advertising_channel_type=campaign.get("advertisingChannelType"),
                advertising_channel_sub_type=campaign.get("advertisingChannelSubType"),
                bidding_strategy_type=campaign.get("biddingStrategyType"),
                bidding_strategy_resource_name=campaign.get("biddingStrategy"),
                campaign_budget_resource_name=campaign.get("campaignBudget"),
                start_date=_parse_date(campaign.get("startDate")),
                end_date=_parse_date(campaign.get("endDate")),
                serving_status=campaign.get("servingStatus"),
                optimization_score=campaign.get("optimizationScore"),
                impressions=metrics.get("impressions", 0),
                clicks=metrics.get("clicks", 0),
                conversions=metrics.get("conversions", 0.0),
                ctr=metrics.get("ctr", 0.0),
                average_cpc=average_cpc,
                cost=cost,
                conversion_value=metrics.get("conversionsValue", 0.0)
                or metrics.get("conversionsValue", 0.0),
                cost_per_conversion=metrics.get("costPerConversion", 0.0),
                all_conversions=metrics.get("allConversions", 0.0),
                all_conversions_value=metrics.get("allConversionsValue", 0.0),
                view_through_conversions=metrics.get("viewThroughConversions", 0.0),
                date=date_val,
            )
            db.add(obj)

    db.commit()


def save_assets_from_rows(db: Session, client_id: int, rows: list[dict]):
    """
    rows = searchStream response from asset_query.
    """
    for batch in rows:
        for row in batch.get("results", []):
            asset = row.get("asset", row)
            google_id = str(asset.get("id")) if asset.get("id") is not None else None
            resource_name = asset.get("resourceName") or asset.get("resource_name")

            existing = (
                db.query(Asset)
                .filter(
                    Asset.client_id == client_id,
                    Asset.resource_name == resource_name,
                )
                .one_or_none()
            )

            if existing:
                obj = existing
            else:
                obj = Asset(client_id=client_id, resource_name=resource_name)
                db.add(obj)

            obj.google_asset_id = google_id
            obj.name = asset.get("name")
            obj.type = asset.get("type")
            obj.source = asset.get("source")

            # Text
            obj.text = (asset.get("textAsset") or {}).get("text") or asset.get("text")

            # Image
            image_asset = asset.get("imageAsset", {})
            full_size = image_asset.get("fullSize") or {}
            obj.image_url = full_size.get("url") or image_asset.get("url")
            obj.image_file_size = image_asset.get("fileSize")

            # YouTube
            yt = asset.get("youtubeVideoAsset", {})
            obj.youtube_video_id = yt.get("youtubeVideoId")
            obj.youtube_video_title = yt.get("youtubeVideoTitle")

            # CTA
            cta = asset.get("callToActionAsset", {})
            obj.call_to_action = cta.get("callToAction") or asset.get("callToAction")

    db.commit()


def save_campaign_assets_from_rows(db: Session, client_id: int, rows: list[dict]):
    """
    rows = searchStream response from campaign_asset_query.
    """
    db.query(CampaignAssetPerformance).filter(
        CampaignAssetPerformance.client_id == client_id
    ).delete()
    db.commit()

    campaigns_by_resource = {
        c.resource_name: c
        for c in db.query(Campaign).filter(Campaign.client_id == client_id).all()
    }
    assets_by_resource = {
        a.resource_name: a
        for a in db.query(Asset).filter(Asset.client_id == client_id).all()
    }

    for batch in rows:
        for row in batch.get("results", []):
            ca = row.get("campaignAsset", row.get("campaign_asset", {}))
            campaign = row.get("campaign", {})
            asset = row.get("asset", {})
            metrics = row.get("metrics", {})
            segments = row.get("segments", {})

            campaign_res = campaign.get("resourceName") or campaign.get("resource_name")
            asset_res = asset.get("resourceName") or asset.get("resource_name")

            campaign_obj = campaigns_by_resource.get(campaign_res)
            asset_obj = assets_by_resource.get(asset_res)

            if not campaign_obj or not asset_obj:
                continue

            cap = CampaignAssetPerformance(
                client_id=client_id,
                campaign_id=campaign_obj.id,
                asset_id=asset_obj.id,
                campaign_asset_resource_name=ca.get("resourceName") or ca.get("resource_name"),
                status=ca.get("status"),
                field_type=ca.get("fieldType"),
                date=_parse_date(segments.get("date")),
                impressions=metrics.get("impressions", 0),
                clicks=metrics.get("clicks", 0),
                conversions=metrics.get("conversions", 0.0),
                conversions_value=metrics.get("conversionsValue", 0.0),
                view_through_conversions=metrics.get("viewThroughConversions", 0.0),
                cost_micros=metrics.get("costMicros", 0),
            )
            db.add(cap)

    db.commit()


def save_asset_sets_from_rows(
    db: Session,
    client_id: int,
    asset_set_rows: list[dict],
    asset_set_asset_rows: list[dict],
    campaign_asset_set_rows: list[dict],
    customer_asset_set_rows: list[dict],
):
    # Clear old data
    db.query(AssetSetAsset).filter(AssetSetAsset.client_id == client_id).delete()
    db.query(CampaignAssetSetLink).filter(CampaignAssetSetLink.client_id == client_id).delete()
    db.query(CustomerAssetSetLink).filter(CustomerAssetSetLink.client_id == client_id).delete()
    db.query(AssetSet).filter(AssetSet.client_id == client_id).delete()
    db.commit()

    assets_by_resource = {
        a.resource_name: a
        for a in db.query(Asset).filter(Asset.client_id == client_id).all()
    }

    # 1) Asset sets
    asset_sets_by_resource = {}
    for batch in asset_set_rows:
        for row in batch.get("results", []):
            aset = row.get("assetSet", row)
            google_id = aset.get("id")
            res = aset.get("resourceName") or aset.get("resource_name")

            obj = AssetSet(
                client_id=client_id,
                google_asset_set_id=str(google_id) if google_id is not None else None,
                resource_name=res,
                name=aset.get("name"),
                type=aset.get("type"),
                status=aset.get("status"),
            )
            db.add(obj)
            asset_sets_by_resource[res] = obj

    db.flush()

    # 2) AssetSetAsset links
    for batch in asset_set_asset_rows:
        for row in batch.get("results", []):
            asa = row.get("assetSetAsset", row.get("asset_set_asset", {}))
            aset = row.get("assetSet", row.get("asset_set", {}))
            asset = row.get("asset", {})

            aset_res = aset.get("resourceName") or aset.get("resource_name")
            asset_res = asset.get("resourceName") or asset.get("resource_name")

            aset_obj = asset_sets_by_resource.get(aset_res)
            asset_obj = assets_by_resource.get(asset_res)
            if not aset_obj or not asset_obj:
                continue

            obj = AssetSetAsset(
                client_id=client_id,
                asset_set_id=aset_obj.id,
                asset_id=asset_obj.id,
                resource_name=asa.get("resourceName") or asa.get("resource_name"),
                status=asa.get("status"),
            )
            db.add(obj)

    db.flush()

    campaigns_by_resource = {
        c.resource_name: c
        for c in db.query(Campaign).filter(Campaign.client_id == client_id).all()
    }

    # 3) CampaignAssetSet links
    for batch in campaign_asset_set_rows:
        for row in batch.get("results", []):
            cas = row.get("campaignAssetSet", row.get("campaign_asset_set", {}))
            aset = row.get("assetSet", row.get("asset_set", {}))
            camp = row.get("campaign", {})

            aset_res = aset.get("resourceName") or aset.get("resource_name")
            camp_res = camp.get("resourceName") or camp.get("resource_name")

            aset_obj = asset_sets_by_resource.get(aset_res)
            camp_obj = campaigns_by_resource.get(camp_res)
            if not aset_obj or not camp_obj:
                continue

            link = CampaignAssetSetLink(
                client_id=client_id,
                campaign_id=camp_obj.id,
                asset_set_id=aset_obj.id,
                resource_name=cas.get("resourceName") or cas.get("resource_name"),
                status=cas.get("status"),
            )
            db.add(link)

    # 4) CustomerAssetSet links
    for batch in customer_asset_set_rows:
        for row in batch.get("results", []):
            cas = row.get("customerAssetSet", row.get("customer_asset_set", {}))
            aset = row.get("assetSet", row.get("asset_set", {}))

            aset_res = aset.get("resourceName") or aset.get("resource_name")
            aset_obj = asset_sets_by_resource.get(aset_res)
            if not aset_obj:
                continue

            link = CustomerAssetSetLink(
                client_id=client_id,
                asset_set_id=aset_obj.id,
                resource_name=cas.get("resourceName") or cas.get("resource_name"),
                status=cas.get("status"),
            )
            db.add(link)

    db.commit()


def save_conversion_actions_from_rows(db: Session, client_id: int, rows: list[dict]):
    existing_by_res = {
        ca.resource_name: ca
        for ca in db.query(ConversionAction).filter(ConversionAction.client_id == client_id).all()
    }

    for batch in rows:
        for row in batch.get("results", []):
            ca = row.get("conversionAction", row)
            res = ca.get("resourceName") or ca.get("resource_name")
            if not res:
                continue

            obj = existing_by_res.get(res)
            if not obj:
                obj = ConversionAction(client_id=client_id, resource_name=res)
                db.add(obj)
                existing_by_res[res] = obj

            obj.google_conversion_action_id = (
                str(ca.get("id")) if ca.get("id") is not None else None
            )
            obj.name = ca.get("name")
            obj.type = ca.get("type")
            obj.category = ca.get("category")
            obj.origin = ca.get("origin")
            obj.status = ca.get("status")
            obj.include_in_conversions_metric = ca.get(
                "includeInConversionsMetric", True
            )
            obj.primary_for_goal = ca.get("primaryForGoal", False)

            vs = ca.get("valueSettings", {})
            obj.default_value = vs.get("defaultValue")
            obj.always_use_default_value = vs.get("alwaysUseDefaultValue", False)

    db.commit()


def save_campaign_conversion_stats_from_rows(
    db: Session,
    client_id: int,
    rows: list[dict],
):
    db.query(CampaignConversionStat).filter(
        CampaignConversionStat.client_id == client_id
    ).delete()
    db.commit()

    campaigns_by_resource = {
        c.resource_name: c
        for c in db.query(Campaign).filter(Campaign.client_id == client_id).all()
    }
    conv_actions_by_res = {
        ca.resource_name: ca
        for ca in db.query(ConversionAction).filter(ConversionAction.client_id == client_id).all()
    }

    for batch in rows:
        for row in batch.get("results", []):
            campaign = row.get("campaign", {})
            metrics = row.get("metrics", {})
            segments = row.get("segments", {})
            conv_action = row.get("conversionAction", row.get("conversion_action", {}))

            camp_res = campaign.get("resourceName") or campaign.get("resource_name")
            camp_obj = campaigns_by_resource.get(camp_res)
            if not camp_obj:
                continue

            conv_res = (
                conv_action.get("resourceName")
                or conv_action.get("resource_name")
                or segments.get("conversionAction")
            )
            conv_obj = conv_actions_by_res.get(conv_res)

            stat = CampaignConversionStat(
                client_id=client_id,
                campaign_id=camp_obj.id,
                conversion_action_id=conv_obj.id if conv_obj else None,
                conversion_action_resource_name=conv_res,
                date=_parse_date(segments.get("date")),
                conversions=metrics.get("conversions", 0.0),
                conversions_value=metrics.get("conversionsValue", 0.0),
                all_conversions=metrics.get("allConversions", 0.0),
                all_conversions_value=metrics.get("allConversionsValue", 0.0),
                view_through_conversions=metrics.get("viewThroughConversions", 0.0),
                cost_per_conversion=metrics.get("costPerConversion", 0.0),
                cost_per_all_conversions=metrics.get("costPerAllConversions", 0.0),
            )
            db.add(stat)

    db.commit()


def save_bidding_strategies_from_rows(db: Session, client_id: int, rows: list[dict]):
    existing_by_res = {
        b.resource_name: b
        for b in db.query(BiddingStrategy).filter(BiddingStrategy.client_id == client_id).all()
    }

    for batch in rows:
        for row in batch.get("results", []):
            bs = row.get("biddingStrategy", row)
            res = bs.get("resourceName") or bs.get("resource_name")
            if not res:
                continue

            obj = existing_by_res.get(res)
            if not obj:
                obj = BiddingStrategy(client_id=client_id, resource_name=res)
                db.add(obj)
                existing_by_res[res] = obj

            obj.google_bidding_strategy_id = (
                str(bs.get("id")) if bs.get("id") is not None else None
            )
            obj.name = bs.get("name")
            obj.type = bs.get("type")
            obj.status = bs.get("status")

            target_cpa = bs.get("targetCpa") or {}
            obj.target_cpa_micros = target_cpa.get("targetCpaMicros")

            target_roas = bs.get("targetRoas") or {}
            obj.target_roas = target_roas.get("targetRoas")

            max_conv = bs.get("maximizeConversions") or {}
            obj.maximize_conv_target_cpa_micros = max_conv.get("targetCpaMicros")

            max_conv_value = bs.get("maximizeConversionValue") or {}
            obj.maximize_conv_value_target_roas = max_conv_value.get("targetRoas")

    db.commit()
