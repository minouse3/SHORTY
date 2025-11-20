//LIBRARY WIFI & MQTT
#include <WiFi.h>
#include <PubSubClient.h>

//KONFIGURASI WIFI & MQTT
const char* ssid = "AXL";
const char* password = "GunNRoses";
const char* mqtt_server = "192.168.1.6";
const int mqtt_port = 1883;
const char* clientID = "esp32-sensor-client";

//Topik MQTT
const char* topic_door = "home/sensor/door";
const char* topic_mq6_lpg = "home/sensor/mq6/lpg";
const char* topic_mq2_smoke = "home/sensor/mq2/smoke";
const char* topic_button = "home/sensor/button";
const char* topic_buzzer_command = "home/control/buzzer";

WiFiClient espClient;
PubSubClient client(espClient);

//SENSOR & PIN
#define BUTTON_PIN 5
#define DOOR_SENSOR_PIN 19

const int RED_LED_PIN = 23;
const int GREEN_LED_PIN = 22;
const int RED_LED_PIN_2 = 25;
const int GREEN_LED_PIN_2 = 26;
const int BUZZER = 18;
const int BUZZER_2 = 12;

//VARIABEL GLOBAL SENSOR
int currentDoorState;
int lastDoorState = digitalRead(DOOR_SENSOR_PIN) == HIGH ? LOW : HIGH;
int currentButtonState;
int lastButtonState = HIGH;

bool alarmMq6Aktif = false;
bool alarmMq2Aktif = false;

unsigned long lastSensorRead = 0;
const long sensorInterval = 2000; 

//Definisi dan variabel MQ6 & MQ2 Anda
#define MQ6_PIN A0
float Ref_V = 3300.0;
float RL_MQ6 = 1.0;
float Ro_MQ6 = 10.0;
float mVolt_MQ6 = 0.0;
const float Ro_clean_air_factor_MQ6 = 10.0;
const int THRESHOLD_PPM = 100;

#define MQ2_PIN 35
#define RL_VALUE 10
#define RO_CLEAN_AIR_FACTOR 9.83
#define CALIBARAION_SAMPLE_TIMES 50
#define CALIBRATION_SAMPLE_INTERVAL 500
#define READ_SAMPLE_INTERVAL 50
#define READ_SAMPLE_TIMES 5
#define GAS_LPG   0
#define GAS_CO    1
#define GAS_SMOKE 2
float LPGCurve[3]   = {2.3, 0.21, -0.47};
float COCurve[3]    = {2.3, 0.72, -0.34};
float SmokeCurve[3] = {2.3, 0.53, -0.44};
float Ro_MQ2 = 10.0;
const int THRESHOLD_MQ2 = 100;


//FUNGSI KONEKSI
void setup_wifi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.println();
  Serial.print("Connecting to ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  int retries = 0;
  while (WiFi.status() != WL_CONNECTED && retries < 20) {
    delay(500);
    Serial.print(".");
    retries++;
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected");
    Serial.print("IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\nWiFi connection FAILED.");
  }
}

void reconnect() {
  while (!client.connected()) {
    Serial.print("Attempting MQTT connection...");
    if (client.connect(clientID)) {
      Serial.println("connected");
      client.subscribe(topic_buzzer_command);
      Serial.print("Subscribed to: ");
      Serial.println(topic_buzzer_command);
    } else {
      Serial.print("failed, rc=");
      Serial.print(client.state());
      Serial.println(" try again in 5 seconds");
      delay(5000);
    }
  }
}

//FUNGSI CALLBACK
void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  char message[length + 1];
  for (int i = 0; i < length; i++) {
    message[i] = (char)payload[i];
  }
  message[length] = '\0';
  Serial.println(message);

  if (strcmp(topic, topic_buzzer_command) == 0) {
    if (strcmp(message, "ON") == 0) {
      Serial.println("BUZZER_2 ON from Website");
      digitalWrite(BUZZER_2, HIGH);
    } else if (strcmp(message, "OFF") == 0) {
      Serial.println("BUZZER_2 OFF from Website");
      digitalWrite(BUZZER_2, LOW);
    }
  }
}

//SETUP
void setup() {
  Serial.begin(115200);
  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(callback);

  pinMode(DOOR_SENSOR_PIN, INPUT_PULLUP);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(RED_LED_PIN, OUTPUT);
  pinMode(GREEN_LED_PIN, OUTPUT);
  pinMode(RED_LED_PIN_2, OUTPUT);
  pinMode(GREEN_LED_PIN_2, OUTPUT);
  pinMode(BUZZER, OUTPUT);
  pinMode(BUZZER_2, OUTPUT);
  digitalWrite(RED_LED_PIN, LOW);
  digitalWrite(GREEN_LED_PIN, HIGH);
  digitalWrite(RED_LED_PIN_2, LOW);
  digitalWrite(GREEN_LED_PIN_2, HIGH);
  digitalWrite(BUZZER, LOW);
  digitalWrite(BUZZER_2, LOW);
  
  pinMode(MQ6_PIN, INPUT);
  Serial.println("Calibrating MQ6... wait 5s");
  delay(5000);
  mVolt_MQ6 = Get_mVolt_MQ6(MQ6_PIN);
  Ro_MQ6 = Calculate_Rs_MQ6(mVolt_MQ6) / Ro_clean_air_factor_MQ6;
  Serial.print("MQ6 Ro = "); Serial.println(Ro_MQ6);
  mVolt_MQ6 = 0.0;
  
  analogReadResolution(12);
  analogSetPinAttenuation(MQ2_PIN, ADC_11db);
  Serial.println("Calibrating MQ2... wait 5s");
  delay(5000);
  Ro_MQ2 = MQ2_Calibration(MQ2_PIN);
  Serial.print("MQ2 Ro = "); Serial.println(Ro_MQ2);
  Serial.println("Setup complete!\n");
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    setup_wifi();
    return;
  }
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  unsigned long currentMillis = millis();
  if (currentMillis - lastSensorRead >= sensorInterval) {
    lastSensorRead = currentMillis;

    checkDoorState();
    checkButtonState();
    readMQ6();
    readMQ2();

    if (alarmMq6Aktif || alarmMq2Aktif) {
      digitalWrite(BUZZER, HIGH);
    } else {
      digitalWrite(BUZZER, LOW);
    }
  }
}

