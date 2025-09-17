#!/usr/bin/env python3
"""
🍎 Food Detection Model Trainer
==============================

This script trains a YOLO model to detect and identify food items in images.
It uses your prepared dataset to teach the model where food items are located and what types they are.

What it does:
1. Loads your prepared dataset
2. Initializes a YOLO model
3. Trains the model to detect food items
4. Saves the trained model for later use

Usage:
    python train_detection.py
"""

import torch
import gc
import os
from pathlib import Path
from ultralytics import YOLO
import time
import yaml

# Configuration - you can adjust these if needed
DATASET_CONFIG_PATH = "food_detection/food_detection.yaml"
TRAINING_PROJECT_NAME = "food_detection_results"
TRAINING_RUN_NAME = "yolo_detection"

def check_if_dataset_is_ready():
    """Check if the dataset has been prepared and is ready for training."""
    
    dataset_path = Path("food_detection")
    
    if not dataset_path.exists():
        print("❌ Dataset directory not found!")
        print(f"   Looking for: {dataset_path}")
        print("   Please run 'python prepare_detection_dataset.py' first to prepare your dataset.")
        return False
    
    # Check if all required directories exist
    required_directories = [
        dataset_path / "images" / "train",
        dataset_path / "images" / "val", 
        dataset_path / "labels" / "train",
        dataset_path / "labels" / "val"
    ]
    
    for directory in required_directories:
        if not directory.exists():
            print(f"❌ Missing required directory: {directory}")
            return False
    
    # Check if the configuration file exists
    config_file = dataset_path / "food_detection.yaml"
    if not config_file.exists():
        print(f"❌ Missing configuration file: {config_file}")
        return False
    
    # Count files to make sure we have data
    def count_files_in_directory(directory_path):
        return len(list(directory_path.glob("*")))
    
    train_images = count_files_in_directory(dataset_path / "images" / "train")
    val_images = count_files_in_directory(dataset_path / "images" / "val")
    train_labels = count_files_in_directory(dataset_path / "labels" / "train")
    val_labels = count_files_in_directory(dataset_path / "labels" / "val")
    
    if train_images == 0 or val_images == 0:
        print(f"❌ No images found for training!")
        print(f"   Training images: {train_images}")
        print(f"   Validation images: {val_images}")
        return False
    
    if train_labels == 0 or val_labels == 0:
        print(f"❌ No label files found!")
        print(f"   Training labels: {train_labels}")
        print(f"   Validation labels: {val_labels}")
        return False
    
    print("✅ Dataset looks good!")
    print(f"   Training: {train_images} images, {train_labels} labels")
    print(f"   Validation: {val_images} images, {val_labels} labels")
    
    # Load and show the configuration
    with open(config_file, 'r') as f:
        config = yaml.safe_load(f)
    
    print(f"   Food categories: {config['nc']} types")
    print(f"   Categories: {config['names'][:5]}{'...' if len(config['names']) > 5 else ''}")
    
    return True

def check_gpu_availability():
    """Check if a GPU is available for faster training."""
    
    if torch.cuda.is_available():
        gpu_name = torch.cuda.get_device_name(0)
        gpu_memory = torch.cuda.get_device_properties(0).total_memory / 1024**3
        print(f"🚀 GPU detected: {gpu_name}")
        print(f"   Memory: {gpu_memory:.1f} GB")
        return True
    else:
        print("💻 No GPU detected - will use CPU")
        print("   Training will be slower but will still work!")
        return False

