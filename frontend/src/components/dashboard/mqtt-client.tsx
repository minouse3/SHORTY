// ...existing code...
import React, { useEffect, useRef, useState } from "react";

type SensorData = Record<string, any>;

interface Props {
  brokerUrl?: string; // e.g. "ws://192.168.1.100:9001"
  topic?: string;     // e.g. "esp32/sensor"
  options?: any;      // optional mqtt.connect options (username, password, etc.)
}

export default function MqttClient({
  brokerUrl = "ws://192.168.1.100:9001",
  topic = "esp32/sensor",
  options = {},
}: Props) {
  const clientRef = useRef<any | null>(null);
  const [connected, setConnected] = useState(false);
  const [data, setData] = useState<SensorData | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return; // avoid SSR
    let mounted = true;

    const start = async () => {
      try {
        // dynamic import so bundler picks browser build and avoid SSR issues
        const mqttModule = (await import("mqtt")) as any;
        const mqtt = mqttModule.default ?? mqttModule;
        const client = mqtt.connect(brokerUrl, options);
        clientRef.current = client;

        client.on("connect", () => {
          if (!mounted) return;
          setConnected(true);
          client.subscribe(topic, (err: any) => {
            if (err) setError(`Subscribe error: ${err.message ?? err}`);
          });
        });

        client.on("reconnect", () => setConnected(false));
        client.on("close", () => setConnected(false));

        client.on("message", (_topic: string, payload: Buffer) => {
          const msg = payload.toString();
          setLastMessage(msg);
          try {
            const parsed = JSON.parse(msg);
            setData(parsed);
          } catch {
            // not JSON, store raw text
          }
        });

        client.on("error", (err: any) => {
          setError(err?.message ?? String(err));
        });
      } catch (e: any) {
        setError(e?.message ?? String(e));
      }
    };

    start();

    return () => {
      mounted = false;
      if (clientRef.current) {
        try {
          clientRef.current.end(true);
        } catch {}
        clientRef.current = null;
      }
    };
  }, [brokerUrl, topic, options]);

  return (
    <div>
      <div>MQTT broker: {brokerUrl}</div>
      <div>Topic: {topic}</div>
      <div>Status: {connected ? "connected" : "disconnected"}</div>
      {error && <div style={{ color: "red" }}>Error: {error}</div>}
      <div>
        <strong>Sensor data:</strong>
        <pre>{data ? JSON.stringify(data, null, 2) : "no data yet"}</pre>
      </div>
      <div>
        <strong>Last message:</strong>
        <pre>{lastMessage ?? "—"}</pre>
      </div>
    </div>
  );
}
// ...existing code...