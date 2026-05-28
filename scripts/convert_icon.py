import os
from PIL import Image

os.makedirs('public', exist_ok=True)
img_path = r'C:\Users\chris\.gemini\antigravity-ide\brain\55639f44-4511-4aa3-8f7c-e55a008a5f78\own_optimizer_logo_1779927127135.png'
img = Image.open(img_path)
img.save('public/icon.ico', format='ICO', sizes=[(256, 256)])
print("Icon created successfully.")
