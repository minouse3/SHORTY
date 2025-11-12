# **App Name**: ShortyGuard

## Core Features:

- Kitchen Camera Feed: Display live video feed from the kitchen camera.
- Fire/Smoke Detection: Analyze kitchen camera feed for fire and smoke.  Change the Fire Status or Smoke status to Danger and trigger notifications when detected. Send a notification to the user.
- LPG Gas Status: Display LPG gas status based on data from the ESP32/MQ2 sensor.
- Front Door Camera Feed: Display live video feed from the front door camera.
- Facial Recognition: Detect and recognize faces near the front door, send notifications with captured faces, and prompt for confirmation of identity. The facial recognition model is a tool that assists the system's decision-making process for identifying individuals.
- Automated Response System: Based on user input (knows the person/doesn't know), provide automated instructions, alerts, and alarm triggers, including notification and a timer for people to leave. When people didn't leave after 1 minute the system ring an alarm.

## Style Guidelines:

- Primary color: Deep sky blue (#42A5F5) to evoke trust and security.
- Background color: Light blue (#E3F2FD) to complement the primary color and maintain a clean interface.
- Accent color: Soft orange (#FFCC80) to highlight interactive elements and notifications.
- Font pairing: 'Space Grotesk' for headlines and 'Inter' for body text; Space Grotesk is a proportional sans-serif, and Inter is a grotesque-style sans-serif.
- Use clean, modern icons to represent security features and statuses.
- Prioritize a clear, intuitive layout with distinct sections for each camera feed and sensor data.
- Implement subtle animations to indicate status changes and notifications, such as color changes or scaling effects.