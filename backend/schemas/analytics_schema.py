from pydantic import BaseModel

class CampaignAnalyticsRequest(BaseModel):
    campaign_name: str
    clicks: int
    impressions: int
    ctr: float
    cpc: float
    conversions: int
    budget: float


class CampaignAnalyticsResponse(BaseModel):
    status: str
    campaign_name: str
    suggestions: str
