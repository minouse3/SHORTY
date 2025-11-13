"use client";

import React, { createContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { useToast } from "@/hooks/use-toast";
import { User, Flame, CloudFog, Gauge, DoorOpen, ShieldAlert, ShieldCheck, BellRing } from 'lucide-react';
import { io, Socket } from "socket.io-client";
// 1. IMPORT THE MQTT SENSOR HOOK
import { useSensors } from './SensorContext';

// Unified Notification Type
export type NotificationType = "activity" | "door" | "alarm" | "kitchen_fire" | "kitchen_smoke" | "kitchen_gas" | "system";
export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: Date;
  status?: "Known" | "Unknown" | "Danger" | "Warning" | "Safe" | "Normal" | "Open" | "Closed";
  imageUrl?: string;
  imageHint?: string;
}

type DoorStatus = "Open" | "Closed";
type Status = "Normal" | "Danger";
type GasStatus = "Safe" | "Warning" | "Danger";
// 2. ADD SYSTEMMODE TYPE
type SystemMode = 'Passive' | 'Stand by';

export interface SystemStateContextType {
  doorStatus: DoorStatus;
  activities: Notification[];
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>, showToast?: boolean) => void;
  isAlarmActive: boolean;
  toggleAlarm: () => void;
  fireStatus: Status;
  smokeDetectionStatus: Status;
  smokeStatus: GasStatus;
  lpgStatus: GasStatus;
  lpgPpm: number;
  smokePpm: number;
  resetKitchenAlerts: () => void;
  // 3. ADD THE NEW "ADD PERSON" FUNCTION
  addNewPersonToDatabase: (name: string, imageUrl: string) => void;
  // 4. ADD MODE AND SETTER TO INTERFACE
  mode: SystemMode;
  setSystemMode: (mode: SystemMode) => void;
}


export const SystemStateContext = createContext<SystemStateContextType | null>(null);

const BACKEND_URL = "http://localhost:5000";

