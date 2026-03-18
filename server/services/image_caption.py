import sys
import json
import warnings
from PIL import Image

warnings.filterwarnings("ignore")

try:
    from transformers import BlipProcessor, BlipForConditionalGeneration
except ImportError:
    print(json.dumps({"error": "Transformers library not found. Please install transformers"}))
    sys.exit(1)

try:
    import pytesseract
except ImportError:
    pytesseract = None


# 🔹 LOAD MODEL ONLY ONCE (FAST)
processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")


def analyze_image(image_path):
    try:
        # Load image
        raw_image = Image.open(image_path).convert("RGB")
        raw_image.thumbnail((512, 512))

        # 1. OCR Step
        if pytesseract is not None:
            try:
                extracted_text = pytesseract.image_to_string(raw_image).strip()
                if len(extracted_text) > 20:
                    print(json.dumps({"caption": f"OCR Text Detected: {extracted_text}"}))
                    return
            except Exception:
                pass # Fallback to BLIP if tesseract is not installed on system

        # 2. BLIP Fallback
        # CPU inference
        inputs = processor(raw_image, return_tensors="pt")

        out = model.generate(**inputs, max_new_tokens=50)

        caption = processor.decode(out[0], skip_special_tokens=True)

        print(json.dumps({"caption": caption}))

    except Exception as e:
        print(json.dumps({"error": str(e)}))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No image path provided."}))
        sys.exit(1)

    image_path = sys.argv[1]
    analyze_image(image_path)