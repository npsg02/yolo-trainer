export interface User {
  id: number;
  email: string;
  username: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
}

export interface Dataset {
  id: number;
  name: string;
  description?: string;
  owner_id: number;
  dataset_type: 'detect' | 'segment' | 'pose' | 'classify' | 'tracking';
  num_classes: number;
  num_images: number;
  class_names?: string[];
  is_public: boolean;
  created_at: string;
  updated_at?: string;
}

export interface DatasetImage {
  id: number;
  dataset_id: number;
  filename: string;
  file_path: string;
  width?: number;
  height?: number;
  is_labeled: boolean;
  split: string;
  created_at: string;
}

export interface Annotation {
  id: number;
  image_id: number;
  class_id: number;
  class_name: string;
  x_center: number;
  y_center: number;
  width: number;
  height: number;
  confidence: number;
  created_at: string;
}

export interface Model {
  id: number;
  name: string;
  description?: string;
  owner_id: number;
  model_type: string;
  file_path?: string;
  num_classes?: number;
  class_names?: string[];
  metrics?: any;
  is_public: boolean;
  is_deployed: boolean;
  created_at: string;
  updated_at?: string;
}

export interface TrainingJob {
  id: number;
  user_id: number;
  dataset_id: number;
  model_id: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  epochs: number;
  batch_size: number;
  img_size: number;
  learning_rate: number;
  patience: number;
  current_epoch: number;
  best_map?: number;
  training_time?: number;
  logs?: string;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
}

export interface BoundingBox {
  class_id: number;
  class_name: string;
  confidence: number;
  x_min: number;
  y_min: number;
  x_max: number;
  y_max: number;
}

export interface PredictionResult {
  image_path: string;
  predictions: BoundingBox[];
  inference_time: number;
}

export interface DatasetStatistics {
  total_images: number;
  train_images: number;
  val_images: number;
  test_images: number;
  labeled_images: number;
  unlabeled_images: number;
  class_distribution: Record<string, number>;
}
