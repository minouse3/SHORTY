"use client";

import React, { createContext, useState, ReactNode, useEffect, useCallback, useRef } from 'react';
import { useToast } from "@/hooks/use-toast";
import { User, Flame, CloudFog, Gauge, DoorOpen, ShieldAlert, ShieldCheck, BellRing } from 'lucide-react';
// 1. Import Socket.IO client
import { io, Socket } from "socket.io-client";

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

// Initial mock data for detected faces
const initialMockActivities: Notification[] = [
    // Data mock awal ini masih ada, tetapi data baru akan datang dari backend
    {
      id: "1",
      type: "activity",
      title: "Jane Doe",
      description: "Known person detected at the front door.",
      status: "Known",
      timestamp: new Date(Date.now() - 3600000 * 1), // 1 hour ago
      imageUrl: "https://picsum.photos/seed/person1/100/100",
      imageHint: "woman face",
    },
    // ... (sisa data mock)
];

type DoorStatus = "Open" | "Closed";
type Status = "Normal" | "Danger";
type GasStatus = "Safe" | "Warning" | "Danger";

export interface SystemStateContextType {
  doorStatus: DoorStatus;
  activities: Notification[]; // Now uses Notification type
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>, showToast?: boolean) => void;
  isAlarmActive: boolean;
  toggleAlarm: () => void;
  fireStatus: Status; // This will be the derived status
  smokeDetectionStatus: Status; // This will be the derived status
  smokeStatus: GasStatus;
  lpgStatus: GasStatus;
  lpgPpm: number;
  smokePpm: number;
  resetKitchenAlerts: () => void;
  recognizePerson: (notificationId: string) => void;
}


export const SystemStateContext = createContext<SystemStateContextType | null>(null);

// 2. Define Backend URL
const BACKEND_URL = "http://localhost:5000";

