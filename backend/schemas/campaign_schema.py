from pydantic import BaseModel, ConfigDict
from typing import Optional

# ✅ Request schema (for creating or updating campaigns)
class CampaignCreate(BaseModel):
    name: str
    impressions: Optional[int] = 0
    clicks: Optional[int] = 0
    cost: Optional[float] = 0.0
    conversions: Optional[int] = 0
    client_id: int

# ✅ Response schema (for reading campaign data)
class CampaignResponse(BaseModel):
    id: int
    name: str
    impressions: int
    clicks: int
    cost: float
    conversions: int
    client_id: int

    model_config = ConfigDict(from_attributes=True)
