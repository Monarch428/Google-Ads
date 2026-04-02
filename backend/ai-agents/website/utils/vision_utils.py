import cv2
import numpy as np
from collections import Counter

def extract_dominant_colors(image_path, num_colors=5):
    """
    Extract dominant color RGB values from an image.
    """
    image = cv2.imread(image_path)
    if image is None:
        return []
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    pixels = image.reshape((-1, 3))
    colors, count = np.unique(pixels, axis=0, return_counts=True)
    dominant = colors[count.argsort()[::-1][:num_colors]]
    return [tuple(c) for c in dominant]


def verify_logo_presence(site_screenshot, logo_template):
    """
    Detect if the brand logo exists in the page screenshot using template matching.
    """
    try:
        image = cv2.imread(site_screenshot, 0)
        logo = cv2.imread(logo_template, 0)
        res = cv2.matchTemplate(image, logo, cv2.TM_CCOEFF_NORMED)
        loc = np.where(res >= 0.8)
        return len(list(zip(*loc[::-1]))) > 0
    except Exception:
        return False
