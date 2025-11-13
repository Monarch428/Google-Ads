# models/campaign_model.py
from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    impressions = Column(Integer, default=0)
    clicks = Column(Integer, default=0)
    cost = Column(Float, default=0.0)
    date = Column(Date, nullable=True)

    # IMPORTANT: define the relationship expected by Client.campaigns
    # MUST match Client.campaigns.back_populates exactly ("campaigns")
    client = relationship(
        "Client",
        back_populates="campaigns",
        lazy="joined"
    )

    def __repr__(self):
        return f"<Campaign id={self.id} name={self.name} client_id={self.client_id}>"
