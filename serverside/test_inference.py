import requests
import os

API_URL = "http://localhost:5000/api/detect"
TEST_IMAGES = [
    "/home/tigo/.gemini/antigravity/brain/680bff4e-6e2f-443a-aa0e-63cb6ebc4097/realistic_bottle_for_yolo_1776260151158.png",
    "/home/tigo/.gemini/antigravity/brain/680bff4e-6e2f-443a-aa0e-63cb6ebc4097/test_banana_organic_1776260497471.png",
    "/home/tigo/Desktop/Myprojects/INTEGRALL/IOT-Smart-Waste-Sorting/serverside/uploads/ima"
]

def test_inference():
    for img_path in TEST_IMAGES:
        if not os.path.exists(img_path):
            print(f"Error: Image not found at {img_path}")
            continue

        with open(img_path, 'rb') as f:
            files = {'image': (os.path.basename(img_path), f, 'image/png')}
            data = {'device_id': 'dev-001'}
            
            try:
                print(f"\nTesting image: {os.path.basename(img_path)}")
                response = requests.post(API_URL, files=files, data=data)
                
                if response.status_code == 200:
                    print("Success!")
                    print("Result:", response.json())
                else:
                    print(f"Failed: {response.status_code}")
                    print(response.text)
            except Exception as e:
                print(f"Connection Error: {e}")

if __name__ == "__main__":
    test_inference()
