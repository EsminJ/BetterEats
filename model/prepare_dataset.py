#!/usr/bin/env python3
"""
Dataset preparation script for YOLO detection training.
Converts COCO-style annotations with bounding boxes to YOLO detection format.
"""

import json
import shutil
from pathlib import Path
from collections import defaultdict
import yaml

def load_coco_annotations(annotation_file):
    """Load COCO annotation file and return structured data."""
    with open(annotation_file, 'r') as f:
        data = json.load(f)
    
    # Create mappings
    categories = {cat['id']: cat['name'] for cat in data['categories']}
    images = {img['id']: {'file_name': img['file_name'], 'width': img['width'], 'height': img['height']} 
              for img in data['images']}
    
    # Group annotations by image
    image_annotations = defaultdict(list)
    for ann in data['annotations']:
        image_annotations[ann['image_id']].append({
            'category_id': ann['category_id'],
            'bbox': ann['bbox']  # [x, y, width, height] in COCO format
        })
    
    return categories, images, image_annotations

def convert_coco_to_yolo_bbox(coco_bbox, img_width, img_height):
    """Convert COCO bbox format to YOLO format."""
    x, y, w, h = coco_bbox
    
    # COCO: [x, y, width, height] (top-left corner + size)
    # YOLO: [center_x, center_y, width, height] (normalized 0-1)
    
    center_x = (x + w / 2) / img_width
    center_y = (y + h / 2) / img_height
    norm_w = w / img_width
    norm_h = h / img_height
    
    return [center_x, center_y, norm_w, norm_h]

def clean_category_name(name):
    """Clean category name for use as directory name."""
    cleaned = "".join(c for c in str(name) if c.isalnum() or c in (' ', '-', '_')).strip()
    cleaned = cleaned.replace(' ', '_').replace('-', '_')
    return cleaned or 'unknown'

def prepare_detection_dataset():
    """Main function to prepare the dataset for YOLO detection training."""
    
    # Define paths
    dataset_root = Path("food_recognition_2022/raw_data")
    train_dir = dataset_root / "public_training_set_release_2.0"
    val_dir = dataset_root / "public_validation_set_2.0"
    
    output_dir = Path("food_detection")
    
    # Clean up previous runs
    if output_dir.exists():
        shutil.rmtree(output_dir)
    
    # Create output directories
    (output_dir / "images" / "train").mkdir(parents=True, exist_ok=True)
    (output_dir / "images" / "val").mkdir(parents=True, exist_ok=True)
    (output_dir / "labels" / "train").mkdir(parents=True, exist_ok=True)
    (output_dir / "labels" / "val").mkdir(parents=True, exist_ok=True)
    
    print("Processing training set...")
    train_categories = process_split(train_dir, output_dir, "train")
    
    print("Processing validation set...")
    val_categories = process_split(val_dir, output_dir, "val")
    
    # Create YAML config file
    create_yaml_config(output_dir, train_categories)
    
    # Print statistics
    print_detection_stats(output_dir)

def process_split(split_dir, output_dir, split_name):
    """Process a single split (train/val) of the dataset."""
    
    annotation_file = split_dir / "annotations.json"
    images_dir = split_dir / "images"
    
    if not annotation_file.exists():
        print(f"Warning: No annotations file found at {annotation_file}")
        return set()
    
    if not images_dir.exists():
        print(f"Warning: No images directory found at {images_dir}")
        return set()
    
    # Load annotations
    categories, images, image_annotations = load_coco_annotations(annotation_file)
    
    print(f"Found {len(categories)} categories")
    print(f"Found {len(images)} images")
    
    # Create category mapping (COCO ID -> YOLO class index)
    category_list = sorted(categories.items())
    category_to_class = {cat_id: idx for idx, (cat_id, _) in enumerate(category_list)}
    
    processed_images = 0
    processed_objects = 0
    
    for image_id, image_info in images.items():
        file_name = image_info['file_name']
        img_width = image_info['width']
        img_height = image_info['height']
        
        # Get annotations for this image
        annotations = image_annotations.get(image_id, [])
        
        if not annotations:
            continue  # Skip images with no annotations
        
        # Copy image
        src_image = images_dir / file_name
        dst_image = output_dir / "images" / split_name / file_name
        
        if not src_image.exists():
            continue
            
        shutil.copy2(src_image, dst_image)
        
        # Create YOLO label file
        label_file = output_dir / "labels" / split_name / f"{Path(file_name).stem}.txt"
        
        with open(label_file, 'w') as f:
            for ann in annotations:
                category_id = ann['category_id']
                coco_bbox = ann['bbox']
                
                # Convert to YOLO format
                yolo_bbox = convert_coco_to_yolo_bbox(coco_bbox, img_width, img_height)
                
                # Get class index
                class_idx = category_to_class[category_id]
                
                # Write YOLO format: class_id center_x center_y width height
                f.write(f"{class_idx} {yolo_bbox[0]:.6f} {yolo_bbox[1]:.6f} {yolo_bbox[2]:.6f} {yolo_bbox[3]:.6f}\n")
                processed_objects += 1
        
        processed_images += 1
    
    print(f"Processed {processed_images} images with {processed_objects} objects")
    
    # Return category names for YAML config
    return [clean_category_name(categories[cat_id]) for cat_id, _ in category_list]

def create_yaml_config(output_dir, categories):
    """Create YAML configuration file for YOLO training."""
    
    yaml_content = {
        'path': str(output_dir.absolute()),
        'train': 'images/train',
        'val': 'images/val',
        'nc': len(categories),  # number of classes
        'names': categories
    }
    
    yaml_file = output_dir / "food_detection.yaml"
    with open(yaml_file, 'w') as f:
        yaml.dump(yaml_content, f, default_flow_style=False)
    
    print(f"Created YAML config: {yaml_file}")

def print_detection_stats(output_dir):
    """Print dataset statistics."""
    
    def count_files(path):
        """Count files in a directory."""
        return len(list(path.glob("*")))
    
    train_images = count_files(output_dir / "images" / "train")
    val_images = count_files(output_dir / "images" / "val")
    train_labels = count_files(output_dir / "labels" / "train")
    val_labels = count_files(output_dir / "labels" / "val")
    
    print(f"\nDataset Statistics:")
    print(f"Training images: {train_images}")
    print(f"Training labels: {train_labels}")
    print(f"Validation images: {val_images}")
    print(f"Validation labels: {val_labels}")
    print(f"Total images: {train_images + val_images}")
    
    # Count objects in labels
    def count_objects(split):
        total_objects = 0
        label_dir = output_dir / "labels" / split
        for label_file in label_dir.glob("*.txt"):
            with open(label_file, 'r') as f:
                total_objects += len(f.readlines())
        return total_objects
    
    train_objects = count_objects("train")
    val_objects = count_objects("val")
    
    print(f"Training objects: {train_objects}")
    print(f"Validation objects: {val_objects}")
    print(f"Total objects: {train_objects + val_objects}")
    
    # Load and show categories
    yaml_file = output_dir / "food_detection.yaml"
    if yaml_file.exists():
        with open(yaml_file, 'r') as f:
            config = yaml.safe_load(f)
        
        print(f"\nCategories ({config['nc']}):")
        for i, name in enumerate(config['names'][:10]):  # Show first 10
            print(f"  {i}: {name}")
        if len(config['names']) > 10:
            print(f"  ... and {len(config['names']) - 10} more")

if __name__ == "__main__":
    prepare_detection_dataset()
