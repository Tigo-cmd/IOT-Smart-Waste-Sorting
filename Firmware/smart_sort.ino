/**
 * STEP 2: Vision Integration
 * - Adds WiFi, Camera, and Backend connection.
 * - Ultrasonic triggers the cap to open.
 * - Camera captures waste and uploads to AI Backend.
 * - If classification is empty/unknown, it just closes.
 * - If a classification is found, it logs it.
 */

#define INTEGRALL_ENABLE_WIFI
#define INTEGRALL_ENABLE_SERVO
#define INTEGRALL_ENABLE_SENSORS
#define INTEGRALL_ENABLE_CAMERA
#define INTEGRALL_DEBUG_LEVEL 3

#include <Integrall.h>
#include <ArduinoJson.h>

// WiFi Configuration
const char* WIFI_SSID     = "CLICKNETWORKS";
const char* WIFI_PASSWORD = "hotguy112345";
const char* BACKEND_URL   = "http://192.168.1.154:5000";

// ESP32-CAM Pins
#define TRIG_PIN 2
#define ECHO_PIN 14
#define CAP_SERVO_PIN 15

// Servo angles
const int CAP_OPEN = 5;
const int CAP_CLOSED = 90;

Integrall::System integrall;
int capServoIdx = -1;

// Helper to wait while the servo slowly moves
void moveServoSlow(int servoIdx, int targetAngle) {
    Serial.print("Moving lid to "); Serial.println(targetAngle);
    integrall.easeServo(servoIdx, targetAngle, 20); // 20ms per degree update
    
    unsigned long start = millis();
    while (millis() - start < 2500) {
        integrall.handle();
        delay(10);
    }
}

// Sends Image to Backend via HTTP POST
bool sendImageToBackend(camera_fb_t* fb) {
    String url = String(BACKEND_URL) + "/api/detect";
    
    Serial.println("  -> POSTing image to backend API...");
    int status = integrall.httpPostFile(
        url.c_str(),
        fb->buf,
        fb->len,
        "capture.jpg",   
        "image",         
        "device_id",     
        "dev-esp32cam"
    );
    
    if (status == 200) {
        const char* response = integrall.getLastResponse();
        StaticJsonDocument<512> doc;
        DeserializationError error = deserializeJson(doc, response);
        
        if (!error) {
            String category = doc["category"].as<String>();
            float conf      = doc["confidence"].as<float>();
            String object   = doc["object"].as<String>();
            
            Serial.println("\n=== AI CLASSIFICATION ===");
            Serial.print("Object:   "); Serial.println(object);
            Serial.print("Category: "); Serial.println(category);
            Serial.print("Conf:     "); Serial.println(conf, 2);
            Serial.println("=========================\n");
            
            // "unknown" or confidence near 0 means no confident classification
            if (category == "unknown" || category == "none") {
                return false;
            } else {
                return true; 
            }
        } else {
            Serial.print("JSON parse error: "); Serial.println(error.c_str());
        }
    } else {
        Serial.print("HTTP POST failed, status: "); Serial.println(status);
        if (status > 0) Serial.println(integrall.getLastResponse());
    }
    return false;
}

void setup() {
    Serial.begin(115200);
    delay(2000); 

    Serial.println("\n=========================================");
    Serial.println("  STEP 2: Camera + Backend Integration");
    Serial.println("=========================================");

    // Start integrall with Networking
    if (!integrall.begin(WIFI_SSID, WIFI_PASSWORD, BACKEND_URL)) {
        Serial.println("ERR: WiFi connection failed. Check credentials.");
    } else {
        Serial.println(WiFi.localIP());
    }

    // Initialize Camera during setup (important for stability)
    if (!integrall.enableCamera()) {
        Serial.println("ERR: Camera initialization failed!");
    } else {
        Serial.println("Camera initialized successfully.");
    }

    // Initialize Cap Servo
    capServoIdx = integrall.enableServo(CAP_SERVO_PIN, CAP_CLOSED);
    
    Serial.println("Setup complete. Starting loop...\n");
}

void loop() {
    integrall.handle(); // keep background tasks running

    float distance = integrall.readDistance(TRIG_PIN, ECHO_PIN, 3);
    
    if (distance > 0 && distance < 30.0) {
        Serial.println("\n>>> PRESENCE DETECTED! Opening lid...");
        moveServoSlow(capServoIdx, CAP_OPEN);
        
        // Wait briefly for the item to be dropped and the image to settle
        Serial.println(">>> Waiting for item to stabilize...");
        unsigned long ws = millis();
        while(millis() - ws < 1500) { integrall.handle(); delay(10); }
        
        Serial.println(">>> Capturing image...");
        camera_fb_t* fb = integrall.cameraCapture();
        bool isClassified = false;
        
        if (fb) {
            // We got an image, let's process it
            isClassified = sendImageToBackend(fb);
            integrall.cameraRelease(fb); // MUST free memory
        } else {
            Serial.println("ERR: Camera capture failed!");
        }

        // Logic based on result
        if (isClassified) {
            Serial.println(">>> Waste registered! Ready for Step 3 sorting.");
            // Wait slightly so the user can read logs in monitor
            unsigned long delayTime = millis();
            while(millis() - delayTime < 2000) { integrall.handle(); delay(10); } 
        } else {
            Serial.println(">>> Classification empty/unknown! Rejecting item.");
        }

        Serial.println(">>> Closing lid...");
        moveServoSlow(capServoIdx, CAP_CLOSED);
        
        Serial.println(">>> Cooldown for 3 seconds...\n");
        unsigned long cooldownStart = millis();
        while(millis() - cooldownStart < 3000) {
            integrall.handle();
            delay(10);
        }
    }

    // Small loop delay 
    delay(200);
}