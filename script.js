// script.js - SMART HOME SECURITY SYSTEM

// ==================== GLOBAL VARIABLES ====================
let cameraStream = null;
let isCameraPaused = false;
let capturedImage = null;
let faceDetectionInterval = null;
let hazardNotificationTimeout = null;
let alarmAudio = null;
let faceDetectionLog = [];
let hazardDetectionLog = [];

// ==================== INITIALIZATION ====================
window.addEventListener("DOMContentLoaded", () => {
    initializeApp();
});

function initializeApp() {
    // Initialize default face logs
    initializeFaceLogs();
    
    // Initialize camera
    initializeCamera();
    
    // Initialize real-time clock
    initializeClock();
    
    // Initialize hazard sensors simulation
    initializeHazardSensors();
    
    // Initialize alarm sound
    initializeAlarm();
    
    // Set up event listeners
    setupEventListeners();
    
    console.log("Smart Home Security System initialized");
}

// ==================== FACE DETECTION SYSTEM ====================
function initializeCamera() {
    // Simulate camera initialization
    console.log("Camera initialized");
    startFaceDetectionSimulation();
}

function startFaceDetectionSimulation() {
    // Simulate random face detection every 5-10 seconds
    faceDetectionInterval = setInterval(() => {
        if (!isCameraPaused) {
            simulateRandomFaceDetection();
        }
    }, Math.random() * 5000 + 5000);
}

function simulateRandomFaceDetection() {
    const names = ["Tyas", "Unknown", "Guest", "Family Member"];
    const statuses = ["Recognized", "Unknown"];
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    
    simulateFace(randomStatus, randomName);
}

// Camera Control Functions
function toggleCameraPause() {
    isCameraPaused = !isCameraPaused;
    const pauseBtn = document.querySelector('.cam-btn.pause');
    
    if (isCameraPaused) {
        pauseBtn.innerHTML = '<img src="play.svg" alt="Play">';
        showNotification("Camera Paused", "Face detection has been paused");
    } else {
        pauseBtn.innerHTML = '<img src="pause.svg" alt="Pause">';
        showNotification("Camera Resumed", "Face detection is now active");
    }
}

function captureImage() {
    if (isCameraPaused) {
        showNotification("Camera Paused", "Please resume camera to capture image");
        return;
    }
    
    capturedImage = "captured-face.jpg"; // Simulated captured image
    showNotification("Image Captured", "Face image has been captured successfully");
    
    // Update camera frame with captured image
    const cameraFrame = document.querySelector('.camera-frame img');
    cameraFrame.src = capturedImage;
    cameraFrame.alt = "Captured Face";
}

function playbackImages() {
    showNotification("Playback", "Showing recent face detections");
    // In real implementation, this would show a gallery of captured images
}

// Face Detection Main Function
function simulateFace(status, name = null) {
    let detectedName, image;
    
    if (status === "Recognized" && name) {
        detectedName = name;
        image = "face-recognized.jpg";
    } else {
        detectedName = "Unknown";
        image = "face-unknown.jpg";
    }
    
    addFaceLog(detectedName, image);
    
    // Show notification for unknown faces
    if (detectedName === "Unknown") {
        showNotification("Unknown Person Detected", "An unknown person has been detected at the entrance", "warning");
        
        // Auto-enable alarm if unknown person detected and alarm is off
        const alarmSwitch = document.querySelector('.control-box .switch input[type="checkbox"]');
        if (!alarmSwitch.checked) {
            alarmSwitch.checked = true;
            triggerAlarm();
        }
    }
}

function initializeFaceLogs() {
    // Add 4 default face logs
    for (let i = 0; i < 4; i++) {
        addFaceLog("-", "face-placeholder.jpg");
    }
}

