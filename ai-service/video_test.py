import cv2

video = cv2.VideoCapture("videos/traffic.webm")

if not video.isOpened():
    print("ERROR: Could not open WebM video")
else:
    print("SUCCESS: WebM video opened")

    success, frame = video.read()

    if success:
        print("SUCCESS: Frame read successfully")
        print("Frame size:", frame.shape)
    else:
        print("ERROR: Could not read frame")

video.release()