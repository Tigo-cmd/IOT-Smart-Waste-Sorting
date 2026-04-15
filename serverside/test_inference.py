import requests
import os

API_URL = "http://localhost:5000/api/detect"
TEST_IMAGES = [
    {"name": "Bottle", "path": "/home/tigo/.gemini/antigravity/brain/680bff4e-6e2f-443a-aa0e-63cb6ebc4097/realistic_bottle_for_yolo_1776260151158.png"},
    {"name": "Banana", "path": "/home/tigo/.gemini/antigravity/brain/680bff4e-6e2f-443a-aa0e-63cb6ebc4097/test_banana_organic_1776260497471.png"},
    {"name": "Paper", "path": "/home/tigo/.gemini/antigravity/brain/680bff4e-6e2f-443a-aa0e-63cb6ebc4097/test_paper_sample_1776263392643.png"},
    {"name": "Nylon", "path": "/home/tigo/.gemini/antigravity/brain/680bff4e-6e2f-443a-aa0e-63cb6ebc4097/test_nylon_sample_1776263438574.png"}
]

def test_inference():
    print(f"{'Sample':<10} | {'Category':<10} | {'Conf':<6} | {'Object'}")
    print("-" * 50)
    
    for item in TEST_IMAGES:
        img_path = item["path"]
        if not os.path.exists(img_path):
            print(f"Error: {item['name']} image not found")
            continue

        with open(img_path, 'rb') as f:
            files = {'image': (os.path.basename(img_path), f, 'image/png')}
            data = {'device_id': 'dev-001'}
            
            try:
                response = requests.post(API_URL, files=files, data=data)
                
                if response.status_code == 200:
                    res = response.json()
                    print(f"{item['name']:<10} | {res['category']:<10} | {res['confidence']:<6.2f} | {res['object']}")
                else:
                    print(f"Failed: {response.status_code}")
            except Exception as e:
                print(f"Connection Error: {e}")

if __name__ == "__main__":
    test_inference()
