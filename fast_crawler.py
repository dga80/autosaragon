import urllib.request
import re
import json
import os
from concurrent.futures import ThreadPoolExecutor, as_completed

car_urls = [
    'https://www.autosaragon.com/audi-q5-2-0tfsi-quattro-tiptronic-advance-edition',
    'https://www.autosaragon.com/bmw-x1-2-0d-xdrive-m-sport-pro',
    'https://www.autosaragon.com/mitsibishi-eclipse-cross',
    'https://www.autosaragon.com/hyundai-i10-4304-mrr',
    'https://www.autosaragon.com/kia-picanto-1-0dpi-concept',
    'https://www.autosaragon.com/nissan-qashqai-1-3-dig-t-160cv-acenta',
    'https://www.autosaragon.com/renault-captur-intens-tce-140cv-mild-hibrido',
    'https://www.autosaragon.com/renault-megane-1-5-dci-sport-tourer-115cv',
    'https://www.autosaragon.com/renault-kadjar-tech-road',
    'https://www.autosaragon.com/toyota-yaris-120h-gr-sport-plus',
    'https://www.autosaragon.com/toyota-corolla-9479-lvw',
    'https://www.autosaragon.com/toyota-corolla-125h-style-ecvt',
    'https://www.autosaragon.com/vw-passat-variant-1-6-tdi-120cv',
    'https://www.autosaragon.com/mazda-cx5-2-0-homura'
]

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

def download_file(url, out_path):
    if os.path.exists(out_path) and os.path.getsize(out_path) > 1000:
        return out_path
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=12) as resp:
        data = resp.read()
        with open(out_path, 'wb') as f:
            f.write(data)
    return out_path

