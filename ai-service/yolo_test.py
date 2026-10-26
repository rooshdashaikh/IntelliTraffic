from ultralytics import YOLO

# Load YOLOv8 nano model
model = YOLO("yolov8n.pt")

# Test detection using a sample image
results = model("https://ultralytics.com/images/bus.jpg")

# Display detected objects
for result in results:
    print("Detected objects:")

    for box in result.boxes:
        class_id = int(box.cls[0])
        confidence = float(box.conf[0])

        class_name = model.names[class_id]

        print(
            f"{class_name} - "
            f"confidence: {confidence:.2f}"
        )