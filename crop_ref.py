from PIL import Image

img = Image.open('frontend/public/user_reference_full.jpg')
w, h = img.size
print('Original dimensions:', w, h)

# Left part contains the factory picture up to the split boundary
# The split is at exactly x = 50.7% of width
split_x = int(w * 0.5065)
factory_img = img.crop((0, 0, split_x, h))
factory_img.save('frontend/public/holcim_factory_reference.jpg', quality=95)
print('Saved factory image with size:', factory_img.size)

# Also let's inspect the Holcim logo from the right side
# The logo is centered horizontally on the right half, around y=15% to 35%
logo_box = img.crop((int(w * 0.60), int(h * 0.16), int(w * 0.90), int(h * 0.32)))
logo_box.save('frontend/public/holcim_logo_crop.png')
print('Logo crop saved.')
