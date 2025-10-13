import subprocess
import sys
import os

def main():
    print("Starting YOLO Flask Server")
    print("=" * 60)
    
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(backend_dir)
    
    # Check if model exists (in parent directory)
    model_path = os.path.join('..', '..', 'best.pt')
    if not os.path.exists(model_path):
        print("Error: Checkpoint model file not found!")
        print(f"Expected location: {os.path.abspath(model_path)}")
        print("Please make sure your YOLO model is in the BetterEats directory.")
        return False
    
    print(f"Found YOLO model: {os.path.abspath(model_path)}")
    
    # Install requirements if needed
    try:
        print("Installing/updating YOLO requirements...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements_yolo.txt"])
        print("YOLO requirements ready")
    except subprocess.CalledProcessError as e:
        print(f"Error installing requirements: {e}")
        return False
    
    print("\nStarting real-time server...")
    print("Mobile app will connect to: http://YOUR_IP:5000")
    print("Real-time detection mode enabled")
    print("BetterEats food detection ready!")
    print("\nPress Ctrl+C to stop the server")
    print("-" * 60)
    
    # Start the real-time server
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
