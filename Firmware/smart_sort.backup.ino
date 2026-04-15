/**
 * Smart Waste Sorting Bin Firmware
 * 
 * Uses the Integrall IoT Framework for:
 * - ESP32-CAM camera capture
 * - Ultrasonic sensor (presence detection)
 * - 3x Servo motors (lid, collector, door)
 * - WiFi + HTTP POST to backend AI
 * 
 * FLOW:
 * IDLE -> Presence Detected -> Open Lid -> Capture Image ->
 * Send to Backend -> Receive Category -> Sort (move servos) -> Reset -> IDLE
 */

// ============================================================================
// INTEGRALL MODULE FLAGS (must be BEFORE the include)
// ============================================================================
#define INTEGRALL_ENABLE_WIFI
#define INTEGRALL_ENABLE_SERVO
#define INTEGRALL_ENABLE_SENSORS
#define INTEGRALL_ENABLE_CAMERA
#define INTEGRALL_ENABLE_BUZZER
#define INTEGRALL_DEBUG_LEVEL 3

#include <Integrall.h>
#include <ArduinoJson.h>

// ============================================================================
// WiFi & Backend Configuration
// ============================================================================
const char* WIFI_SSID     = "Your_SSID";
const char* WIFI_PASSWORD = "Your_Password";
const char* BACKEND_URL   = "http://192.168.1.154:5000";  // Your Flask backend IP

// ============================================================================
// ESP32-CAM PIN MAPPING (from Firmware_PRD)
// ============================================================================
// Ultrasonic Sensor
#define TRIG_PIN  2    // IO2
#define ECHO_PIN  14   // IO14

// Servos (directly connected to ESP32-CAM GPIOs)
#define CAP_SERVO_PIN       15   // Green wire  - Lid/Cap servo
#define DOOR_SERVO_PIN      13   // Orange wire - Door servo
#define COLLECTOR_SERVO_PIN 12   // Blue wire   - Collector servo

// Buzzer (optional, set to -1 if not connected)
#define BUZZER_PIN  -1

// ============================================================================
// SERVO ANGLE CONFIGURATION (from Firmware_PRD test results)
// ============================================================================
// Cap Servo: startup=90°, end=5°
const int CAP_OPEN   = 5;
const int CAP_CLOSED = 90;

// Door Servo: startup=40°, end=160°
const int DOOR_OPEN   = 160;
const int DOOR_CLOSED = 40;

// Collector Servo: startup=103°, positions: 0° (plastic), 103° (neutral), 180° (metal)
const int COLLECTOR_NEUTRAL = 103;
const int COLLECTOR_PLASTIC = 0;
const int COLLECTOR_METAL   = 180;
const int COLLECTOR_ORGANIC = 103;  // Same as neutral (organic bin is center)

// ============================================================================
// TIMING CONFIGURATION
// ============================================================================
const float    PRESENCE_THRESHOLD_CM = 30.0;  // Trigger distance
const int      PRESENCE_CONFIRMS     = 3;     // Require 3 consecutive reads
const uint32_t SERVO_SPEED_MS        = 25;    // Slow movement speed (ms per degree)
const uint32_t LID_OPEN_WAIT_MS      = 3000;  // Time to keep lid open for user to drop waste
const uint32_t CAPTURE_DELAY_MS      = 500;   // Settle time before capture
const uint32_t SORT_HOLD_MS          = 2000;  // Hold door open for waste to fall
const uint32_t COOLDOWN_MS           = 5000;  // Cooldown between cycles
const uint32_t BACKEND_TIMEOUT_MS    = 15000; // Max wait for backend response

// ============================================================================
// STATE MACHINE
// ============================================================================
enum BinState {
    STATE_IDLE,
    STATE_PRESENCE_DETECTED,
    STATE_LID_OPEN,
    STATE_CAPTURING,
    STATE_SENDING,
    STATE_WAITING_RESPONSE,
    STATE_SORTING,
    STATE_RESETTING,
    STATE_COOLDOWN,
    STATE_ERROR
};

const char* stateNames[] = {
    "IDLE", "PRESENCE_DETECTED", "LID_OPEN", "CAPTURING",
    "SENDING", "WAITING_RESPONSE", "SORTING", "RESETTING",
    "COOLDOWN", "ERROR"
};

// ============================================================================
// GLOBALS
// ============================================================================
Integrall::System integrall;

BinState currentState = STATE_IDLE;
int capServoIdx       = -1;
int doorServoIdx      = -1;
int collectorServoIdx = -1;

int presenceCount = 0;
unsigned long stateTimer = 0;
unsigned long cooldownStart = 0;

// Track current servo angles for duration estimation
int capCurrentAngle       = CAP_CLOSED;
int doorCurrentAngle      = DOOR_CLOSED;
int collectorCurrentAngle = COLLECTOR_NEUTRAL;

String lastCategory   = "";
float  lastConfidence = 0.0;
String lastObject     = "";

