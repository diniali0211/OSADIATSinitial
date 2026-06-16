from sqlalchemy import Column, Integer, String, Float, Text, DateTime
from datetime import datetime
from .connection import Base

class Candidate(Base):
    __tablename__ = "candidates"

    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String)
    email         = Column(String)
    phone         = Column(String)
    location      = Column(String)
    score         = Column(Float)
    status        = Column(String, default="PENDING")
    resume_text   = Column(Text)
    created_at    = Column(DateTime, default=datetime.utcnow)
    abscond_date  = Column(String,   nullable=True)
    resume_url    = Column(String,   nullable=True)
    reject_reason = Column(String,   nullable=True)
    recuiter_name = Column(String,   nullable=True)
    hired_date    = Column(DateTime, nullable=True)
    role_applied  = Column(String,   nullable=True)


class Settings(Base):
    __tablename__ = "settings"

    id               = Column(Integer, primary_key=True, index=True)
    company_name     = Column(String, default="My Company")
    hr_name          = Column(String, default="")
    hr_email         = Column(String, default="")
    hiring_position  = Column(String, default="")
    min_score        = Column(Float,  default=50.0)
    data_retention   = Column(String, default="90")
    language         = Column(String, default="en")
    date_format      = Column(String, default="DD/MM/YYYY")
    app_password     = Column(String, default="admin123")
    delete_password  = Column(String, default="delete124")
