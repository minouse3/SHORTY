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
let socket = null;

// ==================== INITIALIZATION ====================
window.addEventListener("DOMContentLoaded", () => {
    initializeApp();
});

function initializeApp() {
    // Initialize default face logs
    initializeFaceLogs();
    
    // Initialize real-time clock
    initializeClock();
    
    // Initialize hazard sensors simulation
    initializeHazardSensors();
    
    // Initialize alarm sound
    initializeAlarm();
    
    // Set up event listeners
    setupEventListeners();

    // Initialize WebSocket Connection
    initializeWebSocket();
    
    console.log("Smart Home Security System initialized");
}

// ==================== REAL-TIME CONNECTION ====================
function initializeWebSocket() {
    socket = io('http://localhost:5000'); 
    
    socket.on('connect', () => {
        console.log('Connected to Python Detection Server via SocketIO');
        showNotification("System Status", "Connected to Real-time Detection Server", "info");
        socket.emit('test_event', { data: 'JavaScript is connected!' });
    });

    // Listener for real-time hazard alerts from the Python backend
    socket.on('hazard_alert', (data) => {
        console.log('Real-time Hazard Alert:', data);
        handleRealTimeHazard(data);
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from Python Detection Server');
        showNotification("System Status", "Lost connection to Detection Server!", "danger");
    });
}

// ==================== FACE DETECTION SYSTEM ====================

function startFaceDetectionSimulation() {
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
        pauseBtn.innerHTML = '<img src="assets/play.svg" alt="Play">';
        showNotification("Camera Paused", "Face detection has been paused");
    } else {
        pauseBtn.innerHTML = '<img src="assets/pause.svg" alt="Pause">';
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
    
    const cameraFrame = document.getElementById('main-video-feed');
    cameraFrame.src = capturedImage;
    cameraFrame.alt = "Captured Face";
}

function playbackImages() {
    showNotification("Playback", "Showing recent face detections");
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
    
    if (detectedName === "Unknown") {
        showNotification("Unknown Person Detected", "An unknown person has been detected at the entrance", "warning");
        
        // Auto-enable alarm if unknown person detected
        const alarmSwitch = document.querySelector('.control-box .switch input[type="checkbox"]');
        if (!alarmSwitch.checked) {
            alarmSwitch.checked = true;
            triggerAlarm();
        }
        
        // *** NEW: Set Entrance toggle to 'unsecured' ***
        const entranceToggle = document.getElementById("entrance-toggle");
        if (entranceToggle) {
            entranceToggle.checked = false;
        }
    }
}

function initializeFaceLogs() {
    for (let i = 0; i < 4; i++) {
        addFaceLog("-", "face-placeholder.jpg");
    }
}

function addFaceLog(name, image) {
    const container = document.getElementById("face-log-container");
    const now = new Date();
    const time = now.toLocaleTimeString();
    const date = now.toLocaleDateString();

    const faceLog = {
        name: name,
        image: image,
        time: time,
        date: date,
        timestamp: now
    };
    
    faceDetectionLog.unshift(faceLog); 
    
    if (faceDetectionLog.length > 20) {
        faceDetectionLog = faceDetectionLog.slice(0, 20);
    }
    
    updateFaceLogUI();
    
    document.getElementById("person-status").textContent = name;
    document.getElementById("time-status").textContent = time;
    document.getElementById("date-status").textContent = date;
}

function updateFaceLogUI() {
    const container = document.getElementById("face-log-container");
    container.innerHTML = '';
    
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
                    <img src="assets/person.svg" class="icon">
                    <span>Name: ${log.name}</span>
                </div>
                <div class="info-item">
                    <img src="assets/calendar.svg" class="icon">
                    <span>${log.date}</span>
                </div>
                <div class="info-item">
                    <img src="assets/clock.svg" class="icon">
                    <span>${log.time}</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

// ==================== HAZARD DETECTION SYSTEM ====================
function initializeHazardSensors() {
    // Reset fire/smoke status to initial state
    document.getElementById("fire-status").textContent = "Normal";
    document.getElementById("smoke-status").textContent = "Normal";
    updateHazardStatusColors();
}

// --- UPDATED HAZARD HANDLER ---
function handleRealTimeHazard(data) {
    // This function will only receive DANGER alerts now.
    const { sensor, status, description } = data;

    // --- UPDATED LOGIC HERE ---
    // Only update the specific status that was detected
    if (sensor.includes("Fire")) {
        document.getElementById("fire-status").textContent = "DANGER";
    } else if (sensor.includes("Smoke")) {
        document.getElementById("smoke-status").textContent = "DANGER";
    }
    // --- END OF UPDATED LOGIC ---

    // *** NEW: Set Kitchen toggle to 'unsecured' (false) ***
    const kitchenToggle = document.getElementById("kitchen-toggle");
    if (kitchenToggle) {
        kitchenToggle.checked = false;
    }
    
    // Log the event
    addHazardLog(sensor, status, description); 
    
    // Check notification and alarm toggles
    const notifToggle = document.getElementById("notif-toggle");
    const alarmToggle = document.getElementById("alarm-toggle");
    
    if (notifToggle && notifToggle.checked) {
        showNotification(
            `${sensor.toUpperCase()} DETECTED`, 
            description, 
            "danger"
        );
    }
    
    if (alarmToggle && alarmToggle.checked) {
        triggerAlarm();
    }
    
    updateHazardStatusColors();
}

// ... (keep all the simulation functions as they are, for testing)
function updateHazardSensors() {
    const gasLevel = Math.floor(Math.random() * 30); // 0-29%
    const gasStatus = gasLevel > 20 ? "Warning" : "Normal";
    document.getElementById("gas-level").textContent = gasLevel + "%";
    document.getElementById("gas-status").textContent = gasStatus;
    updateHazardStatusColors();
}
function simulateRandomHazardEvent() { /* ... (no changes) ... */ }
function simulateGasLeak() { /* ... (no changes) ... */ }
function simulateFire() { /* ... (no changes) ... */ }
function simulateSmoke() { /* ... (no changes) ... */ }


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
    
    if (hazardDetectionLog.length > 50) {
        hazardDetectionLog = hazardDetectionLog.slice(0, 50);
    }
    
    updateHazardLogUI();
}