// ============================================================================
// HELPER: Move servo slowly (blocking, using easeTo + estimated wait)
// ============================================================================
int* getAngleTracker(int servoIdx) {
    if (servoIdx == capServoIdx)       return &capCurrentAngle;
    if (servoIdx == doorServoIdx)      return &doorCurrentAngle;
    if (servoIdx == collectorServoIdx) return &collectorCurrentAngle;
    return nullptr;
}

void moveServoSlow(int servoIdx, int targetAngle, uint32_t speedMs = SERVO_SPEED_MS) {
    int* currentAngle = getAngleTracker(servoIdx);
    int steps = currentAngle ? abs(targetAngle - *currentAngle) : 90;
    unsigned long waitTime = (unsigned long)steps * speedMs + 200; // estimated duration + margin

    integrall.easeServo(servoIdx, targetAngle, speedMs);

    unsigned long start = millis();
    while (millis() - start < waitTime) {
        integrall.handle();
        delay(1);
    }

    integrall.setServo(servoIdx, targetAngle);
    if (currentAngle) *currentAngle = targetAngle;
}

// ============================================================================
// HELPER: Set collector position based on category
// ============================================================================
int getCategoryAngle(const String& category) {
    if (category == "plastic" || category == "nylon") return COLLECTOR_PLASTIC;
    if (category == "metal")                          return COLLECTOR_METAL;
    if (category == "organic" || category == "paper") return COLLECTOR_ORGANIC;
    return COLLECTOR_NEUTRAL; // unknown
}

// ============================================================================
// HELPER: Send image to backend via HTTP POST multipart
// ============================================================================
bool sendImageToBackend(camera_fb_t* fb) {
    String url = String(BACKEND_URL) + "/api/detect";
    
    int status = integrall.httpPostFile(
        url.c_str(),
        fb->buf,
        fb->len,
        "capture.jpg",   // filename
        "image",         // form field key
        "device_id",     // extra field key
        integrall.getDeviceId() // extra field value
    );
    
    if (status == 200) {
        // Parse response
        const char* response = integrall.getLastResponse();
        StaticJsonDocument<512> doc;
        DeserializationError error = deserializeJson(doc, response);
        
        if (!error) {
            lastCategory   = doc["category"].as<String>();
            lastConfidence = doc["confidence"].as<float>();
            lastObject     = doc["object"].as<String>();
            
            Serial.println("=== BACKEND RESPONSE ===");
            Serial.print("Category: "); Serial.println(lastCategory);
            Serial.print("Object:   "); Serial.println(lastObject);
            Serial.print("Confidence: "); Serial.println(lastConfidence, 2);
            Serial.println("========================");
            return true;
        } else {
            Serial.print("JSON parse error: ");
            Serial.println(error.c_str());
        }
    } else {
        Serial.print("HTTP POST failed, status: ");
        Serial.println(status);
    }
    return false;
}

