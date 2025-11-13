"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
// Import MqttClient untuk type safety
import mqtt, { MqttClient } from 'mqtt';

// --- Konfigurasi MQTT ---
const MQTT_BROKER_URL = 'ws://192.168.1.6:9001'; // Pastikan IP & Port WebSocket benar

const TOPICS = [
  'home/sensor/door',
  'home/sensor/mq6/lpg',
  'home/sensor/mq2/smoke',
  'home/sensor/button'
];

// --- Interface untuk data sensor ---
interface SensorData {
  doorStatus: string;
  mq6Lpg: string;
  mq2Smoke: string;
  buttonStatus: string;
  connectionStatus: string;
}

// --- Interface BARU untuk apa yang disediakan Context ---
interface SensorContextType {
  sensorData: SensorData;
  publishMessage: (topic: string, message: string) => void;
}

// --- Ubah Context ---
const SensorContext = createContext<SensorContextType | undefined>(undefined);

// --- Ubah Provider ---
export const SensorProvider = ({ children }: { children: ReactNode }) => {
  
  // State untuk menyimpan koneksi client MQTT
  const [client, setClient] = useState<MqttClient | null>(null);

  // Ganti nama state 'data' menjadi 'sensorData'
  const [sensorData, setSensorData] = useState<SensorData>({
    doorStatus: '---',
    mq6Lpg: '---',
    mq2Smoke: '---',
    buttonStatus: '---',
    connectionStatus: 'Connecting...',
  });

  useEffect(() => {
    const mqttClient = mqtt.connect(MQTT_BROKER_URL);
    setClient(mqttClient);

    mqttClient.on('connect', () => {
      setSensorData((prev) => ({ ...prev, connectionStatus: 'Connected' }));
      mqttClient.subscribe(TOPICS);
    });

    mqttClient.on('error', (err) => {
      console.error('Connection error:', err);
      setSensorData((prev) => ({ ...prev, connectionStatus: `Error` }));
    });

    // === MODIFIKASI DI SINI ===
    mqttClient.on('message', (topic, message) => {
      const payload = message.toString();
      
      setSensorData((currentData) => {
        switch (topic) {
          case 'home/sensor/door':
            return { ...currentData, doorStatus: payload };
          case 'home/sensor/mq6/lpg':
            return { ...currentData, mq6Lpg: payload };
          case 'home/sensor/mq2/smoke':
            return { ...currentData, mq2Smoke: payload };
          
          // --- LOGIKA BARU UNTUK TOMBOL ---
          case 'home/sensor/button':
            if (payload === "PRESSED") {
              // 1. Set status menjadi "PRESSED"
              //    Ini akan memicu 'useEffect' di SystemStateContext
              
              // 2. Segera set timer untuk me-reset status
              //    Ini membuat tombol menjadi "satu kali tembak" (one-shot)
              setTimeout(() => {
                setSensorData(prev => ({ ...prev, buttonStatus: '---' }));
              }, 100); // Reset setelah 100ms
              
              return { ...currentData, buttonStatus: "PRESSED" };
            }
            return currentData; // Abaikan jika pesannya bukan "PRESSED"
          // --- AKHIR LOGIKA BARU ---

          default:
            return currentData;
        }
      });
    });
    // === AKHIR MODIFIKASI ===

    // Cleanup
    return () => {
      if (mqttClient) mqttClient.end();
    };
  }, []);

  // --- Fungsi BARU untuk mengirim pesan ---
  const publishMessage = (topic: string, message: string) => {
    if (client && client.connected) {
      client.publish(topic, message);
    } else {
      console.error("MQTT client is not connected, cannot publish.");
    }
  };

  const value = {
    sensorData,
    publishMessage
  };

  return (
    <SensorContext.Provider value={value}>
      {children}
    </SensorContext.Provider>
  );
};

// --- Hook (Fungsi pemanggil data) ---
export const useSensors = () => {
  const context = useContext(SensorContext);
  if (context === undefined) {
    throw new Error('useSensors must be used within a SensorProvider');
  }
  return context;
};