import subprocess
import sys
import os

def main():
    print("Starting YOLO Flask Server")
    print("=" * 60)
    
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(backend_dir)
    
    # check if model exists
    model_path = os.path.join('..', '..', 'best.pt')
    if not os.path.exists(model_path):
        print("Error: Checkpoint model file not found!")
        print(f"Expected location: {os.path.abspath(model_path)}")
        print("Please make sure your YOLO model is in the BetterEats directory.")
        return False
    
    print(f"Found YOLO model: {os.path.abspath(model_path)}")
    
    print("\nStarting real-time server...")
    print("BetterEats food detection ready!")
    print("\nPress Ctrl+C to stop the server")
    print("-" * 60)
    
    # start the real-time server
    try:
        subprocess.run([sys.executable, "flask_server.py"])
    except KeyboardInterrupt:
        print("\n\n Server stopped by user")
    except Exception as e:
        print(f"\n Server error: {e}")
        return False
    
    return True

if __name__ == "__main__":
    main()
