import numpy as np
import skfuzzy as fuzz

# Define fuzzy sets for 'Aspect Ratio' and 'Area'
x_aspect = np.linspace(0, 2, 100)  # Aspect Ratio: [0, 2]
x_area = np.linspace(0, 1000, 100)  # Area: [0, 1000]

# Fuzzy membership functions for Aspect Ratio
aspect_small = fuzz.trimf(x_aspect, [0, 0, 1])
aspect_medium = fuzz.trimf(x_aspect, [0, 1, 2])
aspect_large = fuzz.trimf(x_aspect, [1, 2, 2])

# Fuzzy membership functions for Area
area_small = fuzz.trimf(x_area, [0, 0, 500])
area_medium = fuzz.trimf(x_area, [0, 500, 1000])
area_large = fuzz.trimf(x_area, [500, 1000, 1000])

# Define example input values (aspect ratio, area)
input_aspect = 1.2  # Example: aspect ratio of the character
input_area = 350  # Example: area of the character

# Calculate membership degrees
aspect_deg_small = fuzz.interp_membership(x_aspect, aspect_small, input_aspect)
aspect_deg_medium = fuzz.interp_membership(x_aspect, aspect_medium, input_aspect)
aspect_deg_large = fuzz.interp_membership(x_aspect, aspect_large, input_aspect)

area_deg_small = fuzz.interp_membership(x_area, area_small, input_area)
area_deg_medium = fuzz.interp_membership(x_area, area_medium, input_area)
area_deg_large = fuzz.interp_membership(x_area, area_large, input_area)

# Output results
print(f"Aspect Ratio Small: {aspect_deg_small:.2f}, Medium: {aspect_deg_medium:.2f}, Large: {aspect_deg_large:.2f}")
print(f"Area Small: {area_deg_small:.2f}, Medium: {area_deg_medium:.2f}, Large: {area_deg_large:.2f}")
