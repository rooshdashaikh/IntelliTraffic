from flask import Flask, jsonify, Response
from flask_cors import CORS
from ultralytics import YOLO
import cv2
import requests
import base64

app = Flask(__name__)
CORS(app)

# Load YOLO model for normal traffic vehicles
model = YOLO("yolov8n.pt")


# ==========================================
# ROBOFLOW AMBULANCE MODEL
# ==========================================

import os
from dotenv import load_dotenv

load_dotenv()

ROBOFLOW_API_KEY = os.getenv("ROBOFLOW_API_KEY")

ROBOFLOW_MODEL_ID = "ambulance_detection-kkivw-04skv/1"

ROBOFLOW_URL = "https://serverless.roboflow.com/"


# ==========================================
# AMBULANCE DETECTION FUNCTION
# ==========================================

def detect_ambulance(frame):

    success, buffer = cv2.imencode(".jpg", frame)

    if not success:
        return []

    image_base64 = base64.b64encode(
        buffer.tobytes()
    ).decode("utf-8")

    url = (
        f"{ROBOFLOW_URL}"
        f"{ROBOFLOW_MODEL_ID}"
        f"?api_key={ROBOFLOW_API_KEY}"
    )

    try:

        response = requests.post(
            url,
            data=image_base64,
            headers={
                "Content-Type": "application/x-www-form-urlencoded"
            },
            timeout=4
        )

        if response.status_code == 200:

            result = response.json()

            predictions = result.get("predictions", [])

            print("AMBULANCE MODEL RESULT:", predictions)

            return predictions

        print("Roboflow error:")
        print(response.text)

    except Exception as e:

        print("Ambulance detection error:")
        print(e)

    return []


# ==========================================
# HOME
# ==========================================

@app.route("/")
def home():

    return jsonify({
        "message": "IntelliTraffic AI Service is running successfully!"
    })


# ==========================================
# TRAFFIC DETECTION
# ==========================================
@app.route("/detect")
def detect():

    video = cv2.VideoCapture("videos/traffic.mp4")

    if not video.isOpened():

        return jsonify({
            "status": "error",
            "message": "Unable to open traffic video."
        }), 500

    # ==========================================
    # VEHICLE COUNTERS
    # ==========================================

    car_count = 0
    motorcycle_count = 0
    bus_count = 0
    truck_count = 0

    ambulance_detection_frames = 0

    # ==========================================
    # PROCESS FRAMES
    # ==========================================

    frame_count = 0
    max_frames = 15

    vehicle_classes = {
        "car",
        "motorcycle",
        "bus",
        "truck"
    }

    while frame_count < max_frames:

        success, frame = video.read()

        if not success:
            break

        # ==========================================
        # 1. YOLO VEHICLE DETECTION
        # ==========================================

        results = model(
            frame,
            imgsz=416,
            verbose=False
        )

        for result in results:

            for box in result.boxes:

                class_id = int(box.cls[0])

                class_name = model.names[class_id]

                confidence = float(box.conf[0])

                if confidence < 0.40:
                    continue

                # ==========================================
                # COUNT VEHICLE TYPES
                # ==========================================

                if class_name == "car":
                    car_count += 1

                elif class_name == "motorcycle":
                    motorcycle_count += 1

                elif class_name == "bus":
                    bus_count += 1

                elif class_name == "truck":
                    truck_count += 1

        # ==========================================
        # 2. AMBULANCE DETECTION
        # ==========================================

        # Run Roboflow every 5th frame
        if frame_count % 5 == 0:

            ambulance_predictions = detect_ambulance(frame)

            ambulance_found_in_frame = False

            for prediction in ambulance_predictions:

                confidence = prediction.get(
                    "confidence",
                    0
                )

                if confidence >= 0.70:

                    ambulance_found_in_frame = True
                    break

            if ambulance_found_in_frame:

                ambulance_detection_frames += 1

        frame_count += 1

    video.release()

    # ==========================================
    # 3. TOTAL VEHICLE DETECTIONS
    # ==========================================

    total_vehicle_detections = (
        car_count
        + motorcycle_count
        + bus_count
        + truck_count
    )

    # ==========================================
    # 4. AMBULANCE STATUS
    # ==========================================

    emergency_vehicle_detected = (
        ambulance_detection_frames >= 1
    )

    ambulance_count = (
        1 if emergency_vehicle_detected else 0
    )

    # ==========================================
    # 5. TRAFFIC DENSITY
    # ==========================================

    if total_vehicle_detections >= 30:

        traffic_density = "HIGH"

    elif total_vehicle_detections >= 10:

        traffic_density = "MEDIUM"

    else:

        traffic_density = "LOW"

    # ==========================================
    # 6. ROAD OCCUPANCY
    # ==========================================

    # Approximate occupancy based on detected
    # traffic volume.

    if total_vehicle_detections >= 40:

        road_occupancy = 90

    elif total_vehicle_detections >= 30:

        road_occupancy = 78

    elif total_vehicle_detections >= 20:

        road_occupancy = 60

    elif total_vehicle_detections >= 10:

        road_occupancy = 40

    else:

        road_occupancy = 20

    # ==========================================
    # 7. RESPONSE
    # ==========================================

    return jsonify({

        "status": "success",

        "detection": {

            "vehicles": total_vehicle_detections,

            "cars": car_count,

            "motorcycles": motorcycle_count,

            "buses": bus_count,

            "trucks": truck_count,

            "ambulances": ambulance_count,

            "emergencyVehicleDetected":
                emergency_vehicle_detected,

            "trafficDensity":
                traffic_density,

            "roadOccupancy":
                road_occupancy

        }

    })

