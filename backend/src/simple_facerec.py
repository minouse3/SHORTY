import face_recognition
import cv2
import os
import glob
import numpy as np

class SimpleFacerec:
    def __init__(self):
        self.known_face_encodings = []
        self.known_face_names = []

        # Resize frame untuk pemrosesan lebih cepat
        self.frame_resizing = 0.25

    def load_encoding_images(self, images_path):
        """
        Memuat gambar-gambar dari path yang diberikan dan menyimpannya
        :param images_path: Path ke folder gambar
        :return:
        """
        # --- FIX: Clear existing lists before reloading ---
        # This ensures we don't have duplicates when we re-run this function
        self.known_face_encodings = []
        self.known_face_names = []
        # --- END FIX ---
        
        # Muat Gambar
        images_path_list = glob.glob(os.path.join(images_path, "*.*"))

        print("{} gambar encoding ditemukan.".format(len(images_path_list)))

        # Simpan encoding gambar dan nama
        for img_path in images_path_list:
            img = cv2.imread(img_path)
            rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

            # Dapatkan nama file tanpa ekstensi
            basename = os.path.basename(img_path)
            (filename, ext) = os.path.splitext(basename)
            
            # Dapatkan encoding
            # Asumsikan hanya ada satu wajah per gambar
            try:
                img_encoding = face_recognition.face_encodings(rgb_img)[0]
            except IndexError as e:
                print(f"Error: Tidak ada wajah terdeteksi di {filename}. Lewati gambar ini.")
                continue

            # Simpan nama file dan encodingnya
            self.known_face_encodings.append(img_encoding)
            self.known_face_names.append(filename)
        
        print("Encoding gambar berhasil dimuat")

    def detect_known_faces(self, frame):
        # Resize frame untuk pemrosesan lebih cepat
        small_frame = cv2.resize(frame, (0, 0), fx=self.frame_resizing, fy=self.frame_resizing)
        
        # Konversi gambar dari BGR (OpenCV) ke RGB (face_recognition)
        rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)
        
        # Temukan semua lokasi wajah dan encoding wajah di frame saat ini
        face_locations = face_recognition.face_locations(rgb_small_frame)
        face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)

        face_names = []
        for face_encoding in face_encodings:
            # Cek apakah wajah cocok dengan wajah yang sudah diketahui
            # TAMBAHKAN tolerance=0.5 DI SINI
            matches = face_recognition.compare_faces(self.known_face_encodings, face_encoding, tolerance=0.75)
            name = "Unknown" # Nama default jika tidak ada kecocokan

            # Gunakan wajah yang diketahui dengan jarak (distance) terkecil
            face_distances = face_recognition.face_distance(self.known_face_encodings, face_encoding)
            if len(face_distances) > 0:
                best_match_index = np.argmin(face_distances)
                if matches[best_match_index]:
                    name = self.known_face_names[best_match_index]
            
            face_names.append(name)

        # Kembalikan koordinat ke ukuran frame asli
        face_locations = np.array(face_locations)
        face_locations = face_locations / self.frame_resizing
        
        return face_locations.astype(int), face_names