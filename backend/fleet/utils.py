# backend/fleet/utils.py
from ultralytics import YOLO
import cv2
from PIL import Image
import numpy as np

# Load model once
model = YOLO('media/ai_models/yolov8n_damage.pt')  # or your trained model

def detect_vehicle_damage(image_path):
    """Returns damage confidence and annotated image"""
    results = model(image_path)[0]

    damage_found = False
    max_conf = 0.0
    labels = []

    for result in results.boxes:
        conf = float(result.conf[0])
        cls = int(result.cls[0])
        label = model.names[cls]

        if "damage" in label.lower() or "scratch" in label.lower() or "dent" in label.lower():
            if conf > max_conf:
                max_conf = conf
            damage_found = True
            labels.append(f"{label} ({conf:.2f})")

    # Save annotated image
    annotated = results.plot()
    annotated_path = image_path.replace(".jpg", "_damage.jpg").replace(".png", "_damage.png")
    cv2.imwrite(annotated_path, annotated)

    return {
        "damage_detected": damage_found,
        "confidence": round(max_conf, 3) if damage_found else 0,
        "labels": labels,
        "annotated_image": annotated_path
    }