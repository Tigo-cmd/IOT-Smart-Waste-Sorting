import os
import uuid
import cv2
import numpy as np
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime
from ultralytics import YOLO

app = Flask(__name__)
CORS(app)

# Configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Load YOLOv8 Model (Small) - Better accuracy than Nano for waste detection
print("Loading YOLOv8s model...")
model = YOLO("yolov8s.pt") 

# In-memory storage
db = {
    "devices": [
        {
            "id": "dev-001",
            "name": "Smart Bin Alpha",
            "location": "Main Entrance",
            "status": "online",
            "last_seen": datetime.now().isoformat(),
            "firmware_version": "1.2.0",
            "ip_address": "192.168.1.50",
            "created_at": datetime.now().isoformat()
        }
    ],
    "detections": [],
    "alerts": []
}

def map_to_category(obj_name):
    """Maps COCO classes to our 3 waste categories"""
    # Plastic: Containers and synthetic materials
    plastic = ["bottle", "cup", "wine glass", "vase", "frisbee"]
    
    # Metal: Cans and utensils 
    metal = ["can", "fork", "knife", "spoon", "scissors", "cell phone"]
    
    # Organic: Food items and biological waste
    organic = [
        "banana", "apple", "sandwich", "orange", "broccoli", 
        "carrot", "hot dog", "pizza", "donut", "cake", 
        "potted plant", "bowl" # Note: Bowls are often misidentified food samples in MVP
    ]

    # Normalize name
    obj_name = obj_name.lower().strip()

    if obj_name in plastic:
        return "plastic"
    elif obj_name in metal:
        return "metal"
    elif obj_name in organic:
        return "organic"
    else:
        return "unknown"

@app.route('/api/detect', methods=['POST'])
def detect_waste():
    # Handle file upload from ESP32-CAM or Test Client
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400
    
    image_file = request.files['image']
    device_id = request.form.get('device_id', 'dev-001')
    
    # Preserve original extension
    ext = os.path.splitext(image_file.filename)[1] if image_file.filename else '.jpg'
    if not ext: ext = '.jpg'
    
    # Save file
    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    image_file.save(filepath)

    # Run Inference
    results = model(filepath)
    
    # Process results
    found_objects = []
    for r in results:
        for box in r.boxes:
            class_id = int(box.cls[0])
            class_name = model.names[class_id]
            confidence = float(box.conf[0])
            
            # Use a slightly lower threshold for MVP testing
            if confidence > 0.15: # Very low to see everything in logs
                print(f"YOLO Found: {class_name} ({confidence:.2f})")
                found_objects.append({
                    "object": class_name,
                    "confidence": confidence
                })

    # Pick the best detection
    if found_objects:
        best = max(found_objects, key=lambda x: x['confidence'])
        category = map_to_category(best['object'])
        final_confidence = best['confidence']
        detected_object = best['object']
    else:
        category = "unknown"
        final_confidence = 0.0
        detected_object = "none"

    # Save to history for Dashboard
    new_detection = {
        "id": str(uuid.uuid4()),
        "device_id": device_id,
        "waste_class": category,
        "confidence": final_confidence,
        "image_url": f"http://localhost:5000/uploads/{filename}",
        "timestamp": datetime.now().isoformat(),
        "notes": f"Detected: {detected_object}",
        "devices": {
            "name": "Smart Bin Alpha",
            "location": "Main Entrance"
        }
    }
    db["detections"].insert(0, new_detection) # Add to start

    # Auto-generate alert if needed
    if final_confidence < 0.6 or category == "unknown":
        db["alerts"].insert(0, {
            "id": str(uuid.uuid4()),
            "device_id": device_id,
            "alert_type": "low_confidence" if category != "unknown" else "info",
            "severity": "warning" if category != "unknown" else "info",
            "message": f"Review needed: {category} ({int(final_confidence*100)}%)",
            "resolved": False,
            "created_at": datetime.now().isoformat(),
            "resolved_at": None,
            "devices": {"name": "Smart Bin Alpha"}
        })

    # Response for ESP32-CAM
    return jsonify({
        "category": category,
        "confidence": final_confidence,
        "object": detected_object,
        "id": new_detection["id"]
    })

@app.route('/api/detections', methods=['GET'])
def get_detections():
    device_id = request.args.get('device')
    category = request.args.get('category')
    
    results = db["detections"]
    if device_id and device_id != 'all':
        results = [d for d in results if d['device_id'] == device_id]
    if category and category != 'all':
        results = [d for d in results if d['waste_class'] == category]
        
    return jsonify(results[:100]) # Limit to 100

@app.route('/api/devices', methods=['GET'])
def get_devices():
    return jsonify(db["devices"])

@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    return jsonify([a for a in db["alerts"] if not a['resolved']])

@app.route('/api/alerts/<alert_id>/resolve', methods=['POST'])
def resolve_alert(alert_id):
    for alert in db["alerts"]:
        if alert["id"] == alert_id:
            alert["resolved"] = True
            alert["resolved_at"] = datetime.now().isoformat()
            return jsonify({"status": "success"})
    return jsonify({"error": "not found"}), 404

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "online", "model": "YOLOv8n", "time": datetime.now().isoformat()})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)