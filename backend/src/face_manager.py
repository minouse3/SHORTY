import cv2
import logging
import eventlet
import time
import base64
import numpy as np
import os
from .simple_facerec import SimpleFacerec

class FaceManager:
    def __init__(self, socketio, images_path, camera_index=1):
        self.logger = logging.getLogger(__name__)
        self.socketio = socketio
        self.images_path = images_path
        self.camera_index = camera_index
        
        # State
        self.cap = None
        self.sfr = None
        self.last_detected_names = set()
        self.last_detection_time = time.time()

        self._initialize_components()

    def _initialize_components(self):
        # Initialize Camera
        self.cap = cv2.VideoCapture(self.camera_index)
        if not self.cap.isOpened():
            self.logger.error(f"Failed to open CCTV source: {self.camera_index}")
            self.logger.warning("CCTV feed will not be available.")
        else:
            self.logger.info(f"Processing video source: Camera {self.camera_index} (CCTV Cam)")

        # Initialize Face Recognition
        try:
            self.sfr = SimpleFacerec()
            self.sfr.load_encoding_images(self.images_path)
            self.logger.info(f"Loaded face recognition images from {self.images_path}")
        except Exception as e:
            self.logger.error(f"Failed to initialize SimpleFacerec: {e}")
            self.sfr = None

    def release(self):
        if self.cap:
            self.cap.release()
            self.logger.info("CCTV camera released.")

    def generate_frames(self):
        """Video processing loop for CCTV with Face Detection."""
        while True:
            if not self.cap or not self.cap.isOpened():
                self.logger.warning("CCTV cam not available, sleeping.")
                eventlet.sleep(5)
                continue

            ret, frame = self.cap.read()
            if not ret:
                self.logger.warning("Failed to read frame from CCTV camera.")
                eventlet.sleep(0.5)
                continue
            
            # Face Detection Logic
            if self.sfr:
                self._process_faces(frame)
            
            # Encode Frame
            try:
                ret, buffer_frame = cv2.imencode('.jpg', frame)
                if ret:
                    frame_bytes = buffer_frame.tobytes()
                    yield (b'--frame\r\n'
                           b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            except Exception as e:
                self.logger.error(f"Error encoding CCTV frame: {e}")
                
            eventlet.sleep(0.03)

    def _process_faces(self, frame):
        try:
            face_locations, face_names = self.sfr.detect_known_faces(frame)
            
            # Reset tracker after 5 seconds
            if time.time() - self.last_detection_time > 5:
                self.last_detected_names = set()
                
            for face_loc, name in zip(face_locations, face_names):
                y1, x2, y2, x1 = face_loc[0], face_loc[1], face_loc[2], face_loc[3]
                color = (0, 200, 0) if name != "Unknown" else (0, 0, 255)

                # Draw UI
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                cv2.rectangle(frame, (x1, y2 - 35), (x2, y2), color, cv2.FILLED)
                cv2.putText(frame, name, (x1 + 6, y2 - 6), cv2.FONT_HERSHEY_DUPLEX, 1.0, (255, 255, 255), 1)

                # Emit Alert for new detection
                if name not in self.last_detected_names:
                    self._emit_activity_alert(name, frame, (x1, y1, x2, y2))
                    self.last_detected_names.add(name)
                    self.last_detection_time = time.time()
        except Exception as e:
            self.logger.error(f"Error during face detection: {e}")

    def _emit_activity_alert(self, name, frame, coords):
        self.logger.info(f"Face detected: {name}")
        x1, y1, x2, y2 = coords
        
        # Crop and Encode Face
        face_image = frame[y1:y2, x1:x2]
        _, buffer_face = cv2.imencode('.jpg', face_image)
        face_data_uri = "data:image/jpeg;base64," + base64.b64encode(buffer_face).decode('utf-8')

        status = "Known" if name != "Unknown" else "Unknown"
        
        self.socketio.emit('activity_alert', {
            'title': name,
            'status': status,
            'description': f"{status} person detected at the front door.",
            'imageUrl': face_data_uri,
            'imageHint': 'face'
        })

    def add_new_person(self, data):
        """Handle request to add a new person's face to the database."""
        try:
            name = data['name']
            image_data_uri = data['image']
            self.logger.info(f"Received request to add new person: {name}")

            # Decode Base64
            header, base64_data = image_data_uri.split(',', 1)
            image_bytes = base64.b64decode(base64_data)
            nparr = np.frombuffer(image_bytes, np.uint8)
            image_cv = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image_cv is None:
                raise ValueError("Failed to decode image from base64 data")

            # Save Image
            filename = name.replace(' ', '_') + ".jpg"
            save_path = os.path.join(self.images_path, filename)
            cv2.imwrite(save_path, image_cv)
            self.logger.info(f"Saved new person: {save_path}")
            
            # Reload Model
            if self.sfr:
                self.logger.info("Reloading face recognition encodings...")
                self.sfr.load_encoding_images(self.images_path)
                self.logger.info("Model reloaded.")
            else:
                self.logger.warning("SimpleFacerec not initialized, cannot reload.")
                
        except Exception as e:
            self.logger.error(f"Error adding new person: {e}")
            self.socketio.emit('add_person_error', {'error': str(e)})