def train_the_model():
    """Main function that trains the YOLO model."""
    
    print("🍎 Food Detection Model Trainer")
    print("=" * 40)
    
    # Check if everything is ready
    if not check_if_dataset_is_ready():
        return False
    
    gpu_available = check_gpu_availability()
    
    # Clear any old data from memory
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
    gc.collect()
    
    # Load the YOLO model
    print(f"\n📦 Loading YOLO model...")
    try:
        model = YOLO("yolov8s.pt")  # This is the detection model (not classification)
        print("✅ Model loaded successfully!")
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        return False
    
    # Set up training parameters
    training_config = {
        'data': str(Path(DATASET_CONFIG_PATH).absolute()),
        'imgsz': 640,  # Image size - larger images give better detection
        'epochs': 50,   # Number of training rounds
        'batch': 16 if gpu_available else 8,  # How many images to process at once
        'workers': min(os.cpu_count() // 2, 4) if os.cpu_count() else 2,
        'device': 0 if gpu_available else 'cpu',
        'project': TRAINING_PROJECT_NAME,
        'name': TRAINING_RUN_NAME,
        'save': True,
        'save_period': 10,  # Save model every 10 epochs
        'cache': True,      # Cache images for faster training
        'verbose': True,
        'plots': True,      # Generate training plots
        'patience': 15,     # Stop early if no improvement
        'lr0': 0.01,        # Learning rate
        'lrf': 0.01,        # Final learning rate
        'momentum': 0.937,
        'weight_decay': 0.0005,
        'warmup_epochs': 3,
        'warmup_momentum': 0.8,
        'warmup_bias_lr': 0.1,
        'box': 7.5,         # Box loss weight
        'cls': 0.5,         # Classification loss weight
        'dfl': 1.5,         # Distribution focal loss weight
        'pose': 12.0,       # Pose loss weight
        'kobj': 1.0,        # Keypoint object loss weight
        'label_smoothing': 0.0,
        'nbs': 64,          # Nominal batch size
        'hsv_h': 0.015,     # HSV hue augmentation
        'hsv_s': 0.7,       # HSV saturation augmentation
        'hsv_v': 0.4,       # HSV value augmentation
        'degrees': 0.0,     # Rotation degrees
        'translate': 0.1,   # Translation
        'scale': 0.5,       # Scale
        'shear': 0.0,       # Shear degrees
        'perspective': 0.0, # Perspective
        'flipud': 0.0,      # Flip up-down
        'fliplr': 0.5,      # Flip left-right
        'mosaic': 1.0,      # Mosaic augmentation
        'mixup': 0.0,       # Mixup augmentation
        'copy_paste': 0.0,  # Copy-paste augmentation
        'auto_augment': 'randaugment',
        'erasing': 0.4,     # Random erasing
        'crop_fraction': 1.0,
    }
    
    print(f"\n⚙️  Training Configuration:")
    print(f"   Model: YOLOv8s Detection")
    print(f"   Dataset: {training_config['data']}")
    print(f"   Image size: {training_config['imgsz']}x{training_config['imgsz']}")
    print(f"   Training rounds: {training_config['epochs']}")
    print(f"   Batch size: {training_config['batch']}")
    print(f"   Device: {'GPU' if gpu_available else 'CPU'}")
    print(f"   Workers: {training_config['workers']}")
    
    # Start training
    print(f"\n🏋️  Starting training...")
    print("   This may take a while - grab some coffee! ☕")
    
    start_time = time.time()
    
    try:
        # Train the model
        training_results = model.train(**training_config)
        
        training_time = time.time() - start_time
        print(f"\n✅ Training completed!")
        print(f"   Time taken: {training_time/60:.1f} minutes")
        
        # Run validation to see how well the model performs
        print(f"\n📊 Testing the trained model...")
        validation_results = model.val(
            data=str(Path(DATASET_CONFIG_PATH).absolute()), 
            imgsz=640, 
            batch=training_config['batch']
        )
        
        print(f"\n📈 Training Results:")
        print(f"   Best model: {TRAINING_PROJECT_NAME}/{TRAINING_RUN_NAME}/weights/best.pt")
        print(f"   Latest model: {TRAINING_PROJECT_NAME}/{TRAINING_RUN_NAME}/weights/last.pt")
        print(f"   Results folder: {TRAINING_PROJECT_NAME}/{TRAINING_RUN_NAME}/")
        
        # Show some key performance metrics
        if hasattr(validation_results, 'box'):
            print(f"\n📊 Model Performance:")
            print(f"   mAP50: {validation_results.box.map50:.3f} (how well it finds food)")
            print(f"   mAP50-95: {validation_results.box.map:.3f} (overall accuracy)")
            print(f"   Precision: {validation_results.box.mp:.3f} (how often it's right)")
            print(f"   Recall: {validation_results.box.mr:.3f} (how much food it finds)")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Training failed!")
        print(f"   Error: {e}")
        return False
    
    finally:
        # Clean up memory
        del model
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()

def main():
    """Main entry point."""
    
    try:
        success = train_the_model()
        
        if success:
            print(f"\n🎉 Training completed successfully!")
            print(f"📁 Check '{TRAINING_PROJECT_NAME}/{TRAINING_RUN_NAME}/' for results")
            print(f"🔍 Your model can now detect food items in images!")
            print(f"🧪 Test it with: python test_detection.py")
        else:
            print(f"\n💥 Training failed!")
            return 1
            
    except KeyboardInterrupt:
        print(f"\n⏹️  Training stopped by user")
        return 1
        
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