export const SystemStateProvider = ({ children }: { children: ReactNode }) => {
    const { toast } = useToast();
    const [doorStatus, setDoorStatus] = useState<DoorStatus>("Closed");
    // Gunakan data mock sebagai state awal
    const [notifications, setNotifications] = useState<Notification[]>(initialMockActivities);
    const [isAlarmActive, setIsAlarmActive] = useState(false);

    // --- NEW STATE LOGIC ---
    const [backendFireStatus, setBackendFireStatus] = useState<Status>("Normal");
    const [backendSmokeStatus, setBackendSmokeStatus] = useState<Status>("Normal");
    const [isFireAcknowledged, setIsFireAcknowledged] = useState(true);
    const [isSmokeAcknowledged, setIsSmokeAcknowledged] = useState(true);
    
    // These are for the PPM sensors (still simulated)
    const [smokeStatus, setSmokeStatus] = useState<GasStatus>("Safe");
    const [lpgStatus, setLpgStatus] = useState<GasStatus>("Safe");
    const [lpgPpm, setLpgPpm] = useState(0);
    const [smokePpm, setSmokePpm] = useState(0);

    // 3. Store socket in a ref
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
        setIsAlarmActive(prev => !prev);
    };

    // 4. Update resetKitchenAlerts to ONLY update acknowledged state
    const resetKitchenAlerts = () => {
        setIsFireAcknowledged(true);
        setIsSmokeAcknowledged(true);
        setLpgStatus("Safe");
        setSmokeStatus("Safe");
        setLpgPpm(Math.round(Math.random() * 300));
        setSmokePpm(Math.round(Math.random() * 100));
    };

    const recognizePerson = (notificationId: string) => {
        setNotifications(prev => 
            prev.map(n => 
                n.id === notificationId 
                ? { ...n, status: "Known", title: "Newly Recognized Person", description: "This person has been added to the database." } 
                : n
            )
        );
    };

    // 5. This useEffect now handles the *real* connection
    useEffect(() => {
        const isStandBy = () => (document.getElementById('mode-switch') as HTMLButtonElement)?.getAttribute('data-state') === 'checked';

        // --- 5a. Initialize Socket.IO Connection ---
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

        // --- 5b. Listen for REAL Hazard Alerts ---
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

        // --- 5c. NEW: Listen for Hazard Cleared ---
        socket.on('hazard_cleared', (data) => {
            if (data.sensor.includes('Fire')) {
                setBackendFireStatus('Normal');
            } else if (data.sensor.includes('Smoke')) {
                setBackendSmokeStatus('Normal');
            }
        });

        // --- TAMBAHAN: Listener untuk Deteksi Wajah ---
        socket.on('activity_alert', (data) => {
            // data = { title: "Jane Doe", status: "Known", description: "...", imageUrl: "data:image/jpeg;base64,..." }
            addNotification({
                type: 'activity',
                title: data.title,
                description: data.description,
                status: data.status as "Known" | "Unknown",
                imageUrl: data.imageUrl, // Backend mengirimkan data URI
                imageHint: "face",
            }, false); // false = jangan tampilkan toast
        });
        // --- AKHIR BLOK TAMBAHAN ---

        
        // --- 5d. Keep Simulations for Data Backend Doesn't Provide ---

        // Simulate door sensor data changes
        const doorInterval = setInterval(() => {
            setDoorStatus((prevStatus) => {
                const newStatus = Math.random() > 0.9 ? "Open" : "Closed";
                if (prevStatus !== newStatus) {
                    addNotification({
                        type: 'door',
                        title: `Door ${newStatus}`,
                        description: `The front door was ${newStatus.toLowerCase()}.`,
                        status: newStatus,
                    }, false);
                    
                    if (isStandBy() && newStatus === 'Open' && !isAlarmActive) {
                        setIsAlarmActive(true);
                         addNotification({
                            type: 'alarm',
                            title: 'ALARM ACTIVATED',
                            description: 'The door was opened while in Stand by mode.',
                        }, true);
                    }

                    return newStatus;
                }
                return prevStatus;
            });
        }, 5000);

        // --- BLOK YANG DIUBAH (DIKOMENTARI) ---
        /*
        // Simulate new face detection events (SUDAH TIDAK DIPERLUKAN)
        const activityInterval = setInterval(() => {
            if (Math.random() > 0.8) { // Don't add activities too frequently
                const newActivity: Omit<Notification, 'id' | 'timestamp'> = {
                    type: 'activity',
                    title: "Unknown Person",
                    description: "An unknown person was detected at the front door.",
                    status: "Unknown",
                    imageUrl: `https://picsum.photos/seed/${Date.now()}/100/100`,
                    imageHint: "face",
                };
                addNotification(newActivity, false); // No toast for background events
            }
        }, 20000);
        */
        // --- AKHIR BLOK YANG DIUBAH ---


        // Kitchen gas sensor simulation (LPG/Smoke PPM)
        const kitchenInterval = setInterval(() => {
            // ... (logika simulasi gas tetap ada)
            if (backendFireStatus === 'Normal' && backendSmokeStatus === 'Normal') {
                const randomLpg = Math.random() * 1500;
                // ... (sisa logika simulasi)
            }
        }, 5000);


        // 5e. Cleanup
        return () => {
            clearInterval(doorInterval);
            // clearInterval(activityInterval); // <-- DIKOMENTARI
            clearInterval(kitchenInterval);
            socket.disconnect();
        };
    // 6. Update dependencies
    }, [addNotification, lpgStatus, smokeStatus, isAlarmActive, backendFireStatus, backendSmokeStatus]); // Added backend status to deps

    // --- 7. DERIVE THE FINAL UI STATUS ---
    // (Logika ini tidak diubah)
    const fireStatus: Status = 
        (backendFireStatus === "Normal" && isFireAcknowledged) 
        ? "Normal" 
        : "Danger";

    const smokeDetectionStatus: Status =
        (backendSmokeStatus === "Normal" && isSmokeAcknowledged)
        ? "Normal"
        : "Danger";


    const value = {
        doorStatus,
        activities: notifications.filter(n => n.type === 'activity'), 
        notifications,
        addNotification,
        isAlarmActive,
        toggleAlarm,
        fireStatus, 
        smokeDetectionStatus, 
        smokeStatus,
        lpgStatus,
        lpgPpm,
        smokePpm,
        resetKitchenAlerts,
        recognizePerson,
    };

    return (
        <SystemStateContext.Provider value={value}>
            {children}
        </SystemStateContext.Provider>
    );
};