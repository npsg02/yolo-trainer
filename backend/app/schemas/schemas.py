from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class TrainingStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class DatasetType(str, Enum):
    DETECT = "detect"
    SEGMENT = "segment"
    POSE = "pose"
    CLASSIFY = "classify"
    TRACKING = "tracking"


# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    username: str


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    password: Optional[str] = None


class User(UserBase):
    id: int
    is_active: bool
    is_superuser: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# Dataset Schemas
class DatasetBase(BaseModel):
    name: str
    description: Optional[str] = None
    dataset_type: DatasetType = DatasetType.DETECT
    is_public: bool = False


class DatasetCreate(DatasetBase):
    pass


class DatasetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    dataset_type: Optional[DatasetType] = None
    is_public: Optional[bool] = None
    class_names: Optional[List[str]] = None


class Dataset(DatasetBase):
    id: int
    owner_id: int
    num_classes: int
    num_images: int
    class_names: Optional[List[str]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Image Schemas
class DatasetImageBase(BaseModel):
    filename: str
    split: str = "train"


class DatasetImage(DatasetImageBase):
    id: int
    dataset_id: int
    file_path: str
    width: Optional[int] = None
    height: Optional[int] = None
    is_labeled: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


# Annotation Schemas
class AnnotationBase(BaseModel):
    class_id: int
    class_name: str
    x_center: float = Field(..., ge=0, le=1)
    y_center: float = Field(..., ge=0, le=1)
    width: float = Field(..., ge=0, le=1)
    height: float = Field(..., ge=0, le=1)
    confidence: float = Field(1.0, ge=0, le=1)


class AnnotationCreate(AnnotationBase):
    image_id: int


class Annotation(AnnotationBase):
    id: int
    image_id: int
    created_at: datetime
    
    class Config:
        from_attributes = True


# Model Schemas
class ModelBase(BaseModel):
    name: str
    description: Optional[str] = None
    model_type: str = "yolov8n"
    is_public: bool = False


class ModelCreate(ModelBase):
    pass


class ModelUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = None
    is_deployed: Optional[bool] = None


class Model(ModelBase):
    id: int
    owner_id: int
    file_path: Optional[str] = None
    num_classes: Optional[int] = None
    class_names: Optional[List[str]] = None
    metrics: Optional[dict] = None
    is_deployed: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


# Training Job Schemas
class TrainingJobBase(BaseModel):
    dataset_id: int
    model_id: int
    epochs: int = 100
    batch_size: int = 16
    img_size: int = 640
    learning_rate: float = 0.01
    patience: int = 50


class TrainingJobCreate(TrainingJobBase):
    pass


class TrainingJob(TrainingJobBase):
    id: int
    user_id: int
    status: TrainingStatus
    current_epoch: int
    best_map: Optional[float] = None
    training_time: Optional[float] = None
    logs: Optional[str] = None
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


# Authentication Schemas
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    username: Optional[str] = None


# Prediction Schemas
class PredictionRequest(BaseModel):
    model_id: int
    confidence: float = Field(0.25, ge=0, le=1)
    iou_threshold: float = Field(0.45, ge=0, le=1)


class BoundingBox(BaseModel):
    class_id: int
    class_name: str
    confidence: float
    x_min: float
    y_min: float
    x_max: float
    y_max: float


class PredictionResult(BaseModel):
    image_path: str
    predictions: List[BoundingBox]
    inference_time: float


# Statistics Schemas
class DatasetStatistics(BaseModel):
    total_images: int
    train_images: int
    val_images: int
    test_images: int
    labeled_images: int
    unlabeled_images: int
    class_distribution: dict


class DashboardStats(BaseModel):
    total_datasets: int
    total_models: int
    total_training_jobs: int
    active_training_jobs: int
