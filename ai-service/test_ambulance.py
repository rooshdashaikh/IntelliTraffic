import requests
import base64

# Your Roboflow API key
API_KEY = "j5pMdlYG1FKf1mjNcZgW"

# Roboflow ambulance model
MODEL_ID = "ambulance-detection-ylj92/2"

# Test image
IMAGE_PATH = "ambulance.jpg"

# Read image
with open(IMAGE_PATH, "rb") as image_file:
    image_base64 = base64.b64encode(
        image_file.read()
    ).decode("utf-8")

# Roboflow API URL
url = (
    f"https://serverless.roboflow.com/"
    f"{MODEL_ID}"
    f"?api_key={API_KEY}"
)

# Send image
response = requests.post(
    url,
    data=image_base64,
    headers={
        "Content-Type": "application/x-www-form-urlencoded"
    }
)

print("Status code:", response.status_code)
print("Response:")
print(response.text)