export const SystemStateProvider = ({ children }: { children: ReactNode }) => {
    const { toast } = useToast();
    // 5. GET MQTT DATA AND PUBLISH FUNCTION
    const { sensorData, publishMessage } = useSensors();
    const { 
      doorStatus: mqttDoorStatus, 
      mq6Lpg: mqttMq6Lpg, 
      mq2Smoke: mqttMq2Smoke,
      buttonStatus: mqttButtonStatus,
      connectionStatus
    } = sensorData;

    // --- Application State ---
    const [doorStatus, setDoorStatus] = useState<DoorStatus>("Closed");
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isAlarmActive, setIsAlarmActive] = useState(false);

    // Socket.IO Video Alert State
    const [backendFireStatus, setBackendFireStatus] = useState<Status>("Normal");
    const [backendSmokeStatus, setBackendSmokeStatus] = useState<Status>("Normal");
    const [isFireAcknowledged, setIsFireAcknowledged] = useState(true);
    const [isSmokeAcknowledged, setIsSmokeAcknowledged] = useState(true);
    
    // MQTT Sensor State
    const [smokeStatus, setSmokeStatus] = useState<GasStatus>("Safe");
    const [lpgStatus, setLpgStatus] = useState<GasStatus>("Safe");
    const [lpgPpm, setLpgPpm] = useState(0);
    const [smokePpm, setSmokePpm] = useState(0);

    // 6. ADD MODE STATE AND SETTER FUNCTION
    const [mode, setMode] = useState<SystemMode>('Passive');
    
    const setSystemMode = (newMode: SystemMode) => {
        setMode(newMode);
        addNotification({
            type: 'system',
            title: `System Mode: ${newMode}`,
            description: newMode === 'Stand by' 
                ? "Automatic alarm is now enabled." 
                : "Automatic alarm is now disabled.",
        });
    };

    const socketRef = useRef<Socket | null>(null);

    const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>, showToast: boolean = true) => {
        const newNotification: Notification = {
            ...notification,
            id: `notif-${Date.now()}-${Math.random()}`,
            timestamp: new Date(),
        };

        setNotifications(prev => [newNotification, ...prev]);

        if (showToast) {
            toast({
                variant: notification.type === 'alarm' || notification.status === 'Danger' ? 'destructive' : 'default',
                title: newNotification.title,
                description: newNotification.description,
            });
        }
    }, [toast]);
    

    const toggleAlarm = () => {
      // Logic is now handled by the useEffect for isAlarmActive
      setIsAlarmActive(prev => !prev);
    };

    // 7. UPDATE RESETKITCHENALERTS
    const resetKitchenAlerts = () => {
        setIsFireAcknowledged(true); // Resets camera fire alert
        setIsSmokeAcknowledged(true); // Resets camera smoke alert
        setLpgStatus("Safe"); // Resets MQTT LPG alert
        setSmokeStatus("Safe"); // Resets MQTT Smoke alert
        // We no longer reset PPMs
        addNotification({
            type: 'system',
            title: 'Kitchen Alerts Reset',
            description: 'All kitchen sensor statuses have been manually reset to safe.',
        });
    };

    // 8. ADD THE NEW "ADD PERSON" FUNCTION
    const addNewPersonToDatabase = (name: string, imageUrl: string) => {
      if (socketRef.current && name.trim() !== "" && imageUrl) {
        // The imageUrl from 'activity_alert' is a data URI, perfect for sending
        // We assume the backend is listening for an "add_new_person" event
        socketRef.current.emit('add_new_person', { name, image: imageUrl });
        
        // Add a local notification (no toast)
        addNotification({
          type: 'system',
          title: 'Database Updated',
          description: `Sent request to add "${name}" to the database.`,
          status: 'Normal'
        }, false);
      } else {
        console.error("Socket not connected or data missing for adding new person.");
        addNotification({
          type: 'system',
          title: 'Error',
          description: `Could not send request to add "${name}". Socket not connected.`,
          status: 'Warning'
        }, true);
      }
    };

    // --- 9. USEEFFECT (SOCKET.IO) ---
    // This effect ONLY handles Socket.IO connections.
    useEffect(() => {
        const socket = io(BACKEND_URL);
        socketRef.current = socket;

        socket.on('connect', () => {
            console.log('Socket.IO Connected to Backend');
            addNotification({
                type: 'system',
                title: 'System Connected',
                description: 'Successfully connected to the backend server.',
                status: 'Normal'
            }, false);
        });

        // Socket.IO listener for camera-based "Fire" or "Smoke"
        socket.on('hazard_alert', (data) => {
            let type: NotificationType = 'system';
            
            if (data.sensor.includes('Fire')) {
                type = 'kitchen_fire';
                setBackendFireStatus('Danger');
                setIsFireAcknowledged(false); 
            } else if (data.sensor.includes('Smoke')) {
                type = 'kitchen_smoke';
                setBackendSmokeStatus('Danger');
                setIsSmokeAcknowledged(false);
            }

            addNotification({
                type: type,
                title: `🔥 ${data.sensor} Alert!`,
                description: data.description,
                status: 'Danger',
            }, true); 
        });

        socket.on('hazard_cleared', (data) => {
            if (data.sensor.includes('Fire')) {
                setBackendFireStatus('Normal');
            } else if (data.sensor.includes('Smoke')) {
                setBackendSmokeStatus('Normal');
            }
        });

        // Socket.IO listener for face recognition
        socket.on('activity_alert', (data) => {
            addNotification({
                type: 'activity',
                title: data.title,
                description: data.description,
                status: data.status as "Known" | "Unknown",
                imageUrl: data.imageUrl,
                imageHint: "face",
            }, false);
        });
        
        // Cleanup Socket.IO connection
        return () => {
            socket.disconnect();
        };
    }, [addNotification]);


    // --- 10. NEW USEEFFECTS FOR MQTT DATA ---

    // Publishes alarm state to MQTT (for the buzzer)
    useEffect(() => {
        if (connectionStatus !== 'Connected') return;
        const commandTopic = "home/control/buzzer";
        const message = isAlarmActive ? "ON" : "OFF";
        publishMessage(commandTopic, message);
    }, [isAlarmActive, connectionStatus, publishMessage]);

    // Handles logic for MQTT Door Sensor
    useEffect(() => {
        if (connectionStatus !== 'Connected' || mqttDoorStatus === '---') return;
        const newStatus = mqttDoorStatus === 'OPEN' ? 'Open' : 'Closed';

        if (doorStatus !== newStatus) {
            setDoorStatus(newStatus);
            addNotification({
                type: 'door',
                title: `Door ${newStatus}`,
                description: `The front door was ${newStatus.toLowerCase()}.`,
                status: newStatus,
            }, false); // No toast for simple open/close

            // AUTO-ALARM LOGIC
            if (newStatus === 'Open' && mode === 'Stand by' && !isAlarmActive) {
                setIsAlarmActive(true); 
                addNotification({
                    type: 'alarm',
                    title: 'ALARM ACTIVATED',
                    description: 'The door was opened while in Stand by mode.',
                }); // Show toast for this
            }
        }
    }, [mqttDoorStatus, doorStatus, connectionStatus, addNotification, mode, isAlarmActive]);

    // Handles logic for MQTT Guest Button
    useEffect(() => {
        if (connectionStatus !== 'Connected' || mqttButtonStatus === '---') return;
        if (mqttButtonStatus === "PRESSED") {
            addNotification({
                type: 'activity', 
                title: 'Guest at Door',
                description: 'The guest button was just pressed.',
                status: 'Normal',
            });
        }
    }, [mqttButtonStatus, connectionStatus, addNotification]);

    // Handles logic for MQTT Kitchen Sensors (MQ2, MQ6)
    useEffect(() => {
        if (connectionStatus !== 'Connected') return;
        
        // Parse values, default to 0 if invalid
        const lpg = parseFloat(mqttMq6Lpg) || 0;
        const smoke = parseFloat(mqttMq2Smoke) || 0;
        
        // Update PPM values for the UI
        setLpgPpm(lpg);
        setSmokePpm(smoke);

        // Determine LPG Status
        let newLpgStatus: GasStatus = 'Safe';
        if (lpg > 700) newLpgStatus = 'Danger';
        else if (lpg > 300) newLpgStatus = 'Warning';
        
        if (lpgStatus !== newLpgStatus) {
            setLpgStatus(newLpgStatus);
            if (newLpgStatus !== 'Safe') {
                addNotification({ type: 'kitchen_gas', title: 'LPG Gas Alert', description: `LPG level is now ${newLpgStatus}.`, status: newLpgStatus });
            }
        }

        // Determine Smoke Status
        let newSmokeStatus: GasStatus = 'Safe';
        if (smoke > 500) newSmokeStatus = 'Danger';
        else if (smoke > 200) newSmokeStatus = 'Warning';

        if (smokeStatus !== newSmokeStatus) {
            setSmokeStatus(newSmokeStatus);
            if (newSmokeStatus !== 'Safe') {
                addNotification({ type: 'kitchen_smoke', title: 'Smoke Level Alert', description: `Smoke level is now ${newSmokeStatus}.`, status: newSmokeStatus });
            }
        }
    }, [mqttMq6Lpg, mqttMq2Smoke, connectionStatus, addNotification, lpgStatus, smokeStatus]);


    // --- 11. DERIVED UI STATUS ---
    // This combines Socket.IO alerts with user acknowledgement
    const fireStatus: Status = 
        (backendFireStatus === "Normal" && isFireAcknowledged) 
        ? "Normal" 
        : "Danger";

    const smokeDetectionStatus: Status =
        (backendSmokeStatus === "Normal" && isSmokeAcknowledged)
        ? "Normal"
        : "Danger";


    // 12. ADD MODE AND SETTER TO CONTEXT VALUE
    const value = {
        doorStatus, // From MQTT
        activities: notifications.filter(n => n.type === 'activity'), 
        notifications,
        addNotification,
        isAlarmActive,
        toggleAlarm,
        fireStatus, // Derived from Socket.IO
        smokeDetectionStatus, // Derived from Socket.IO
        smokeStatus, // From MQTT
        lpgStatus, // From MQTT
        lpgPpm, // From MQTT
        smokePpm, // From MQTT
        resetKitchenAlerts,
        addNewPersonToDatabase, // NEW
        mode, // NEW
        setSystemMode, // NEW
    };

    return (
        <SystemStateContext.Provider value={value}>
            {children}
        </SystemStateContext.Provider>
    );
};