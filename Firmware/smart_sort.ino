#include <ESP32Servo.h>
#include <WiFi.h>
#include <HTTPClient.h>
#define INTEGRALL

const char* ssid = "Your_SSID";
const char* password = "Your_Password";


const char* serverUrl = "";


// Servo objects
Servo servo1;
Servo servo2;
Servo servo3;

void setup() {
  Serial.begin(115200);
  
}
void loop () {
  
}