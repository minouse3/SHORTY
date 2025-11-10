import cv2
import logging
import sys
import time
import os
import atexit
from flask import Flask, Response, send_from_directory
from flask_socketio import SocketIO, emit
import eventlet

# --- FIX 1: Relative imports ---
from .config import Config, setup_logging
from .fire_detector import Detector

# --- Server Setup ---
eventlet.monkey_patch()
app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

# --- FIX 2: Path correction ---
root_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')

# --- Logging and Config ---
setup_logging()
logger = logging.getLogger(__name__)
logger.info("🚀 Starting Fire Detection System (Web Server Mode)")

# --- Initialize Components ---
try:
    detector = Detector(Config.MODEL_PATH, iou_threshold=0.20)
    logger.info(f"Loaded detection model: {Config.MODEL_PATH.name}")
    
    cap_fire = cv2.VideoCapture(0)
    if not cap_fire.isOpened():
        logger.error("Failed to open video source: 0 (Fire Cam)")
        sys.exit(1)
    logger.info("Processing video source: Camera 0 (Fire Cam)")

    cap_cctv = cv2.VideoCapture(1)
    if not cap_cctv.isOpened():
        logger.error("Failed to open video source: 1 (CCTV Cam)")
        logger.warning("CCTV feed will not be available. Continuing with fire cam.")
    else:
        logger.info("Processing video source: Camera 1 (CCTV Cam)")

except Exception as e:
    logger.critical(f"Failed to initialize components: {e}")
    sys.exit(1)

# --- STATE MANAGEMENT (Reverted to Cooldown) ---
alert_cooldown = Config.ALERT_COOLDOWN # Seconds between alerts
last_alert_time = 0 # This will be reset by the user

# --- NEW: Cleanup function to release cameras on exit ---
@atexit.register
def cleanup():
    logger.info("Releasing video captures...")
    if cap_fire:
        cap_fire.release()
    if cap_cctv:
        cap_cctv.release()
    logger.info("Cleanup complete.")

# --- Web Routes ---

@app.route('/')
def index():
    """Serve the index.html file from the root directory."""
    logger.info(f"Serving index.html from {root_dir}")
    return send_from_directory(root_dir, 'index.html')

@app.route('/<path:path>')
def static_files(path):
    """Serve other static files (css, js, assets) from the root directory."""
    return send_from_directory(root_dir, path)

def generate_fire_frames():
    """
    Video processing loop for the FIRE camera.
    Sends DANGER alerts with a cooldown.
    """
    global last_alert_time 

    while True:
        if not cap_fire.isOpened():
            logger.warning("Fire cam not available, sleeping.")
            eventlet.sleep(5)
            continue
            
        ret, frame = cap_fire.read()
        if not ret:
            logger.warning("Failed to read frame from fire camera.")
            eventlet.sleep(0.5)
            continue

        # Run detection
        processed_frame, detection = detector.process_frame(frame)

        # --- UPDATED LOGIC ---
        # Only send DANGER alerts, never "Normal"
        if detection:
            current_time = time.time()
            if (current_time - last_alert_time) > alert_cooldown:
                logger.warning(f"🐦‍🔥 {detection} Detected! Emitting alert to web UI")
                
                alert_data = {
                    "sensor": f"{detection} Sensor",
                    "status": "DANGER",
                    "description": f"{detection} detected in video feed!"
                }
                socketio.emit('hazard_alert', alert_data)
                
                last_alert_time = current_time # Set cooldown
        
        # --- END OF LOGIC BLOCK ---

        # Encode and stream the frame
        try:
            ret, buffer = cv2.imencode('.jpg', processed_frame)
            if ret:
                frame_bytes = buffer.tobytes()
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        except Exception as e:
            logger.error(f"Error encoding fire frame: {e}")
            
        eventlet.sleep(0.03) # ~30 FPS

def generate_cctv_frames():
    """Video processing loop for the CCTV camera."""
    while True:
        if not cap_cctv.isOpened():
            logger.warning("CCTV cam not available, sleeping.")
            eventlet.sleep(5)
            continue

        ret, frame = cap_cctv.read()
        if not ret:
            logger.warning("Failed to read frame from CCTV camera.")
            eventlet.sleep(0.5)
            continue
        
        try:
            ret, buffer = cv2.imencode('.jpg', frame)
            if ret:
                frame_bytes = buffer.tobytes()
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        except Exception as e:
            logger.error(f"Error encoding CCTV frame: {e}")
            
        eventlet.sleep(0.03) # ~30 FPS

# --- VIDEO FEED ROUTES ---

@app.route('/fire_video_feed')
def fire_video_feed():
    """Fire detection video streaming route."""
    return Response(generate_fire_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/cctv_video_feed')
def cctv_video_feed():
    """CCTV video streaming route."""
    return Response(generate_cctv_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

# --- SocketIO Handlers ---
@socketio.on('connect')
def handle_connect():
    logger.info('✅ Web Client connected via SocketIO')

@socketio.on('disconnect')
def handle_disconnect():
    logger.info('❌ Web Client disconnected')

@socketio.on('test_event')
def handle_test_event(data):
    """Handle a test ping from JavaScript"""
    logger.info(f"✅ JavaScript Ping Received: {data}")

# --- NEW: USER ACKNOWLEDGEMENT HANDLER ---
@socketio.on('user_reset_alert')
def handle_user_reset(data):
    """
    User clicked the toggle back to 'Secured'.
    Reset the alert cooldown to re-arm the system immediately.
    """
    global last_alert_time
    logger.info(f"✅ User Acknowledged Alert: {data['room']}. Re-arming detection.")
    last_alert_time = 0 # Reset cooldown

# --- Main Runner ---
if __name__ == "__main__":
    logger.info("Starting Flask-SocketIO server on http://localhost:5000")
    socketio.run(app, host='0.0.0.0', port=5000, debug=False, use_reloader=False)