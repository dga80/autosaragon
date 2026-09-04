# Autos Aragón — Concesionario de Vehículos de Ocasión (Barcelona)

> Rediseño moderno y **Mobile-First** para **Autos Aragón**, concesionario multimarca en Carrer d'Aragó nº 507, Barcelona (desde 1994).

---

## 🚗 Características Principales

- **Diseño Mobile-First de Alta Fidelidad**: Inspirado en el sistema de diseño *"Obsidian Red Prestige"* con estética dark automotive, cristal esmerilado (*glassmorphism*) y acentos dinámicos en carmesí `#e11d48`.
- **Fotografías Reales en Alta Resolución**: Más de 220 fotos reales de los vehículos en stock extraídas directamente de las instalaciones del concesionario en Barcelona.
- **Barra de Navegación Inferior Móvil**: Acceso táctil inmediato con el pulgar para:
  - 🚗 **Stock**: Catálogo completo filtrable en tiempo real.
  - 💶 **Tasar**: Calculadora interactiva de tasación en 2 pasos.
  - 📞 **Llamar**: Conexión telefónica directa al showroom (`93 232 87 15`).
  - 💬 **WhatsApp**: Asistente comercial con mensajes preconfigurados.
- **Filtros Táctiles Inmediatos**:
  - Filtros rápidos tipo *chip* (SUV, Híbrido ECO, Automático, Hasta 20.000 €, Mis Favoritos).
  - Buscador de texto en vivo y selector avanzado por marca, combustible y rango de precio.
- **Ficha Completa de Vehículo (Bottom Sheet / Modal)**:
  - Galería táctil de fotografías con contador y carrusel de miniaturas.
  - Tabla de telemetría técnica (CV, tipo de cambio, combustible, kilometraje, año, color, garantía).
  - Calculadora de financiación en tiempo real (regula entrada y meses para ver la cuota estimada).
  - Botón de reserva directa por WhatsApp indicando modelo y precio.
- **Sección "Compramos tu Coche"**:
  - Valoración estimada online en base a marca, modelo, año y km.
  - Gestión integral del cambio de nombre gratuito en gestoría y pago al contado inmediato.
- **Ubicación & Contacto en Barcelona**:
  - Dirección: **Calle Aragó nº 507-509, 08013 Barcelona** (Metros Encants L2 y Clot L1/L2).
  - Horario: Lunes a Viernes de 10:00h a 14:00h y de 17:00h a 20:00h.
  - Mapa interactivo de Google Maps integrado.

---

## 📂 Estructura del Proyecto

```
AA/
├── index.html                  # Aplicación web mobile-first
├── styles.css                  # Estilos visuales, animaciones y glassmorphism
├── app.js                      # Motor interactivo, filtrado, modal y calculadora
├── data.js                     # Dataset local de coches en stock
├── cars_catalog_clean.json     # Catálogo estructurado en JSON
├── assets/
│   ├── logo.svg                # Logotipo vectorial de Autos Aragón
│   └── cars/                   # Fotografías reales organizadas por vehículo
│       ├── bmw-x1-.../
│       ├── audi-q5-.../
│       ├── mazda-cx5-.../
│       └── ...
└── README.md
```

---

## 🚀 Cómo Ejecutar Localmente

No requiere dependencias complejas ni compilación:

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/dga80/autosaragon.git
   cd autosaragon
   ```

2. Abrir directamente `index.html` en el navegador o iniciar un servidor local:
   ```bash
   python -m http.server 8080
   ```
   Luego visitar `http://localhost:8080`.