function updateHazardLogUI() {
    const tableBody = document.querySelector('.hazard-log-table tbody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    const logsToShow = hazardDetectionLog.slice(0, 10);
    
    logsToShow.forEach(log => {
        const row = document.createElement("tr");
        
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
    // ... (no changes to this function)
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
        existingNotification.remove();
    }
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
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

// ==================== ALARM SYSTEM ====================
function initializeAlarm() {
    alarmAudio = new Audio();
    alarmAudio.src = "assets/alarm.mp3";
    alarmAudio.loop = true;
}

function triggerAlarm() {
    if (alarmAudio) {
        alarmAudio.play().catch(e => console.log("Alarm audio play failed:", e));
        console.log("ALARM TRIGGERED - Evacuate immediately!");
        showNotification("ALARM ACTIVATED", "Security alarm has been triggered", "danger");
    }
}

function stopAlarm() {
    if (alarmAudio) {
        alarmAudio.pause();
        alarmAudio.currentTime = 0;
        console.log("ALARM STOPPED by user.");
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
    
    // --- UPDATED: Room status switches ---
    const kitchenToggle = document.getElementById("kitchen-toggle");
    const entranceToggle = document.getElementById("entrance-toggle");

    if (kitchenToggle) {
        kitchenToggle.addEventListener('change', function() {
            if (this.checked) {
                // *** THIS IS THE USER RESET LOGIC ***
                console.log("Kitchen toggle manually set to ON (Secured)");
                showNotification("Kitchen Secured", "Hazard status has been manually reset.", "info");
                
                // 1. Manually reset UI
                document.getElementById("fire-status").textContent = "Normal";
                document.getElementById("smoke-status").textContent = "Normal";
                updateHazardStatusColors();
                
                // 2. Stop alarm
                stopAlarm();
                
                // 3. Tell server to re-arm detection
                if (socket) {
                    socket.emit('user_reset_alert', { room: 'kitchen' });
                }
            } else {
                // This happens when the SYSTEM turns it off
                showNotification("Kitchen Unsecured", "Hazard detected in kitchen!", "warning");
            }
        });
    }

    if (entranceToggle) {
        entranceToggle.addEventListener('change', function() {
            if (this.checked) {
                // User is securing the entrance
                showNotification("Entrance Secured", "Entrance is now marked as secure.", "info");
                // You could add a socket.emit here too if needed
            } else {
                // This happens if an "Unknown" face is detected
                showNotification("Entrance Unsecured", "Unknown person detected at entrance!", "warning");
            }
        });
    }
    
    // Camera switcher buttons
    const mainVideoFeed = document.getElementById("main-video-feed");
    const cctvBtn = document.getElementById("show-cctv-btn");
    const fireBtn = document.getElementById("show-fire-btn");
    
    if (mainVideoFeed && cctvBtn && fireBtn) {
        const cctvFeedUrl = "http://localhost:5000/cctv_video_feed";
        const fireFeedUrl = "http://localhost:5000/fire_video_feed";
        
        cctvBtn.addEventListener('click', () => {
            mainVideoFeed.src = cctvFeedUrl;
            cctvBtn.classList.add('active');
            fireBtn.classList.remove('active');
            console.log("Switched to CCTV feed");
        });
        
        fireBtn.addEventListener('click', () => {
            mainVideoFeed.src = fireFeedUrl;
            fireBtn.classList.add('active');
            cctvBtn.classList.remove('active');
            console.log("Switched to Fire feed");
        });
    }
}

// ==================== MANUAL TEST FUNCTIONS ====================
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