// ============================================================================
// STATE MACHINE HANDLER
// ============================================================================
void handleStateMachine() {
    switch (currentState) {
        
        // ----- IDLE: Monitor ultrasonic sensor -----
        case STATE_IDLE: {
            float distance = integrall.readDistance(TRIG_PIN, ECHO_PIN, 3);
            
            if (distance > 0 && distance < PRESENCE_THRESHOLD_CM) {
                presenceCount++;
                if (presenceCount >= PRESENCE_CONFIRMS) {
                    Serial.println("[STATE] Person detected!");
                    currentState = STATE_PRESENCE_DETECTED;
                    presenceCount = 0;
                }
            } else {
                presenceCount = 0;
            }
            break;
        }
        
        // ----- PRESENCE DETECTED: Open the lid -----
        case STATE_PRESENCE_DETECTED: {
            Serial.println("[STATE] Opening lid...");
            
            #if BUZZER_PIN >= 0
            integrall.buzzerBeep(200);
            #endif
            
            // Open cap servo (slow)
            moveServoSlow(capServoIdx, CAP_OPEN);
            
            stateTimer = millis();
            currentState = STATE_LID_OPEN;
            break;
        }
        
        // ----- LID OPEN: Wait for user to drop waste -----
        case STATE_LID_OPEN: {
            if (millis() - stateTimer > LID_OPEN_WAIT_MS) {
                Serial.println("[STATE] Lid wait done, preparing capture...");
                currentState = STATE_CAPTURING;
            }
            break;
        }
        
        // ----- CAPTURING: Take photo with ESP32-CAM -----
        case STATE_CAPTURING: {
            Serial.println("[STATE] Capturing waste image...");
            delay(CAPTURE_DELAY_MS); // Let camera settle
            
            camera_fb_t* fb = integrall.cameraCapture();
            if (fb) {
                Serial.print("Image captured: ");
                Serial.print(fb->len);
                Serial.println(" bytes");
                
                // Close lid while we process
                moveServoSlow(capServoIdx, CAP_CLOSED);
                
                currentState = STATE_SENDING;
                
                // Send to backend
                Serial.println("[STATE] Sending to backend...");
                bool success = sendImageToBackend(fb);
                integrall.cameraRelease(fb);
                
                if (success) {
                    currentState = STATE_SORTING;
                } else {
                    Serial.println("[ERROR] Backend failed, retrying...");
                    currentState = STATE_ERROR;
                }
            } else {
                Serial.println("[ERROR] Camera capture failed!");
                currentState = STATE_ERROR;
            }
            break;
        }
        
        // ----- SORTING: Move collector and open door -----
        case STATE_SORTING: {
            Serial.print("[STATE] Sorting waste as: ");
            Serial.println(lastCategory);
            
            // Step 1: Move collector to the correct bin position
            int targetAngle = getCategoryAngle(lastCategory);
            Serial.print("Collector -> "); Serial.println(targetAngle);
            moveServoSlow(collectorServoIdx, targetAngle);
            delay(500);
            
            // Step 2: Open door to release waste
            Serial.println("Door -> OPEN");
            moveServoSlow(doorServoIdx, DOOR_OPEN);
            delay(SORT_HOLD_MS); // Hold for waste to fall
            
            // Step 3: Close door
            Serial.println("Door -> CLOSED");
            moveServoSlow(doorServoIdx, DOOR_CLOSED);
            
            #if BUZZER_PIN >= 0
            integrall.buzzerSuccess();
            #endif
            
            currentState = STATE_RESETTING;
            break;
        }
        
        // ----- RESETTING: Return all servos to default -----
        case STATE_RESETTING: {
            Serial.println("[STATE] Resetting to idle positions...");
            
            // Return collector to neutral
            moveServoSlow(collectorServoIdx, COLLECTOR_NEUTRAL);
            
            // Ensure lid is closed
            integrall.setServo(capServoIdx, CAP_CLOSED);
            
            cooldownStart = millis();
            currentState = STATE_COOLDOWN;
            break;
        }
        
        // ----- COOLDOWN: Wait before accepting next item -----
        case STATE_COOLDOWN: {
            if (millis() - cooldownStart > COOLDOWN_MS) {
                Serial.println("[STATE] Ready for next item.");
                Serial.println("========================================");
                currentState = STATE_IDLE;
            }
            break;
        }
        
        // ----- ERROR: Attempt recovery -----
        case STATE_ERROR: {
            Serial.println("[STATE] Error recovery...");
            
            #if BUZZER_PIN >= 0
            integrall.buzzerFail();
            #endif
            
            // Close lid and reset servos
            integrall.setServo(capServoIdx, CAP_CLOSED);
            integrall.setServo(doorServoIdx, DOOR_CLOSED);
            integrall.setServo(collectorServoIdx, COLLECTOR_NEUTRAL);
            
            delay(3000);
            currentState = STATE_IDLE;
            break;
        }
    }
}

// ============================================================================
// SETUP
// ============================================================================
void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println();
    Serial.println("========================================");
    Serial.println("  Smart Waste Sorting Bin v1.0");
    Serial.println("  Powered by Integrall Framework");
    Serial.println("========================================");

    // Initialize Integrall with WiFi
    if (!integrall.begin(WIFI_SSID, WIFI_PASSWORD, BACKEND_URL)) {
        Serial.println("[FATAL] Integrall init failed!");
        while (true) delay(1000);
    }
    Serial.println("[OK] WiFi Connected");
    Serial.print("[OK] IP: ");
    Serial.println(integrall.getIPAddress());

    // Initialize Camera
    if (!integrall.enableCamera()) {
        Serial.println("[FATAL] Camera init failed!");
        while (true) delay(1000);
    }
    Serial.println("[OK] Camera Ready");

    // Initialize Servos with startup positions
    capServoIdx = integrall.enableServo(CAP_SERVO_PIN, CAP_CLOSED);
    doorServoIdx = integrall.enableServo(DOOR_SERVO_PIN, DOOR_CLOSED);
    collectorServoIdx = integrall.enableServo(COLLECTOR_SERVO_PIN, COLLECTOR_NEUTRAL);
    
    Serial.print("[OK] Servos initialized: cap="); Serial.print(capServoIdx);
    Serial.print(" door="); Serial.print(doorServoIdx);
    Serial.print(" collector="); Serial.println(collectorServoIdx);

    // Initialize Buzzer (optional)
    #if BUZZER_PIN >= 0
    integrall.enableBuzzer(BUZZER_PIN);
    integrall.buzzerBeep(100);
    delay(200);
    integrall.buzzerBeep(100);
    Serial.println("[OK] Buzzer Ready");
    #endif

    Serial.println("========================================");
    Serial.println("[READY] System operational. Monitoring...");
    Serial.println("========================================");
}

// ============================================================================
// LOOP
// ============================================================================
void loop() {
    integrall.handle(); // Framework background tasks (servo animations, WiFi, etc.)
    handleStateMachine();
    delay(50); // Small delay to prevent CPU thrashing
}