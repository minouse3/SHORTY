import cv2
import logging
import eventlet
from .fire_detector import Detector

class FireManager:
    def __init__(self, socketio, model_path, camera_index=0):
        self.logger = logging.getLogger(__name__)
        self.socketio = socketio
        self.camera_index = camera_index
        self.model_path = model_path
        
        # State
        self.cap = None
        self.detector = None
        self.fire_detected_last_frame = False
        
        self._initialize_components()

    def _initialize_components(self):
        try:
            # Initialize Detector
            self.detector = Detector(self.model_path, iou_threshold=0.20)
            self.logger.info(f"Loaded detection model: {self.model_path.name}")

            # Initialize Camera
            self.cap = cv2.VideoCapture(self.camera_index)
            if not self.cap.isOpened():
                self.logger.error(f"Failed to open Fire Camera source: {self.camera_index}")
            else:
                self.logger.info(f"Processing video source: Camera {self.camera_index} (Fire Cam)")
        except Exception as e:
            self.logger.critical(f"Failed to initialize FireManager components: {e}")

    def release(self):
        if self.cap:
            self.cap.release()
            self.logger.info("Fire camera released.")

    def generate_frames(self):
        """Video processing loop for the FIRE camera."""
        while True:
            if not self.cap or not self.cap.isOpened():
                self.logger.warning("Fire cam not available, sleeping.")
                eventlet.sleep(5)
                continue
                
            ret, frame = self.cap.read()
            if not ret:
                self.logger.warning("Failed to read frame from fire camera.")
                eventlet.sleep(0.5)
                continue

            # Process Frame with AI Model
            processed_frame, detection = self.detector.process_frame(frame)

            # Handle Alerts
            self._handle_alerts(detection)

            # Encode Frame
            try:
                ret, buffer = cv2.imencode('.jpg', processed_frame)
                if ret:
                    frame_bytes = buffer.tobytes()
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            except Exception as e:
                self.logger.error(f"Error encoding fire frame: {e}")
                
            eventlet.sleep(0.03) # ~30 FPS

    def _handle_alerts(self, detection):
        if detection and not self.fire_detected_last_frame:
            self.logger.warning(f"🐦‍🔥 {detection} DETECTED! Emitting alert to web UI")
            alert_data = {
                "sensor": f"{detection} Sensor",
                "status": "DANGER",
                "description": f"{detection} detected in video feed!"
            }
            self.socketio.emit('hazard_alert', alert_data)
            self.fire_detected_last_frame = True 
        
        elif not detection and self.fire_detected_last_frame:
            self.logger.info("✅ Hazard Cleared. Emitting clear event to web UI")
            self.socketio.emit('hazard_cleared', { "sensor": "Fire Sensor" })
            self.socketio.emit('hazard_cleared', { "sensor": "Smoke Sensor" })
            self.fire_detected_last_frame = False