from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.session import get_db
from app.api.auth import get_current_user
from app.models.models import User, Dataset, DatasetImage, Annotation
from app.schemas.schemas import (
    Dataset as DatasetSchema,
    DatasetCreate,
    DatasetUpdate,
    DatasetImage as DatasetImageSchema,
    Annotation as AnnotationSchema,
    AnnotationCreate,
    DatasetStatistics
)
from app.core.config import settings
import os
import shutil
from PIL import Image
import json

router = APIRouter()


@router.post("/", response_model=DatasetSchema)
def create_dataset(
    dataset: DatasetCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new dataset."""
    db_dataset = Dataset(
        name=dataset.name,
        description=dataset.description,
        dataset_type=dataset.dataset_type,
        is_public=dataset.is_public,
        owner_id=current_user.id
    )
    db.add(db_dataset)
    db.commit()
    db.refresh(db_dataset)
    
    # Create dataset directory
    dataset_dir = os.path.join(settings.DATASET_DIR, str(db_dataset.id))
    os.makedirs(dataset_dir, exist_ok=True)
    os.makedirs(os.path.join(dataset_dir, "images"), exist_ok=True)
    os.makedirs(os.path.join(dataset_dir, "labels"), exist_ok=True)
    
    return db_dataset


@router.get("/", response_model=List[DatasetSchema])
def list_datasets(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all datasets accessible to current user."""
    datasets = db.query(Dataset).filter(
        (Dataset.owner_id == current_user.id) | (Dataset.is_public == True)
    ).offset(skip).limit(limit).all()
    return datasets


@router.get("/{dataset_id}", response_model=DatasetSchema)
def get_dataset(
    dataset_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get dataset by ID."""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    if dataset.owner_id != current_user.id and not dataset.is_public:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return dataset


@router.put("/{dataset_id}", response_model=DatasetSchema)
def update_dataset(
    dataset_id: int,
    dataset_update: DatasetUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update dataset."""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    if dataset.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    update_data = dataset_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(dataset, field, value)
    
    db.commit()
    db.refresh(dataset)
    return dataset


@router.delete("/{dataset_id}")
def delete_dataset(
    dataset_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete dataset."""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    if dataset.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Delete dataset directory
    dataset_dir = os.path.join(settings.DATASET_DIR, str(dataset_id))
    if os.path.exists(dataset_dir):
        shutil.rmtree(dataset_dir)
    
    db.delete(dataset)
    db.commit()
    
    return {"message": "Dataset deleted successfully"}


@router.post("/{dataset_id}/images", response_model=DatasetImageSchema)
async def upload_image(
    dataset_id: int,
    file: UploadFile = File(...),
    split: str = Form("train"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload an image to dataset."""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    if dataset.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Save file
    dataset_dir = os.path.join(settings.DATASET_DIR, str(dataset_id), "images")
    file_path = os.path.join(dataset_dir, file.filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Get image dimensions
    try:
        img = Image.open(file_path)
        width, height = img.size
    except Exception:
        width, height = None, None
    
    # Create database entry
    db_image = DatasetImage(
        dataset_id=dataset_id,
        filename=file.filename,
        file_path=file_path,
        width=width,
        height=height,
        split=split
    )
    db.add(db_image)
    
    # Update dataset image count
    dataset.num_images = db.query(DatasetImage).filter(DatasetImage.dataset_id == dataset_id).count() + 1
    
    db.commit()
    db.refresh(db_image)
    
    return db_image


@router.get("/{dataset_id}/images", response_model=List[DatasetImageSchema])
def list_images(
    dataset_id: int,
    skip: int = 0,
    limit: int = 100,
    split: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List images in dataset."""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    if dataset.owner_id != current_user.id and not dataset.is_public:
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = db.query(DatasetImage).filter(DatasetImage.dataset_id == dataset_id)
    if split:
        query = query.filter(DatasetImage.split == split)
    
    images = query.offset(skip).limit(limit).all()
    return images


@router.post("/{dataset_id}/images/{image_id}/annotations", response_model=AnnotationSchema)
def create_annotation(
    dataset_id: int,
    image_id: int,
    annotation: AnnotationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create annotation for an image."""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    if dataset.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    image = db.query(DatasetImage).filter(DatasetImage.id == image_id).first()
    if not image or image.dataset_id != dataset_id:
        raise HTTPException(status_code=404, detail="Image not found")
    
    db_annotation = Annotation(**annotation.dict())
    db.add(db_annotation)
    
    # Mark image as labeled
    image.is_labeled = True
    
    db.commit()
    db.refresh(db_annotation)
    
    return db_annotation


@router.get("/{dataset_id}/images/{image_id}/annotations", response_model=List[AnnotationSchema])
def get_annotations(
    dataset_id: int,
    image_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get annotations for an image."""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    if dataset.owner_id != current_user.id and not dataset.is_public:
        raise HTTPException(status_code=403, detail="Access denied")
    
    annotations = db.query(Annotation).filter(Annotation.image_id == image_id).all()
    return annotations


@router.delete("/{dataset_id}/annotations/{annotation_id}")
def delete_annotation(
    dataset_id: int,
    annotation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an annotation."""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    if dataset.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    annotation = db.query(Annotation).filter(Annotation.id == annotation_id).first()
    if not annotation:
        raise HTTPException(status_code=404, detail="Annotation not found")
    
    db.delete(annotation)
    db.commit()
    
    return {"message": "Annotation deleted successfully"}


@router.get("/{dataset_id}/statistics", response_model=DatasetStatistics)
def get_dataset_statistics(
    dataset_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get dataset statistics."""
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    if dataset.owner_id != current_user.id and not dataset.is_public:
        raise HTTPException(status_code=403, detail="Access denied")
    
    total_images = db.query(DatasetImage).filter(DatasetImage.dataset_id == dataset_id).count()
    train_images = db.query(DatasetImage).filter(
        DatasetImage.dataset_id == dataset_id, DatasetImage.split == "train"
    ).count()
    val_images = db.query(DatasetImage).filter(
        DatasetImage.dataset_id == dataset_id, DatasetImage.split == "val"
    ).count()
    test_images = db.query(DatasetImage).filter(
        DatasetImage.dataset_id == dataset_id, DatasetImage.split == "test"
    ).count()
    labeled_images = db.query(DatasetImage).filter(
        DatasetImage.dataset_id == dataset_id, DatasetImage.is_labeled == True
    ).count()
    
    # Get class distribution
    annotations = db.query(Annotation.class_name).join(DatasetImage).filter(
        DatasetImage.dataset_id == dataset_id
    ).all()
    
    class_distribution = {}
    for annotation in annotations:
        class_name = annotation[0]
        class_distribution[class_name] = class_distribution.get(class_name, 0) + 1
    
    return DatasetStatistics(
        total_images=total_images,
        train_images=train_images,
        val_images=val_images,
        test_images=test_images,
        labeled_images=labeled_images,
        unlabeled_images=total_images - labeled_images,
        class_distribution=class_distribution
    )
