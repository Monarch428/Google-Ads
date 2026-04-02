from sqlalchemy import Column, Integer, String, Text, DateTime, JSON
from sqlalchemy.sql import func
from database import Base

ai_insights = Column(Text, nullable=True) 

class SeoReport(Base):
    __tablename__ = "seo_reports" 

    id = Column(Integer, primary_key=True, index=True)
    url = Column(String(500), nullable=False)     
    status = Column(String(50), default="completed") 
    overall_score = Column(Integer, nullable=True)  

    content_score = Column(Integer, nullable=True)      
    technical_score = Column(Integer, nullable=True)     
    links_score = Column(Integer, nullable=True)       
    performance_score = Column(Integer, nullable=True) 
    grade = Column(String(20), nullable=True)  

    ai_insights = Column(Text, nullable=True)
    results = Column(JSON, nullable=True)  
    created_at = Column(DateTime(timezone=True), server_default=func.now())