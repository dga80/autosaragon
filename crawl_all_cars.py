import urllib.request
import re
import json
import os
import time

car_slugs = [
    '/audi-q5-2-0tfsi-quattro-tiptronic-advance-edition',
    '/bmw-x1-2-0d-xdrive-m-sport-pro',
    '/hyundai-i10-4304-mrr',
    '/kia-picanto-1-0dpi-concept',
    '/mazda-cx5-2-0-homura',
    '/mitsibishi-eclipse-cross',
    '/nissan-qashqai-1-3-dig-t-160cv-acenta',
    '/renault-captur-intens-tce-140cv-mild-hibrido',
    '/renault-kadjar-tech-road',
    '/renault-megane-1-5-dci-sport-tourer-115cv',
    '/toyota-corolla-125h-style-ecvt',
    '/toyota-corolla-9479-lvw',
    '/toyota-yaris-120h-gr-sport-plus',
    '/vw-passat-variant-1-6-tdi-120cv'
]

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

os.makedirs('assets/cars', exist_ok=True)
cars_data = []

for slug in car_slugs:
    url = f"https://www.autosaragon.com{slug}"
    folder_name = slug.strip('/')
    car_dir = os.path.join('assets', 'cars', folder_name)
    os.makedirs(car_dir, exist_ok=True)
    
    print(f"\n--- Fetching: {url} ---")
    try:
        req = urllib.request.Request(url, headers=headers)
        html = urllib.request.urlopen(req, timeout=20).read().decode('utf-8', errors='ignore')
        
        # Find all sitesv image URLs
        # In Google Sites, images often end with =w... or =s...
        img_urls_raw = re.findall(r'(https://lh3\.googleusercontent\.com/sitesv/[^"\'\s<>\)]+)', html)
        
        # Deduplicate preserving order
        unique_imgs = []
        seen = set()
        for img in img_urls_raw:
            # Normalize to w1200 high-res
            base_url = img.split('=')[0]
            if base_url not in seen and len(base_url) > 60:
                seen.add(base_url)
                # use high quality resolution
                unique_imgs.append(base_url + '=w1200')
                
        print(f"Found {len(unique_imgs)} unique car photos")
        
        # Download images
        downloaded_images = []
        for idx, img_url in enumerate(unique_imgs):
            ext = 'jpg'
            local_filename = f"img_{idx+1:02d}.{ext}"
            local_path = os.path.join(car_dir, local_filename)
            rel_path = f"assets/cars/{folder_name}/{local_filename}"
            
            if not os.path.exists(local_path) or os.path.getsize(local_path) < 1000:
                try:
                    img_req = urllib.request.Request(img_url, headers=headers)
                    with urllib.request.urlopen(img_req, timeout=15) as resp:
                        img_bytes = resp.read()
                        with open(local_path, 'wb') as f:
                            f.write(img_bytes)
                    print(f"  Downloaded {local_filename} ({len(img_bytes)} bytes)")
                except Exception as img_err:
                    print(f"  Failed downloading {img_url[:60]}: {img_err}")
            
            if os.path.exists(local_path) and os.path.getsize(local_path) > 1000:
                downloaded_images.append(rel_path)
                
        # Extract title and specifications
        clean_text = re.sub(r'<script.*?</script>', '', html, flags=re.DOTALL)
        clean_text = re.sub(r'<style.*?</style>', '', clean_text, flags=re.DOTALL)
        clean_text = re.sub(r'<[^>]+>', '\n', clean_text)
        lines = [l.strip() for l in clean_text.split('\n') if l.strip()]
        
        # Filter out navigation and site chrome
        filtered_lines = [l for l in lines if not any(x in l for x in [
            'Skip to', 'Search this', 'Embedded Files', 'Google Sites', 'Report abuse', 'Page details', 'cookies',
            'HOME', 'STOCK', 'COMPRAMOS TU COCHE', 'CONTACTO', 'QUIENES SOMOS', 'More', 'WWW.AUTOSARAGON.COM'
        ])]
        
        # Find title
        title = folder_name.replace('-', ' ').upper()
        if filtered_lines:
            # Usually the first significant line is the car title
            for fl in filtered_lines[:5]:
                if any(brand in fl.upper() for brand in ['AUDI', 'BMW', 'HYUNDAI', 'KIA', 'MAZDA', 'MITSUBISHI', 'NISSAN', 'RENAULT', 'TOYOTA', 'VW', 'VOLKSWAGEN']):
                    title = fl
                    break
                    
        # Extract specs
        specs = {}
        for i, line in enumerate(filtered_lines):
            line_lower = line.lower()
            if 'pvp' in line_lower or 'precio' in line_lower:
                if i+1 < len(filtered_lines):
                    specs['price'] = filtered_lines[i+1]
            elif line_lower.startswith('km') or line_lower.startswith('kilometros'):
                if i+1 < len(filtered_lines):
                    specs['km'] = filtered_lines[i+1]
            elif 'año' in line_lower or 'matriculac' in line_lower or 'fecha' in line_lower:
                if i+1 < len(filtered_lines):
                    specs['year'] = filtered_lines[i+1]
            elif 'combustible' in line_lower:
                if i+1 < len(filtered_lines):
                    specs['fuel'] = filtered_lines[i+1]
            elif 'cambio' in line_lower or 'transmisi' in line_lower:
                if i+1 < len(filtered_lines):
                    specs['gearbox'] = filtered_lines[i+1]
            elif 'color' in line_lower:
                if i+1 < len(filtered_lines):
                    specs['color'] = filtered_lines[i+1]
            elif 'puertas' in line_lower:
                if i+1 < len(filtered_lines):
                    specs['doors'] = filtered_lines[i+1]
            elif 'plazas' in line_lower:
                if i+1 < len(filtered_lines):
                    specs['seats'] = filtered_lines[i+1]
            elif 'potencia' in line_lower or 'cv' in line_lower:
                if i+1 < len(filtered_lines):
                    specs['power'] = filtered_lines[i+1]
                    
        car_info = {
            'id': folder_name,
            'title': title,
            'slug': slug,
            'images': downloaded_images,
            'specs': specs,
            'raw_text_sample': filtered_lines[:30]
        }
        cars_data.append(car_info)
        print(f"Saved car {title} with {len(downloaded_images)} images and specs: {specs}")
    except Exception as e:
        print(f"Error fetching {slug}: {e}")

with open('cars_catalog.json', 'w', encoding='utf-8') as f:
    json.dump(cars_data, f, indent=2, ensure_ascii=False)
print(f"\nAll done! Extracted {len(cars_data)} cars to cars_catalog.json and downloaded photos.")
