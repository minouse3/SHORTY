import eventlet
eventlet.monkey_patch() 

import sys
import os
import atexit
import logging
from flask import Flask, Response, send_from_directory
from flask_socketio import SocketIO

# --- Config & Logging ---
from .config import Config, setup_logging

# --- Custom Managers ---
from .fire_manager import FireManager
from .face_manager import FaceManager

# --- Server Setup ---
app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

# --- Path Config ---
root_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..') 
images_path = os.path.join(root_dir, "images") 

# --- Logging ---
setup_logging()
logger = logging.getLogger(__name__)
logger.info("🚀 Starting Fire Detection System (Web Server Mode)")

# --- Initialize Managers ---
# We create instances of our managers, passing the socketio instance
# so they can emit events directly.
try:
    fire_manager = FireManager(socketio, Config.MODEL_PATH, camera_index=0)
    face_manager = FaceManager(socketio, images_path, camera_index=1)
except Exception as e:
    logger.critical(f"Critical initialization error: {e}")
    sys.exit(1)

# --- Cleanup ---
@atexit.register
def cleanup():
    logger.info("Shutting down managers...")
    fire_manager.release()
    face_manager.release()
    logger.info("Cleanup complete.")

# --- Web Routes ---
@app.route('/')
def index():
    return send_from_directory(root_dir, 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory(root_dir, path)

# --- Video Feed Routes ---
@app.route('/fire_video_feed')
def fire_video_feed():
    """Fire detection video streaming route."""
    return Response(fire_manager.generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/cctv_video_feed')
def cctv_video_feed():
    """CCTV video streaming route."""
    return Response(face_manager.generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

# --- SocketIO Handlers ---
@socketio.on('connect')
def handle_connect():
    logger.info('✅ Web Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    logger.info('❌ Web Client disconnected')

@socketio.on('user_reset_alert')
def handle_user_reset(data):
    logger.info(f"✅ User Acknowledged Alert: {data.get('room', 'Unknown')}")
    # If you need to reset logic in FireManager, add a method there and call it:
    # fire_manager.reset_alert()

@socketio.on('add_new_person')
def handle_add_new_person(data):
    # Delegate to FaceManager
    face_manager.add_new_person(data)

# --- Main Runner ---
if __name__ == "__main__":
    logger.info("Starting Flask-SocketIO server on http://localhost:5000")
    socketio.run(app, host='0.0.0.0', port=5000, debug=False, use_reloader=False)