void checkButtonState() {
  currentButtonState = digitalRead(BUTTON_PIN);
  if (lastButtonState == HIGH && currentButtonState == LOW) {
    Serial.println("Button Pressed! Publishing...");
    client.publish(topic_button, "PRESSED");
  }
  lastButtonState = currentButtonState;
}

void checkDoorState() {
  currentDoorState = digitalRead(DOOR_SENSOR_PIN);
  if (currentDoorState != lastDoorState) {
    if (currentDoorState == HIGH) {
      Serial.println("🚪 Door opened! Publishing...");
      client.publish(topic_door, "OPEN");
    } else { // LOW = Closed
      Serial.println("🚪 Door closed! Publishing...");
      client.publish(topic_door, "CLOSED");
    }
    lastDoorState = currentDoorState;
  }
}

float Calculate_Rs_MQ6(float Vo) {
  return (Ref_V - Vo) * (RL_MQ6 / Vo);
}

float Get_mVolt_MQ6(byte AnalogPin) {
  int ADC_Value = analogRead(AnalogPin);
  float mVolt = ADC_Value * (Ref_V / 4096.0);
  return mVolt;
}

unsigned int LPG_PPM_MQ6(float RsRo_ratio) {
  float ppm = pow((RsRo_ratio / 18.446), (1 / -0.421));
  return (unsigned int)ppm;
}

void readMQ6() {
  for (int i = 0; i < 200; i++) mVolt_MQ6 += Get_mVolt_MQ6(MQ6_PIN);
  mVolt_MQ6 /= 200.0;
  float Rs = Calculate_Rs_MQ6(mVolt_MQ6);
  float ratio = Rs / Ro_MQ6;
  unsigned int lpg_ppm = LPG_PPM_MQ6(ratio);

  Serial.print("🔥 MQ6 LPG: ");
  Serial.print(lpg_ppm);
  Serial.println(" ppm");
  char lpg_payload[10];
  snprintf(lpg_payload, 10, "%u", lpg_ppm);
  client.publish(topic_mq6_lpg, lpg_payload);
  if (lpg_ppm > THRESHOLD_PPM) {
    digitalWrite(RED_LED_PIN, HIGH);
    digitalWrite(GREEN_LED_PIN, LOW);
    alarmMq6Aktif = true;
  } else {
    digitalWrite(RED_LED_PIN, LOW);
    digitalWrite(GREEN_LED_PIN, HIGH);
    alarmMq6Aktif = false;
  }
  mVolt_MQ6 = 0.0;
}

float MQ2_ResistanceCalculation(int raw_adc) {
  return ((float)RL_VALUE * (4095 - raw_adc) / raw_adc);
}

float MQ2_Calibration(int mq_pin) {
  float val = 0;
  for (int i = 0; i < CALIBARAION_SAMPLE_TIMES; i++) {
    val += MQ2_ResistanceCalculation(analogRead(mq_pin));
    delay(CALIBRATION_SAMPLE_INTERVAL);
  }
  val /= CALIBARAION_SAMPLE_TIMES;
  val /= RO_CLEAN_AIR_FACTOR;
  return val;
}

float MQ2_Read(int mq_pin) {
  float rs = 0;
  for (int i = 0; i < READ_SAMPLE_TIMES; i++) {
    rs += MQ2_ResistanceCalculation(analogRead(mq_pin));
    delay(READ_SAMPLE_INTERVAL);
  }
  rs /= READ_SAMPLE_TIMES;
  return rs;
}

float MQ2_GetPercentage(float rs_ro_ratio, float *pcurve) {
  return pow(10, ((log10(rs_ro_ratio) - pcurve[1]) / pcurve[2]) + pcurve[0]);
}

float MQ2_GetGasPercentage(float rs_ro_ratio, int gas_id) {
  if (gas_id == GAS_LPG) return MQ2_GetPercentage(rs_ro_ratio, LPGCurve);
  else if (gas_id == GAS_CO) return MQ2_GetPercentage(rs_ro_ratio, COCurve);
  else if (gas_id == GAS_SMOKE) return MQ2_GetPercentage(rs_ro_ratio, SmokeCurve);
  return 0;
}

void readMQ2() {
  float rs = MQ2_Read(MQ2_PIN);
  float ratio = rs / Ro_MQ2;
  float lpg = MQ2_GetGasPercentage(ratio, GAS_LPG);
  float co = MQ2_GetGasPercentage(ratio, GAS_CO);
  float smoke = MQ2_GetGasPercentage(ratio, GAS_SMOKE);
  Serial.print("💨 SMOKE: "); Serial.print(smoke);
  Serial.println(" ppm");
  char smoke_payload[10];
  dtostrf(smoke, 4, 2, smoke_payload);
  client.publish(topic_mq2_smoke, smoke_payload);

  if (smoke > THRESHOLD_MQ2) {
    digitalWrite(RED_LED_PIN_2, HIGH);
    digitalWrite(GREEN_LED_PIN_2, LOW);
    alarmMq2Aktif = true;
  } else {
    digitalWrite(RED_LED_PIN_2, LOW);
    digitalWrite(GREEN_LED_PIN_2, HIGH);
    alarmMq2Aktif = false;
  }
}