import eventlet
eventlet.monkey_patch() 

import cv2
import logging
import sys
import time
import os
import atexit
from flask import Flask, Response, send_from_directory
from flask_socketio import SocketIO, emit

# --- TAMBAHAN IMPOR ---
import base64
import numpy as np
from .simple_facerec import SimpleFacerec
# --- AKHIR TAMBAHAN IMPOR ---

# --- FIX 1: Relative imports ---
from .config import Config, setup_logging
from .fire_detector import Detector

# --- Server Setup ---
app = Flask(__name__)
socketio = SocketIO(app, cors_allowed_origins="*")

# --- FIX 2: Path correction ---
# Ini mengasumsikan 'images' ada di root, satu level di atas 'src'
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

    # --- TAMBAHAN: INISIALISASI DETEKSI WAJAH ---
    sfr = None
    try:
        sfr = SimpleFacerec()
        # Muat gambar dari folder 'images' di root project
        images_path = os.path.join(root_dir, "images") 
        sfr.load_encoding_images(images_path)
        logger.info(f"Loaded face recognition images from {images_path}")
    except Exception as e:
        logger.error(f"Failed to initialize SimpleFacerec: {e}")
        sfr = None # Set ke None jika gagal
    # --- AKHIR TAMBAHAN ---

except Exception as e:
    logger.critical(f"Failed to initialize components: {e}")
    sys.exit(1)

# --- STATE MANAGEMENT ---
fire_detected_last_frame = False 

# --- TAMBAHAN: STATE DETEKSI WAJAH ---
last_detected_names = set()
last_detection_time = time.time()
# --- AKHIR TAMBAHAN ---


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
    # Arahkan ke root_dir untuk 'index.html'
    return send_from_directory(root_dir, 'index.html')

@app.route('/<path:path>')
def static_files(path):
    """Serve other static files (css, js, assets) from the root directory."""
     # Arahkan ke root_dir untuk file statis lainnya
    return send_from_directory(root_dir, path)

def generate_fire_frames():
    """
    Video processing loop for the FIRE camera.
    (Fungsi ini tidak diubah, logikanya sudah benar)
    """
    global fire_detected_last_frame 

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

        processed_frame, detection = detector.process_frame(frame)

        if detection and not fire_detected_last_frame:
            logger.warning(f"🐦‍🔥 {detection} DETECTED! Emitting alert to web UI")
            alert_data = {
                "sensor": f"{detection} Sensor",
                "status": "DANGER",
                "description": f"{detection} detected in video feed!"
            }
            socketio.emit('hazard_alert', alert_data)
            fire_detected_last_frame = True 
        
        elif not detection and fire_detected_last_frame:
            logger.info("✅ Hazard Cleared. Emitting clear event to web UI")
            socketio.emit('hazard_cleared', { "sensor": "Fire Sensor" })
            socketio.emit('hazard_cleared', { "sensor": "Smoke Sensor" })
            fire_detected_last_frame = False 

        try:
            ret, buffer = cv2.imencode('.jpg', processed_frame)
            if ret:
                frame_bytes = buffer.tobytes()
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        except Exception as e:
            logger.error(f"Error encoding fire frame: {e}")
            
        eventlet.sleep(0.03) # ~30 FPS

# --- FUNGSI YANG DIGANTI ---
def generate_cctv_frames():
    """
    Video processing loop untuk CCTV camera DENGAN DETEKSI WAJAH.
    Mengirimkan 'activity_alert' saat wajah terdeteksi.
    """
    global last_detected_names, last_detection_time, sfr

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
        
        # --- LOGIKA DETEKSI WAJAH ---
        if sfr: # Hanya jalankan jika sfr berhasil diinisialisasi
            try:
                # Deteksi Wajah
                face_locations, face_names = sfr.detect_known_faces(frame)
                
                current_detected_names = set(face_names)
                
                # Reset pelacak jika sudah 5 detik agar bisa mendeteksi orang yang sama lagi
                if time.time() - last_detection_time > 5:
                    last_detected_names = set()
                    
                # Loop melalui setiap wajah yang terdeteksi
                for face_loc, name in zip(face_locations, face_names):
                    y1, x2, y2, x1 = face_loc[0], face_loc[1], face_loc[2], face_loc[3]

                    # Tentukan warna kotak: Hijau untuk dikenal, Merah untuk tidak dikenal
                    color = (0, 200, 0) if name != "Unknown" else (0, 0, 255)

                    # Gambar kotak di sekitar wajah
                    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                    
                    # Gambar label nama di bawah wajah
                    cv2.rectangle(frame, (x1, y2 - 35), (x2, y2), color, cv2.FILLED)
                    font = cv2.FONT_HERSHEY_DUPLEX
                    cv2.putText(frame, name, (x1 + 6, y2 - 6), font, 1.0, (255, 255, 255), 1)

                    # --- KIRIM EVENT SOCKETIO JIKA ADA WAJAH BARU ---
                    if name not in last_detected_names:
                        logger.info(f"Face detected: {name}")
                        last_detected_names.add(name)
                        last_detection_time = time.time()
                        
                        # Potong gambar wajah
                        face_image = frame[y1:y2, x1:x2]
                        # Encode ke base64
                        _, buffer_face = cv2.imencode('.jpg', face_image)
                        face_data_uri = "data:image/jpeg;base64," + base64.b64encode(buffer_face).decode('utf-8')

                        status = "Known" if name != "Unknown" else "Unknown"
                        description = f"{status} person detected at the front door."
                        
                        socketio.emit('activity_alert', {
                            'title': name,
                            'status': status,
                            'description': description,
                            'imageUrl': face_data_uri,
                            'imageHint': 'face'
                        })

            except Exception as e:
                logger.error(f"Error during face detection: {e}")
        # --- AKHIR LOGIKA DETEKSI WAJAH ---
        
        # Encode dan stream frame (sama seperti sebelumnya)
        try:
            ret, buffer_frame = cv2.imencode('.jpg', frame)
            if ret:
                frame_bytes = buffer_frame.tobytes()
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        except Exception as e:
            logger.error(f"Error encoding CCTV frame: {e}")
            
        eventlet.sleep(0.03) # ~30 FPS
# --- AKHIR FUNGSI YANG DIGANTI ---


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

@socketio.on('user_reset_alert')
def handle_user_reset(data):
    """
    User clicked the toggle back to 'Secured'.
    Reset the alert cooldown to re-arm the system immediately.
    """
    global last_alert_time # Catatan: last_alert_time tidak terdefinisi, ini dari kode lama Anda
    logger.info(f"✅ User Acknowledged Alert: {data['room']}. Re-arming detection.")
    last_alert_time = 0 # Reset cooldown

# --- Main Runner ---
if __name__ == "__main__":
    logger.info("Starting Flask-SocketIO server on http://localhost:5000")
    socketio.run(app, host='0.0.0.0', port=5000, debug=False, use_reloader=False)