function addFaceLog(name, image) {
    const container = document.getElementById("face-log-container");
    const now = new Date();
    const time = now.toLocaleTimeString();
    const date = now.toLocaleDateString();

    // Create new face log entry
    const faceLog = {
        name: name,
        image: image,
        time: time,
        date: date,
        timestamp: now
    };
    
    faceDetectionLog.unshift(faceLog); // Add to beginning of array
    
    // Keep only latest 20 logs
    if (faceDetectionLog.length > 20) {
        faceDetectionLog = faceDetectionLog.slice(0, 20);
    }
    
    // Update UI
    updateFaceLogUI();
    
    // Update status box with latest detection
    document.getElementById("person-status").textContent = name;
    document.getElementById("time-status").textContent = time;
    document.getElementById("date-status").textContent = date;
}

function updateFaceLogUI() {
    const container = document.getElementById("face-log-container");
    container.innerHTML = '';
    
    // Display latest 4 face logs (or all if less than 4)
    const logsToShow = faceDetectionLog.slice(0, 4);
    
    logsToShow.forEach(log => {
        const card = document.createElement("div");
        card.classList.add("face-card");
        card.innerHTML = `
            <div class="face-frame">
                <img src="${log.image}" alt="Detected Face">
            </div>
            <div class="face-info">
                <div class="info-item">
                    <img src="person.svg" class="icon">
                    <span>Name: ${log.name}</span>
                </div>
                <div class="info-item">
                    <img src="calendar.svg" class="icon">
                    <span>${log.date}</span>
                </div>
                <div class="info-item">
                    <img src="clock.svg" class="icon">
                    <span>${log.time}</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// ==================== HAZARD DETECTION SYSTEM ====================
function initializeHazardSensors() {
    // Simulate sensor data updates every 3 seconds
    setInterval(updateHazardSensors, 3000);
    
    // Simulate occasional hazard events
    setInterval(simulateRandomHazardEvent, 15000);
}

function updateHazardSensors() {
    // Simulate normal sensor readings
    const gasLevel = Math.floor(Math.random() * 30); // 0-29%
    const gasStatus = gasLevel > 20 ? "Warning" : "Normal";
    
    // Update gas sensor display
    document.getElementById("gas-level").textContent = gasLevel + "%";
    document.getElementById("gas-status").textContent = gasStatus;
    
    // Update status colors based on conditions
    updateHazardStatusColors();
}

function simulateRandomHazardEvent() {
    const events = ["gas_leak", "fire", "smoke", "normal"];
    const randomEvent = events[Math.floor(Math.random() * events.length)];
    
    switch (randomEvent) {
        case "gas_leak":
            simulateGasLeak();
            break;
        case "fire":
            simulateFire();
            break;
        case "smoke":
            simulateSmoke();
            break;
        // normal - no event
    }
}

function simulateGasLeak() {
    const gasLevel = Math.floor(Math.random() * 50) + 50; // 50-99%
    
    document.getElementById("gas-level").textContent = gasLevel + "%";
    document.getElementById("gas-status").textContent = "DANGER";
    
    addHazardLog("Gas Sensor", "Danger", `Gas leak detected! Level: ${gasLevel}%`);
    
    // Check notification and alarm settings
    const notifToggle = document.getElementById("notif-toggle");
    const alarmToggle = document.getElementById("alarm-toggle");
    
    if (notifToggle.checked) {
        showNotification("GAS LEAK DETECTED", `Gas level: ${gasLevel}% - EVACUATE AREA`, "danger");
    }
    
    if (alarmToggle.checked) {
        triggerAlarm();
    }
    
    updateHazardStatusColors();
}

function simulateFire() {
    document.getElementById("fire-status").textContent = "DANGER";
    document.getElementById("smoke-status").textContent = "DANGER";
    
    addHazardLog("Fire Sensor", "Danger", "Fire detected! Immediate action required");
    
    const notifToggle = document.getElementById("notif-toggle");
    const alarmToggle = document.getElementById("alarm-toggle");
    
    if (notifToggle.checked) {
        showNotification("FIRE DETECTED", "Fire detected in the building - EVACUATE IMMEDIATELY", "danger");
    }
    
    if (alarmToggle.checked) {
        triggerAlarm();
    }
    
    updateHazardStatusColors();
}

function simulateSmoke() {
    document.getElementById("smoke-status").textContent = "Warning";
    
    addHazardLog("Smoke Sensor", "Warning", "Smoke detected - investigating");
    
    const notifToggle = document.getElementById("notif-toggle");
    
    if (notifToggle.checked) {
        showNotification("SMOKE DETECTED", "Smoke detected - please check the area", "warning");
    }
    
    updateHazardStatusColors();
}

function updateHazardStatusColors() {
    // Update gas status color
    const gasStatus = document.getElementById("gas-status");
    const gasLevel = parseInt(document.getElementById("gas-level").textContent);
    
    if (gasLevel > 50) {
        gasStatus.style.color = "#ff4444";
        gasStatus.style.fontWeight = "bold";
    } else if (gasLevel > 20) {
        gasStatus.style.color = "#ffaa00";
    } else {
        gasStatus.style.color = "#00aa00";
    }
    
    // Update fire and smoke status colors
    const fireStatus = document.getElementById("fire-status");
    const smokeStatus = document.getElementById("smoke-status");
    
    fireStatus.style.color = fireStatus.textContent === "DANGER" ? "#ff4444" : "#00aa00";
    fireStatus.style.fontWeight = fireStatus.textContent === "DANGER" ? "bold" : "normal";
    
    smokeStatus.style.color = smokeStatus.textContent === "DANGER" ? "#ff4444" : 
                             smokeStatus.textContent === "Warning" ? "#ffaa00" : "#00aa00";
    smokeStatus.style.fontWeight = smokeStatus.textContent === "DANGER" ? "bold" : "normal";
}

function addHazardLog(sensor, status, description) {
    const now = new Date();
    const time = now.toLocaleTimeString();
    
    const hazardLog = {
        time: time,
        sensor: sensor,
        status: status,
        description: description,
        timestamp: now
    };
    
    hazardDetectionLog.unshift(hazardLog);
    
    // Keep only latest 50 logs
    if (hazardDetectionLog.length > 50) {
        hazardDetectionLog = hazardDetectionLog.slice(0, 50);
    }
    
    updateHazardLogUI();
}

function updateHazardLogUI() {
    const tableBody = document.querySelector('.hazard-log-table tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    // Display latest 10 hazard logs
    const logsToShow = hazardDetectionLog.slice(0, 10);
    
    logsToShow.forEach(log => {
        const row = document.createElement("tr");
        
        // Set row color based on status
        if (log.status === "Danger") {
            row.style.backgroundColor = "#ffe6e6";
        } else if (log.status === "Warning") {
            row.style.backgroundColor = "#fff3cd";
        }
        
        row.innerHTML = `
            <td>${log.time}</td>
            <td>${log.sensor}</td>
            <td>${log.status}</td>
            <td>${log.description}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// ==================== NOTIFICATION SYSTEM ====================
function showNotification(title, message, type = "info") {
    // Remove existing notification
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // Create notification element
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;
    
    const typeIcon = type === "danger" ? "🚨" : type === "warning" ? "⚠️" : "ℹ️";
    
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-icon">${typeIcon}</span>
            <div class="notification-text">
                <strong>${title}</strong>
                <p>${message}</p>
            </div>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    // Add styles if not already added
    if (!document.querySelector('#notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 150px;
                right: 20px;
                background: white;
                border-left: 4px solid #1f2a55;
                border-radius: 8px;
                box-shadow: 0 4px 15px rgba(0,0,0,0.2);
                z-index: 1000;
                max-width: 400px;
                animation: slideIn 0.3s ease;
            }
            .notification.danger { border-left-color: #ff4444; }
            .notification.warning { border-left-color: #ffaa00; }
            .notification.info { border-left-color: #1f2a55; }
            .notification-content {
                padding: 15px;
                display: flex;
                align-items: flex-start;
                gap: 10px;
            }
            .notification-icon { font-size: 20px; }
            .notification-text { flex: 1; }
            .notification-close {
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                color: #666;
            }
            @keyframes slideIn {
                from { transform: translateX(100%); }
                to { transform: translateX(0); }
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// ==================== ALARM SYSTEM ====================
function initializeAlarm() {
    // Create alarm audio element
    alarmAudio = new Audio();
    // In real implementation, set the alarm sound source
    // alarmAudio.src = "alarm-sound.mp3";
    alarmAudio.loop = true;
}

function triggerAlarm() {
    if (alarmAudio) {
        // alarmAudio.play().catch(e => console.log("Alarm audio play failed:", e));
        console.log("ALARM TRIGGERED - Evacuate immediately!");
        showNotification("ALARM ACTIVATED", "Security alarm has been triggered", "danger");
    }
}

function stopAlarm() {
    if (alarmAudio) {
        alarmAudio.pause();
        alarmAudio.currentTime = 0;
    }
}

// ==================== REAL-TIME CLOCK ====================
function initializeClock() {
    updateClock();
    setInterval(updateClock, 1000);
}

function updateClock() {
    const now = new Date();
    const time = now.toLocaleTimeString();
    const date = now.toLocaleDateString();
    
    // Update clock in status box if no recent face detection
    const timeStatus = document.getElementById("time-status");
    const dateStatus = document.getElementById("date-status");
    
    if (timeStatus.textContent === "--:--") {
        timeStatus.textContent = time;
    }
    if (dateStatus.textContent === "-- -- ----") {
        dateStatus.textContent = date;
    }
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Camera controls
    const pauseBtn = document.querySelector('.cam-btn.pause');
    const captureBtn = document.querySelector('.cam-btn.capture');
    const backBtn = document.querySelector('.cam-btn.back');
    
    if (pauseBtn) pauseBtn.addEventListener('click', toggleCameraPause);
    if (captureBtn) captureBtn.addEventListener('click', captureImage);
    if (backBtn) backBtn.addEventListener('click', playbackImages);
    
    // Control box switches
    const controlSwitches = document.querySelectorAll('.control-box .switch input');
    controlSwitches.forEach(switchElem => {
        switchElem.addEventListener('change', function() {
            const controlType = this.parentElement.previousElementSibling.textContent.trim();
            if (controlType === "Alarm" && this.checked) {
                showNotification("Alarm Armed", "Security alarm is now active");
            } else if (controlType === "Alarm" && !this.checked) {
                stopAlarm();
                showNotification("Alarm Disarmed", "Security alarm is now disabled");
            }
        });
    });
    
    // Hazard control switches
    const hazardNotifToggle = document.getElementById("notif-toggle");
    const hazardAlarmToggle = document.getElementById("alarm-toggle");
    
    if (hazardNotifToggle) {
        hazardNotifToggle.addEventListener('change', function() {
            showNotification(
                "Hazard Notifications " + (this.checked ? "Enabled" : "Disabled"),
                "Hazard detection notifications are now " + (this.checked ? "active" : "inactive")
            );
        });
    }
    
    if (hazardAlarmToggle) {
        hazardAlarmToggle.addEventListener('change', function() {
            showNotification(
                "Hazard Alarm " + (this.checked ? "Armed" : "Disarmed"),
                "Hazard detection alarm is now " + (this.checked ? "active" : "inactive")
            );
            if (!this.checked) {
                stopAlarm();
            }
        });
    }
    
    // Room status switches
    const roomSwitches = document.querySelectorAll('.room-status .switch input');
    roomSwitches.forEach(switchElem => {
        switchElem.addEventListener('change', function() {
            const roomName = this.closest('.room').querySelector('span').textContent;
            showNotification(
                "Room Status Updated",
                `${roomName} is now ${this.checked ? "secured" : "unsecured"}`,
                this.checked ? "info" : "warning"
            );
        });
    });
}

// ==================== MANUAL TEST FUNCTIONS ====================
// These functions can be called from browser console for testing
function testFaceDetection() {
    simulateFace("Recognized", "Tyas");
}

function testUnknownFace() {
    simulateFace("Unknown");
}

function testGasLeak() {
    simulateGasLeak();
}

function testFire() {
    simulateFire();
}

function testNotification() {
    showNotification("Test Notification", "This is a test notification", "info");
}

console.log("Smart Home Security System JS loaded");
console.log("Test functions available: testFaceDetection(), testUnknownFace(), testGasLeak(), testFire(), testNotification()");