# ==========================================
# VIDEO GENERATOR
# ==========================================
def generate_video():

    video = cv2.VideoCapture("videos/traffic.mp4")

    if not video.isOpened():
         print("Unable to open traffic video.")
         return

    frame_count = 0
    ambulance_boxes = []

    while True:

        success, frame = video.read()

        if not success:
            break

        frame_count += 1

        # ==========================================
        # 1. AMBULANCE DETECTION
        # ==========================================

        # Run Roboflow every 5th frame
        if frame_count % 5 == 0:

            ambulance_predictions = detect_ambulance(frame)

            ambulance_boxes = []

            for prediction in ambulance_predictions:

                confidence = prediction.get(
                    "confidence",
                    0
                )

                if confidence >= 0.70:

                    x = prediction["x"]
                    y = prediction["y"]

                    width = prediction["width"]
                    height = prediction["height"]

                    x1 = int(x - width / 2)
                    y1 = int(y - height / 2)

                    x2 = int(x + width / 2)
                    y2 = int(y + height / 2)

                    ambulance_boxes.append(
                        (x1, y1, x2, y2, confidence)
                    )

        # ==========================================
        # 2. YOLO TRAFFIC DETECTION
        # ==========================================

        results = model(
            frame,
            imgsz=416,
            verbose=False
        )

        # Start with original frame
        annotated_frame = frame.copy()

        # ==========================================
        # 3. DRAW NORMAL VEHICLES
        # ==========================================

        for result in results:

            for box in result.boxes:

                class_id = int(box.cls[0])

                class_name = model.names[class_id]

                confidence = float(box.conf[0])

                # Ignore low-confidence detections
                if confidence < 0.40:
                    continue

                # Only show traffic vehicles
                if class_name not in {
                    "car",
                    "motorcycle",
                    "bus",
                    "truck"
                }:
                    continue

                # YOLO bounding box
                x1 = int(box.xyxy[0][0])
                y1 = int(box.xyxy[0][1])
                x2 = int(box.xyxy[0][2])
                y2 = int(box.xyxy[0][3])

                # ======================================
                # CHECK WHETHER THIS VEHICLE IS AMBULANCE
                # ======================================

                overlaps_ambulance = False

                for (
                    ax1,
                    ay1,
                    ax2,
                    ay2,
                    ambulance_conf
                ) in ambulance_boxes:

                    # Intersection
                    ix1 = max(x1, ax1)
                    iy1 = max(y1, ay1)

                    ix2 = min(x2, ax2)
                    iy2 = min(y2, ay2)

                    if ix2 > ix1 and iy2 > iy1:

                        intersection_area = (
                            (ix2 - ix1) *
                            (iy2 - iy1)
                        )

                        yolo_area = (
                            (x2 - x1) *
                            (y2 - y1)
                        )

                        if yolo_area > 0:

                            overlap_ratio = (
                                intersection_area /
                                yolo_area
                            )

                            if overlap_ratio >= 0.20:

                                overlaps_ambulance = True

                                break

                # ======================================
                # DON'T DRAW NORMAL VEHICLE
                # IF IT IS THE AMBULANCE
                # ======================================

                if overlaps_ambulance:
                    continue

                # ======================================
                # DRAW NORMAL VEHICLE
                # ======================================

                cv2.rectangle(
                    annotated_frame,
                    (x1, y1),
                    (x2, y2),
                    (255, 255, 0),
                    2
                )

                label = (
                    f"{class_name} "
                    f"{confidence:.2f}"
                )

                cv2.putText(
                    annotated_frame,
                    label,
                    (x1, max(y1 - 10, 20)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    (255, 255, 0),
                    2
                )

        # ==========================================
        # 4. DRAW AMBULANCE ON TOP
        # ==========================================

        for (
            x1,
            y1,
            x2,
            y2,
            confidence
        ) in ambulance_boxes:

            # Red ambulance bounding box
            cv2.rectangle(
                annotated_frame,
                (x1, y1),
                (x2, y2),
                (0, 0, 255),
                3
            )

            label = (
                f"AMBULANCE "
                f"{confidence * 100:.1f}%"
            )

            cv2.putText(
                annotated_frame,
                label,
                (x1, max(y1 - 10, 30)),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.9,
                (0, 0, 255),
                3
            )

        # ==========================================
        # 5. CONVERT FRAME TO JPEG
        # ==========================================

        success, buffer = cv2.imencode(
            ".jpg",
            annotated_frame
        )

        if not success:
            continue

        frame_bytes = buffer.tobytes()

        # ==========================================
        # 6. SEND FRAME TO BROWSER
        # ==========================================

        yield (
            b"--frame\r\n"
            b"Content-Type: image/jpeg\r\n\r\n"
            + frame_bytes
            + b"\r\n"
        )

    video.release()
# ==========================================
# VIDEO FEED
# ==========================================

@app.route("/video-feed")
def video_feed():

    return Response(

        generate_video(),

        mimetype=(
            "multipart/x-mixed-replace; "
            "boundary=frame"
        )
    )


# ==========================================
# START FLASK
# ==========================================

if __name__ == "__main__":

    app.run(
        port=8000,
        debug=True
    )