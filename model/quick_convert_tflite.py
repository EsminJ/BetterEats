"""
Quick TFLite conversion using Ultralytics built-in export.
This is the simplest way to convert YOLO to TFLite.
"""

from ultralytics import YOLO
import os
from pathlib import Path

# Path to your model
model_path = "best_yolov11.pt"  # Or use "yolo11n.pt" for a pretrained model

# Check if model exists
if not os.path.exists(model_path):
    # Try alternative path
    alt_path = Path(__file__).parent.parent / "best_yolov11.pt"
    if alt_path.exists():
        model_path = str(alt_path)
    else:
        print(f"Error: Model not found at {model_path}")
        print("Please specify the correct path to your .pt file")
        exit(1)

print("=" * 60)
print("YOLO to TFLite Conversion (Simple Method)")
print("=" * 60)
print(f"\nLoading model: {model_path}")

# Load the model
model = YOLO(model_path)

print(f"Model loaded successfully!")
print(f"Model type: {type(model.model).__name__}")
print(f"Number of classes: {len(model.names)}")

# Export to TFLite
print(f"\nExporting to TFLite format...")
print("This may take a few minutes...")

try:
    # Standard TFLite export (float32/float16)
    model.export(format="tflite")
    
    # Find the exported file
    model_dir = Path(model_path).parent
    tflite_files = list(model_dir.glob("*.tflite"))
    
    if tflite_files:
        tflite_file = tflite_files[0]
        file_size = os.path.getsize(tflite_file) / (1024 * 1024)
        print(f"\n✅ TFLite conversion successful!")
        print(f"   File: {tflite_file}")
        print(f"   Size: {file_size:.2f} MB")
    else:
        print("\n⚠️  TFLite file created but location unknown")
        print("   Check the current directory for .tflite files")
        
except Exception as e:
    print(f"\n❌ Error during export: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

print("\n" + "=" * 60)
print("Conversion Complete!")
print("=" * 60)
print("\nFor Edge TPU (Coral) devices, you can also use:")
print("   model.export(format='edgetpu')")
print("\nNote: Edge TPU export requires additional setup.")
print("=" * 60)

