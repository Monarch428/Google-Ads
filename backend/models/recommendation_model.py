# models/recommendation_model.py
from sqlalchemy import (
    Column, Integer, String, Text, Float, Enum,
    ForeignKey, DateTime
)
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"))
    campaign_name = Column(String(255))
    suggestion = Column(Text)  # AI generated insight
    data_snapshot = Column(Text)  # campaign data behind the suggestion
    predicted_impact = Column(Float)
    action_proposal = Column(String(255))
    priority = Column(Enum("HIGH", "MEDIUM", "LOW", name="priority_level"), default="MEDIUM")
    status = Column(
        Enum("PENDING", "APPROVED", "MODIFIED", "DISMISSED", "EXECUTED", name="recommendation_status"),
        default="PENDING"
    )

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    comments = relationship("Comment", back_populates="recommendation", cascade="all, delete-orphan")
    execution_logs = relationship("ExecutionLog", back_populates="recommendation", cascade="all, delete-orphan")


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True)
    recommendation_id = Column(Integer, ForeignKey("recommendations.id"))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    text = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

    recommendation = relationship("Recommendation", back_populates="comments")


class ExecutionLog(Base):
    __tablename__ = "execution_logs"

    id = Column(Integer, primary_key=True)
    recommendation_id = Column(Integer, ForeignKey("recommendations.id"))
    before_metric = Column(Float)
    after_metric = Column(Float)
    improvement = Column(Float)  # as percent e.g. 18.0 meaning 18%
    recorded_at = Column(DateTime, default=datetime.utcnow)

    recommendation = relationship("Recommendation", back_populates="execution_logs")
