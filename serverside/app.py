import os
import uuid
import base64
import json
import re
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuration
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Initialize Groq Client
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    print("WARNING: GROQ_API_KEY not found in environment. Zero-shot vision will fail.")
groq_client = Groq(api_key=GROQ_API_KEY)

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

def encode_image(image_path):
    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode('utf-8')

def analyze_vision_with_groq(image_path):
    """
    Uses Groq's Vision model (Llama 3.2 11b Vision) to classify waste.
    This provides high accuracy for 'paper', 'nylon', etc. without training.
    """
    try:
        base64_image = encode_image(image_path)
        
        # We ask the model to return a structured JSON response
        completion = groq_client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text", 
                            "text": (
                                "Identify the main object in this image and its material. "
                                "Classify it into EXACTLY ONE of these categories: "
                                "'plastic', 'metal', 'organic', 'paper', 'nylon', or 'unknown'.\n"
                                "Return ONLY a valid JSON object with these fields:\n"
                                "- 'object': (string, e.g., 'crushed water bottle')\n"
                                "- 'category': (string, one of the categories above)\n"
                                "- 'confidence': (float, 0.0 to 1.0)\n"
                                "Do not include markdown or explanations."
                            )
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            temperature=0, # Deterministic for classification
            max_tokens=512
        )
        
        content = completion.choices[0].message.content.strip()
        # Clean up JSON if model returns markdown blocks
        if content.startswith('```'):
            content = re.sub(r'```(?:json)?\n?(.*?)\n?```', r'\1', content, flags=re.DOTALL)
            
        print(f"Groq API Response: {content}")
        return json.loads(content)
    except Exception as e:
        print(f"Groq Vision Error: {e}")
        return {"object": "error", "category": "unknown", "confidence": 0.0}

@app.route('/api/detect', methods=['POST'])
def detect_waste():
    # Handle file upload from ESP32-CAM or Test Client
    if 'image' not in request.files:
        return jsonify({"error": "No image provided"}), 400
    
    image_file = request.files['image']
    device_id = request.form.get('device_id', 'dev-001')
    
    # Save file
    ext = os.path.splitext(image_file.filename)[1] if image_file.filename else '.jpg'
    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    image_file.save(filepath)

    # Use Zero-Shot Vision API for high accuracy
    analysis = analyze_vision_with_groq(filepath)
    
    category = analysis.get('category', 'unknown').lower()
    final_confidence = float(analysis.get('confidence', 0.0))
    detected_object = analysis.get('object', 'unknown')

    # Save to history for Dashboard
    new_detection = {
        "id": str(uuid.uuid4()),
        "device_id": device_id,
        "waste_class": category,
        "confidence": final_confidence,
        "image_url": f"{request.host_url}uploads/{filename}",
        "timestamp": datetime.now().isoformat(),
        "notes": f"AI identified: {detected_object}",
        "devices": {
            "name": "Smart Bin Alpha",
            "location": "Main Entrance"
        }
    }
    db["detections"].insert(0, new_detection)

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
        
    return jsonify(results[:100])

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
    return jsonify({
        "status": "online", 
        "engine": "Groq-Vision", 
        "api_connected": GROQ_API_KEY is not None,
        "time": datetime.now().isoformat()
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)