def process_car(url):
    slug = url.split('/')[-1]
    car_dir = os.path.join('assets', 'cars', slug)
    os.makedirs(car_dir, exist_ok=True)
    
    try:
        req = urllib.request.Request(url, headers=headers)
        html = urllib.request.urlopen(req, timeout=15).read().decode('utf-8', errors='ignore')
    except Exception as e:
        print(f"Error fetching page {url}: {e}", flush=True)
        return None
        
    # Extract images
    img_urls_raw = re.findall(r'(https://lh3\.googleusercontent\.com/sitesv/[^"\'\s<>\)]+)', html)
    seen = set()
    unique_imgs = []
    for raw in img_urls_raw:
        base = raw.split('=')[0]
        if base not in seen and len(base) > 60:
            seen.add(base)
            unique_imgs.append(base + '=w1200')
            
    print(f"[{slug}] Found {len(unique_imgs)} photos. Downloading...", flush=True)
    
    downloaded_paths = []
    # Download top 12 best photos per car to keep load time fast & high quality
    photos_to_dl = unique_imgs[:16]
    
    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = {}
        for idx, p_url in enumerate(photos_to_dl):
            fn = f"img_{idx+1:02d}.jpg"
            fp = os.path.join(car_dir, fn)
            futures[pool.submit(download_file, p_url, fp)] = f"assets/cars/{slug}/{fn}"
            
        for f in as_completed(futures):
            rel = futures[f]
            try:
                f.result()
                downloaded_paths.append(rel)
            except Exception as dl_err:
                pass
                
    downloaded_paths.sort()
    
    # Clean text to extract title, specs, equipment, comments
    clean_text = re.sub(r'<script.*?</script>', '', html, flags=re.DOTALL)
    clean_text = re.sub(r'<style.*?</style>', '', clean_text, flags=re.DOTALL)
    clean_text = re.sub(r'<[^>]+>', '\n', clean_text)
    raw_lines = [l.strip() for l in clean_text.split('\n') if l.strip()]
    lines = [l for l in raw_lines if not any(x in l for x in [
        'Skip to', 'Search this', 'Embedded Files', 'Google Sites', 'Report abuse', 'Page details', 'cookies',
        'HOME', 'STOCK', 'COMPRAMOS TU COCHE', 'CONTACTO', 'QUIENES SOMOS', 'More', 'WWW.AUTOSARAGON.COM'
    ])]
    
    # Parse title & details
    title = slug.replace('-', ' ').upper()
    for l in lines[:6]:
        if any(b in l.upper() for b in ['AUDI', 'BMW', 'HYUNDAI', 'KIA', 'MAZDA', 'MITSUBISHI', 'NISSAN', 'RENAULT', 'TOYOTA', 'VW', 'VOLKSWAGEN']):
            title = l
            break
            
    specs = {
        'precio': '',
        'km': '',
        'año': '',
        'combustible': '',
        'cambio': '',
        'color': '',
        'puertas': '5',
        'plazas': '5',
        'etiqueta': 'C',
        'potencia': '',
        'garantia': '12 Meses incluida'
    }
    
    full_text = " ".join(lines)
    
    # Specific extraction based on lines
    for i, l in enumerate(lines):
        ll = l.lower()
        if 'pvp' in ll or 'precio' in ll:
            if i+1 < len(lines):
                specs['precio'] = lines[i+1].replace('', '€')
        elif ll == 'km:' or ll.startswith('km'):
            if i+1 < len(lines):
                specs['km'] = lines[i+1]
        elif 'año' in ll or 'ao' in ll or 'matricul' in ll:
            if i+1 < len(lines):
                specs['año'] = lines[i+1]
        elif 'combustible' in ll:
            if i+1 < len(lines):
                specs['combustible'] = lines[i+1]
        elif 'cambio' in ll:
            if i+1 < len(lines):
                specs['cambio'] = lines[i+1]
        elif 'color' in ll:
            if i+1 < len(lines):
                specs['color'] = lines[i+1]
        elif 'puertas' in ll:
            if i+1 < len(lines):
                specs['puertas'] = lines[i+1]
        elif 'plazas' in ll:
            if i+1 < len(lines):
                specs['plazas'] = lines[i+1]
        elif 'etiqueta' in ll:
            if i+1 < len(lines):
                specs['etiqueta'] = lines[i+1].upper()
        elif 'potencia' in ll:
            if i+1 < len(lines):
                specs['potencia'] = lines[i+1]
        elif 'garant' in ll or 'garanta' in ll:
            specs['garantia'] = l.replace('', 'í')
            
    # Equipment and comments
    equipment = []
    comments = ""
    in_eq = False
    in_com = False
    for l in lines:
        if 'EQUIPAMIENTO' in l.upper():
            in_eq = True
            in_com = False
            continue
        elif 'COMENTARIOS' in l.upper():
            in_eq = False
            in_com = True
            continue
        elif 'AUTOS ARAGON' in l.upper() or 'TLF 93' in l:
            in_eq = False
            in_com = False
            break
            
        if in_eq and len(l) > 2:
            equipment.append(l)
        elif in_com and len(l) > 2:
            comments += " " + l

    # Brand extraction
    brand = title.split()[0].title()
    if brand.upper() == 'VW':
        brand = 'Volkswagen'
        
    # Badge DGT
    dgt = 'C'
    comb = (specs.get('combustible') or '').upper()
    if 'HIBR' in comb or 'HÍBR' in comb or 'ECO' in full_text.upper() or '120H' in title or '125H' in title:
        dgt = 'ECO'
    elif 'ELECT' in comb or 'ELÉCT' in comb:
        dgt = '0 EMISIONES'
    specs['etiqueta'] = dgt

    car = {
        'id': slug,
        'brand': brand,
        'title': title,
        'slug': slug,
        'specs': specs,
        'equipment': equipment,
        'comments': comments.strip(),
        'images': downloaded_paths,
        'thumbnail': downloaded_paths[0] if downloaded_paths else ""
    }
    print(f"[{slug}] Finished: {title} - {specs['precio']} ({len(downloaded_paths)} imgs)", flush=True)
    return car

def main():
    print(f"Starting crawl of {len(car_urls)} cars with ThreadPoolExecutor...", flush=True)
    results = []
    with ThreadPoolExecutor(max_workers=5) as pool:
        future_to_url = {pool.submit(process_car, u): u for u in car_urls}
        for future in as_completed(future_to_url):
            res = future.result()
            if res and res.get('images'):
                results.append(res)
                
    # Sort logically
    results.sort(key=lambda x: x['title'])
    
    with open('cars_catalog.json', 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
        
    print(f"\nSUCCESS: Saved {len(results)} cars with real downloaded photos to cars_catalog.json!", flush=True)

if __name__ == '__main__':
    main()
