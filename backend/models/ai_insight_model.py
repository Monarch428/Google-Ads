from sqlalchemy import Column, Integer, String, Text, Enum, DateTime, func
from database import Base
import enum

class PriorityLevel(enum.Enum):
    High = "High"
    Medium = "Medium"
    Low = "Low"

class AIInsight(Base):
    __tablename__ = "ai_insights"

    id = Column(Integer, primary_key=True, index=True)
    campaign_name = Column(String(255), nullable=False)
    insight_category = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    priority = Column(Enum(PriorityLevel), nullable=False)
    expected_impact = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
