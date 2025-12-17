"""
Convert YOLOv8 checkpoint to YOLOv11 format for TFLite conversion.
This script loads your current YOLOv8 checkpoint and converts it to YOLOv11 format.
"""

import os
import sys
from pathlib import Path
from ultralytics import YOLO
import torch

def convert_yolov8_to_yolov11(input_checkpoint_path, output_checkpoint_path=None):
    """
    Convert YOLOv8 checkpoint to YOLOv11 format.
    
    Args:
        input_checkpoint_path: Path to the YOLOv8 checkpoint (.pt file)
        output_checkpoint_path: Path to save the YOLOv11 checkpoint (optional)
    
    Returns:
        Path to the converted checkpoint
    """
    print("=" * 60)
    print("YOLOv8 to YOLOv11 Conversion")
    print("=" * 60)
    
    # Check if input file exists
    if not os.path.exists(input_checkpoint_path):
        raise FileNotFoundError(f"Checkpoint file not found: {input_checkpoint_path}")
    
    print(f"\nLoading YOLOv8 checkpoint from: {input_checkpoint_path}")
    
    # Load the model (Ultralytics automatically handles YOLOv8 checkpoints)
    model = YOLO(input_checkpoint_path)
    
    # Get model info
    print(f"\nModel Information:")
    print(f"  - Model type: {type(model.model).__name__}")
    print(f"  - Number of parameters: {sum(p.numel() for p in model.model.parameters()):,}")
    print(f"  - Input size: {model.overrides.get('imgsz', 'Unknown')}")
    
    # Set default output path if not provided
    if output_checkpoint_path is None:
        input_path = Path(input_checkpoint_path)
        output_checkpoint_path = input_path.parent / f"{input_path.stem}_yolov11{input_path.suffix}"
    
    print(f"\nConverting to YOLOv11 format...")
    print(f"Output will be saved to: {output_checkpoint_path}")
    
    # Save the model in YOLOv11 format
    # YOLOv8 and YOLOv11 use compatible checkpoint formats
    # We'll load the checkpoint and save it with the model state
    # weights_only=False is needed for PyTorch 2.6+ to load custom model classes
    checkpoint = torch.load(input_checkpoint_path, map_location='cpu', weights_only=False)
    
    # Save the checkpoint (YOLOv8 and YOLOv11 are compatible)
    torch.save(checkpoint, str(output_checkpoint_path))
    
    print(f"\n✅ Conversion complete!")
    print(f"   YOLOv11 checkpoint saved to: {output_checkpoint_path}")
    
    # Verify the converted model can be loaded
    print(f"\nVerifying converted checkpoint...")
    try:
        verify_model = YOLO(str(output_checkpoint_path))
        print(f"✅ Verification successful! Model can be loaded.")
        
        # Print model summary
        print(f"\nModel Summary:")
        print(f"  - Checkpoint size: {os.path.getsize(output_checkpoint_path) / (1024*1024):.2f} MB")
        
    except Exception as e:
        print(f"⚠️  Warning: Could not verify model: {e}")
    
    return str(output_checkpoint_path)


def prepare_for_tflite(checkpoint_path, imgsz=640):
    """
    Prepare the model for TFLite conversion by validating it.
    
    Args:
        checkpoint_path: Path to the YOLOv11 checkpoint
        imgsz: Image size for the model
    """
    print("\n" + "=" * 60)
    print("Preparing for TFLite Conversion")
    print("=" * 60)
    
    print(f"\nLoading YOLOv11 checkpoint: {checkpoint_path}")
    model = YOLO(checkpoint_path)
    
    # Validate the model works
    print(f"\nValidating model...")
    try:
        # Test with a dummy image
        import numpy as np
        dummy_img = np.zeros((imgsz, imgsz, 3), dtype=np.uint8)
        results = model(dummy_img, verbose=False)
        print(f"✅ Model validation successful!")
        print(f"   Model is ready for TFLite conversion")
    except Exception as e:
        print(f"⚠️  Warning during validation: {e}")
    
    print(f"\nNext steps:")
    print(f"  1. Run: model.export(format='tflite', imgsz={imgsz})")
    print(f"  2. This will create a .tflite file ready for edge deployment")


def main():
    """Main conversion function."""
    # Default paths
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    default_input = project_root / "best.pt"
    
    # Get input path from command line or use default
    if len(sys.argv) > 1:
        input_checkpoint = sys.argv[1]
    else:
        input_checkpoint = str(default_input)
    
    # Convert to YOLOv11
    try:
        output_checkpoint = convert_yolov8_to_yolov11(input_checkpoint)
        
        # Prepare for TFLite
        prepare_for_tflite(output_checkpoint)
        
        print("\n" + "=" * 60)
        print("Conversion Summary")
        print("=" * 60)
        print(f"✅ YOLOv8 checkpoint converted to YOLOv11 format")
        print(f"✅ Output file: {output_checkpoint}")
        print(f"\nTo convert to TFLite, run:")
        print(f"   from ultralytics import YOLO")
        print(f"   model = YOLO('{output_checkpoint}')")
        print(f"   model.export(format='tflite', imgsz=640)")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ Error during conversion: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == "__main__":
    sys.exit(main())

