// Autos Aragón - Mobile-First Interactive Engine

document.addEventListener('DOMContentLoaded', () => {
  const cars = window.CARS_DATA || [];
  
  // State
  let activeFilter = 'all';
  let searchQuery = '';
  let selectedBrand = 'all';
  let selectedBody = 'all';
  let selectedFuel = 'all';
  let selectedGear = 'all';
  let maxPrice = 60000;
  let sortBy = 'featured';
  let currentCarIndex = 0;
  let favorites = JSON.parse(localStorage.getItem('aa_favorites') || '[]');

  // Universal formatting helpers
  function formatPrice(car) {
    if (car && car.price_num) {
      return car.price_num.toLocaleString('es-ES') + ' €';
    }
    return (car?.specs?.precio || '20.000 €').replace(/[^\d.]/g, '') + ' €';
  }

  function formatCuota(car) {
    if (car && car.cuota && !car.cuota.includes('') && car.cuota.includes('€')) {
      return car.cuota.replace('Desde ', '');
    }
    const p = car?.price_num || 20000;
    return `${Math.round(p * 0.0115)} €/mes`;
  }

  // DOM Elements
  const carsGrid = document.getElementById('cars-grid');
  const carCountEl = document.getElementById('cars-count');
  const searchInput = document.getElementById('search-input');
  const brandFilter = document.getElementById('filter-brand');
  const bodyFilter = document.getElementById('filter-body');
  const fuelFilter = document.getElementById('filter-fuel');
  const gearFilter = document.getElementById('filter-gear');
  const sortSelect = document.getElementById('sort-select');
  const priceSlider = document.getElementById('price-slider');
  const priceDisplay = document.getElementById('price-slider-display');
  const quickFilterChips = document.querySelectorAll('.filter-chip');

  // Modal elements
  const modal = document.getElementById('car-modal');
  const modalContent = document.getElementById('modal-body-content');
  const closeModalBtn = document.getElementById('close-modal-btn');
  const modalOverlay = document.getElementById('modal-overlay');

  // Mobile menu
  const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
  const mobileDrawer = document.getElementById('mobile-drawer');
  const closeDrawerBtn = document.getElementById('close-drawer-btn');

  // Valuation form
  const valuationForm = document.getElementById('valuation-form');
  const valuationResult = document.getElementById('valuation-result');

  // Populate brand filter dropdown dynamically
  if (brandFilter) {
    const brands = Array.from(new Set(cars.map(c => c.brand))).sort();
    brands.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b.toLowerCase();
      opt.textContent = `${b} (${cars.filter(c => c.brand === b).length})`;
      brandFilter.appendChild(opt);
    });
  }

  // Filter Logic
  function getFilteredCars() {
    return cars.filter(car => {
      // Text search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const text = `${car.title} ${car.brand} ${car.specs.combustible} ${car.body_type} ${car.specs.año}`.toLowerCase();
        if (!text.includes(q)) return false;
      }

      // Quick chips
      if (activeFilter === 'suv' && car.body_type !== 'SUV') return false;
      if (activeFilter === 'eco' && car.specs.etiqueta !== 'ECO') return false;
      if (activeFilter === 'automatic' && !car.specs.cambio.toLowerCase().includes('auto')) return false;
      if (activeFilter === 'under20k' && car.price_num > 20000) return false;
      if (activeFilter === 'favs' && !favorites.includes(car.id)) return false;

      // Select filters
      if (selectedBrand !== 'all' && car.brand.toLowerCase() !== selectedBrand) return false;
      if (selectedBody !== 'all' && car.body_type.toLowerCase() !== selectedBody) return false;
      if (selectedFuel !== 'all') {
        const f = car.specs.combustible.toLowerCase();
        if (selectedFuel === 'eco' && car.specs.etiqueta !== 'ECO') return false;
        if (selectedFuel === 'gasolina' && !f.includes('gasolina')) return false;
        if (selectedFuel === 'diesel' && !f.includes('diésel') && !f.includes('diesel')) return false;
      }
      if (selectedGear !== 'all') {
        const g = car.specs.cambio.toLowerCase();
        if (selectedGear === 'auto' && !g.includes('auto')) return false;
        if (selectedGear === 'manual' && !g.includes('manual')) return false;
      }

      // Max price
      if (car.price_num > maxPrice) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.price_num - b.price_num;
      if (sortBy === 'price-desc') return b.price_num - a.price_num;
      if (sortBy === 'km-asc') {
        const kmA = parseInt((a.specs.km || '0').replace(/\D/g, '')) || 0;
        const kmB = parseInt((b.specs.km || '0').replace(/\D/g, '')) || 0;
        return kmA - kmB;
      }
      if (sortBy === 'year-desc') {
        const yA = parseInt((a.specs.año || '0').replace(/\D/g, '')) || 0;
        const yB = parseInt((b.specs.año || '0').replace(/\D/g, '')) || 0;
        return yB - yA;
      }
      return 0; // default order
    });
  }

  // Render Car Cards
  function renderCars() {
    const list = getFilteredCars();
    if (carCountEl) carCountEl.textContent = `${list.length} vehículos disponibles`;

    if (!carsGrid) return;

    if (list.length === 0) {
      carsGrid.innerHTML = `
        <div class="col-span-full py-16 text-center">
          <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
            <span class="material-symbols-outlined text-3xl">directions_car</span>
          </div>
          <h3 class="text-xl font-sora font-bold text-white mb-2">No se han encontrado vehículos</h3>
          <p class="text-sm text-slate-400 max-w-md mx-auto mb-6">Prueba a restablecer los filtros o ajustar el rango de precio para ver todos los coches disponibles en nuestro showroom.</p>
          <button id="reset-filters-btn" class="px-6 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-sora font-semibold text-sm transition-all shadow-lg shadow-rose-600/20">
            Ver todo el stock
          </button>
        </div>
      `;
      document.getElementById('reset-filters-btn')?.addEventListener('click', resetAllFilters);
      return;
    }

    carsGrid.innerHTML = list.map((car, idx) => {
      const isFav = favorites.includes(car.id);
      const displayPrice = formatPrice(car);
      const displayCuota = formatCuota(car);
      const badgeDGT = car.specs.etiqueta === 'ECO' ? 
        `<span class="badge-eco px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>ECO
        </span>` : 
        `<span class="badge-c px-2 py-0.5 rounded text-[11px] font-mono font-bold uppercase tracking-wider">
          Etiqueta C
        </span>`;

      const mainImg = car.images[0] || 'assets/logo.svg';
      const secondImg = car.images[1] || mainImg;

      return `
        <article class="glass-card rounded-2xl overflow-hidden flex flex-col group animate-fade-in" data-car-id="${car.id}">
          <!-- Photo Container -->
          <div class="relative w-full aspect-[16/10] bg-slate-900 overflow-hidden cursor-pointer" onclick="window.openCarDetail('${car.id}')">
            <img src="${mainImg}" alt="${car.title}" loading="lazy" class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" id="img-${car.id}">
            
            <!-- Gradient Overlay -->
            <div class="absolute inset-0 bg-gradient-to-t from-[#0b0f17] via-transparent to-black/30 pointer-events-none"></div>

            <!-- Top Badges -->
            <div class="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
              <div class="flex items-center gap-1.5">
                ${badgeDGT}
                <span class="px-2 py-0.5 rounded bg-black/60 backdrop-blur-md text-[10px] font-mono font-medium text-slate-300 border border-white/10">
                  ${car.images.length} FOTOS REALES
                </span>
              </div>
              <button onclick="event.stopPropagation(); window.toggleFavorite('${car.id}')" class="w-8 h-8 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white/80 hover:text-rose-500 transition-colors pointer-events-auto touch-press">
                <span class="material-symbols-outlined text-[18px] ${isFav ? 'text-rose-500 fill-1' : ''}">${isFav ? 'favorite' : 'favorite_border'}</span>
              </button>
            </div>

            <!-- Quick Photo Dots Indicator for Mobile -->
            <div class="absolute bottom-2 left-3 flex items-center gap-1">
              <span class="w-2 h-1 rounded-full bg-rose-500"></span>
              <span class="w-1 h-1 rounded-full bg-white/40"></span>
              <span class="w-1 h-1 rounded-full bg-white/40"></span>
              <span class="w-1 h-1 rounded-full bg-white/40"></span>
            </div>

            <!-- Body Type Tag -->
            <span class="absolute bottom-2 right-3 px-2 py-0.5 rounded bg-slate-900/80 backdrop-blur-md text-[10px] font-sora font-semibold text-slate-300 uppercase tracking-wider">
              ${car.body_type}
            </span>
          </div>

          <!-- Card Content -->
          <div class="p-4 sm:p-5 flex flex-col flex-1 justify-between">
            <div>
              <!-- Brand & Guarantee Pill -->
              <div class="flex items-center justify-between gap-2 mb-1.5">
                <span class="text-xs font-mono font-semibold text-rose-400 uppercase tracking-wider">${car.brand}</span>
                <span class="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                  <span class="material-symbols-outlined text-[14px] text-emerald-400">verified</span> 12M Garantía
                </span>
              </div>

              <!-- Car Title -->
              <h3 class="font-sora font-bold text-base sm:text-lg text-white leading-snug group-hover:text-rose-400 transition-colors cursor-pointer line-clamp-2" onclick="window.openCarDetail('${car.id}')">
                ${car.title}
              </h3>

              <!-- Spec Micro-Grid -->
              <div class="grid grid-cols-3 gap-2 my-3.5 py-2.5 px-3 rounded-xl bg-slate-900/60 border border-white/5 font-mono text-xs text-slate-300">
                <div class="flex flex-col">
                  <span class="text-[10px] text-slate-500 uppercase">Kilómetros</span>
                  <span class="font-bold text-slate-200">${car.specs.km || 'N/D'}</span>
                </div>
                <div class="flex flex-col border-l border-white/5 pl-2">
                  <span class="text-[10px] text-slate-500 uppercase">Año</span>
                  <span class="font-bold text-slate-200">${(car.specs.año || '').slice(-4) || '2022'}</span>
                </div>
                <div class="flex flex-col border-l border-white/5 pl-2">
                  <span class="text-[10px] text-slate-500 uppercase">Cambio</span>
                  <span class="font-bold text-slate-200 truncate">${car.specs.cambio.includes('Auto') ? 'Automático' : 'Manual'}</span>
                </div>
              </div>
            </div>

            <!-- Price & Action Footer -->
            <div class="pt-3 border-t border-white/5 flex items-end justify-between gap-3">
              <div>
                <div class="text-xs font-mono text-slate-400">PVP Contado</div>
                <div class="font-sora font-extrabold text-xl sm:text-2xl text-white tracking-tight">${displayPrice}</div>
                <div class="text-[11px] font-mono text-rose-400">Desde ${displayCuota}</div>
              </div>

              <div class="flex items-center gap-1.5">
                <!-- WhatsApp Quick Trigger -->
                <a href="https://wa.me/34932328715?text=Hola%20Autos%20Arag%C3%B3n,%20me%20interesa%20el%20${encodeURIComponent(car.title)}%20(${encodeURIComponent(displayPrice)}).%20%C2%BFSigue%20disponible?" target="_blank" rel="noopener" class="w-10 h-10 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 flex items-center justify-center transition-all touch-press" title="Consultar por WhatsApp">
                  <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.18-2.587-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.044c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824zm-3.392-10.416c-4.418 0-8 3.582-8 8 0 1.411.365 2.738 1.002 3.896l-1.064 3.89 3.987-1.046c1.118.608 2.399.96 3.757.96 4.418 0 8-3.582 8-8s-3.582-8-8-8z"/></svg>
                </a>

                <!-- View Detail CTA -->
                <button onclick="window.openCarDetail('${car.id}')" class="px-3.5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-sora font-semibold text-xs tracking-wider uppercase transition-all shadow-lg shadow-rose-600/20 touch-press flex items-center gap-1">
                  <span>Ver Ficha</span>
                  <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  // Favorite toggle
  window.toggleFavorite = function(carId) {
    if (favorites.includes(carId)) {
      favorites = favorites.filter(id => id !== carId);
    } else {
      favorites.push(carId);
    }
    localStorage.setItem('aa_favorites', JSON.stringify(favorites));
    renderCars();
  };

  // Open Car Detail Modal
  window.openCarDetail = function(carId) {
    const car = cars.find(c => c.id === carId);
    if (!car) return;

    const modalEl = modal || document.getElementById('car-modal');
    const modalContentEl = modalContent || document.getElementById('modal-body-content');
    if (!modalEl || !modalContentEl) return;

    currentGalleryIndex = 0;
    const images = car.images && car.images.length ? car.images : ['assets/logo.svg'];

    modalContentEl.innerHTML = `
      <div class="flex flex-col lg:grid lg:grid-cols-12 gap-6">
        <!-- Gallery Column (7 cols) -->
        <div class="lg:col-span-7 flex flex-col gap-3">
          <!-- Main Active Image -->
          <div class="relative w-full aspect-[16/10] bg-slate-900 rounded-2xl overflow-hidden border border-white/10 group">
            <img id="modal-main-img" src="${images[0]}" alt="${car.title}" class="w-full h-full object-cover transition-all duration-300">
            
            <!-- Controls -->
            <button onclick="window.changeGalleryImg(-1)" class="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-rose-600 transition-colors touch-press">
              <span class="material-symbols-outlined">chevron_left</span>
            </button>
            <button onclick="window.changeGalleryImg(1)" class="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-rose-600 transition-colors touch-press">
              <span class="material-symbols-outlined">chevron_right</span>
            </button>

            <!-- Counter Pill -->
            <div class="absolute bottom-3 right-3 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md font-mono text-xs text-white border border-white/10">
              <span id="gallery-counter">1</span> / ${images.length} fotos
            </div>
            
            <span class="absolute top-3 left-3 badge-eco px-2.5 py-1 rounded-lg text-xs font-mono font-bold uppercase">
              Etiqueta ${car.specs.etiqueta}
            </span>
          </div>

          <!-- Thumbnail Strip (Scrollable on mobile) -->
          <div class="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 scroll-snap-x">
            ${images.map((img, i) => `
              <button onclick="window.setGalleryImg(${i})" class="w-20 h-14 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-all ${i === 0 ? 'border-rose-500 scale-95' : 'border-transparent opacity-70 hover:opacity-100'} gallery-thumb" data-thumb-idx="${i}">
                <img src="${img}" class="w-full h-full object-cover">
              </button>
            `).join('')}
          </div>

          <!-- Guarantee Highlights Bar -->
          <div class="grid grid-cols-3 gap-3 p-3 rounded-xl bg-slate-900/80 border border-white/5 font-mono text-xs text-center text-slate-300">
            <div class="flex flex-col items-center">
              <span class="material-symbols-outlined text-rose-500 text-lg mb-1">verified_user</span>
              <span class="font-bold">12 Meses</span>
              <span class="text-[10px] text-slate-500">Garantía total</span>
            </div>
            <div class="flex flex-col items-center border-x border-white/10 px-2">
              <span class="material-symbols-outlined text-emerald-400 text-lg mb-1">assignment_turned_in</span>
              <span class="font-bold">150 Puntos</span>
              <span class="text-[10px] text-slate-500">Revisión taller</span>
            </div>
            <div class="flex flex-col items-center">
              <span class="material-symbols-outlined text-sky-400 text-lg mb-1">swap_horiz</span>
              <span class="font-bold">Gratis</span>
              <span class="text-[10px] text-slate-500">Cambio de nombre</span>
            </div>
          </div>
        </div>

        <!-- Info & Actions Column (5 cols) -->
        <div class="lg:col-span-5 flex flex-col justify-between gap-6">
          <div>
            <!-- Header -->
            <div class="flex items-center justify-between gap-2 mb-2">
              <span class="px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-400 text-xs font-mono font-bold uppercase tracking-wider">
                ${car.brand} • ${car.body_type}
              </span>
              <span class="text-xs font-mono text-slate-400">Ref: ${car.id.slice(0, 10).toUpperCase()}</span>
            </div>

            <h2 class="font-sora font-extrabold text-xl sm:text-2xl text-white leading-tight mb-2">
              ${car.title}
            </h2>

            <!-- Price Block -->
            <div class="p-4 rounded-xl bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-900 border border-rose-500/20 mb-5">
              <div class="flex items-baseline justify-between">
                <div>
                  <div class="text-xs font-mono text-slate-400">Precio al contado</div>
                  <div class="font-sora font-extrabold text-3xl text-white tracking-tight">${formatPrice(car)}</div>
                </div>
                <div class="text-right">
                  <div class="text-xs font-mono text-rose-400">Financiación flexible</div>
                  <div class="font-sora font-bold text-lg text-rose-300">Desde ${formatCuota(car)}</div>
                </div>
              </div>
              <p class="text-[11px] text-slate-400 mt-2 font-mono">
                * IVA, garantía de 1 año y gastos de gestoría de cambio de nombre incluidos sin sorpresas.
              </p>
            </div>

            <!-- Technical Telemetry Table -->
            <h4 class="font-sora font-bold text-sm text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span class="material-symbols-outlined text-rose-500 text-[18px]">speed</span>
              Ficha Técnica
            </h4>
            <div class="grid grid-cols-2 gap-2 text-xs font-mono mb-5">
              <div class="p-2.5 rounded-lg bg-slate-900/60 border border-white/5 flex justify-between">
                <span class="text-slate-400">Kilómetros</span>
                <span class="font-bold text-white">${car.specs.km}</span>
              </div>
              <div class="p-2.5 rounded-lg bg-slate-900/60 border border-white/5 flex justify-between">
                <span class="text-slate-400">Matriculación</span>
                <span class="font-bold text-white">${car.specs.año}</span>
              </div>
              <div class="p-2.5 rounded-lg bg-slate-900/60 border border-white/5 flex justify-between">
                <span class="text-slate-400">Combustible</span>
                <span class="font-bold text-white">${car.specs.combustible}</span>
              </div>
              <div class="p-2.5 rounded-lg bg-slate-900/60 border border-white/5 flex justify-between">
                <span class="text-slate-400">Transmisión</span>
                <span class="font-bold text-white">${car.specs.cambio}</span>
              </div>
              <div class="p-2.5 rounded-lg bg-slate-900/60 border border-white/5 flex justify-between">
                <span class="text-slate-400">Potencia</span>
                <span class="font-bold text-white">${car.specs.potencia}</span>
              </div>
              <div class="p-2.5 rounded-lg bg-slate-900/60 border border-white/5 flex justify-between">
                <span class="text-slate-400">Color</span>
                <span class="font-bold text-white">${car.specs.color}</span>
              </div>
            </div>

            <!-- Equipment Checklist -->
            <h4 class="font-sora font-bold text-sm text-white uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span class="material-symbols-outlined text-emerald-400 text-[18px]">checklist</span>
              Equipamiento Destacado
            </h4>
            <ul class="space-y-1.5 text-xs text-slate-300 mb-6 font-manrope">
              ${car.equipment.slice(0, 6).map(eq => `
                <li class="flex items-start gap-2">
                  <span class="material-symbols-outlined text-emerald-400 text-[15px] shrink-0 mt-0.5">check_circle</span>
                  <span>${eq}</span>
                </li>
              `).join('')}
            </ul>

            <!-- Interactive Finance Calculator -->
            <div class="p-4 rounded-xl bg-slate-900/90 border border-white/10 mb-6">
              <div class="flex items-center justify-between mb-3">
                <span class="font-sora font-bold text-xs text-white uppercase tracking-wider">Calculadora de Cuota</span>
                <span class="font-sora font-bold text-rose-400 text-sm" id="calc-result">-- €/mes</span>
              </div>
              <div class="space-y-3 text-xs font-mono">
                <div>
                  <div class="flex justify-between text-slate-400 mb-1">
                    <span>Entrada (€):</span>
                    <span id="calc-down-val">3.000 €</span>
                  </div>
                  <input id="calc-down" type="range" min="0" max="${Math.round(car.price_num * 0.7)}" step="500" value="3000" class="w-full accent-rose-500 h-1.5 bg-slate-800 rounded cursor-pointer">
                </div>
                <div>
                  <div class="flex justify-between text-slate-400 mb-1">
                    <span>Plazo:</span>
                    <span id="calc-months-val">72 meses</span>
                  </div>
                  <input id="calc-months" type="range" min="24" max="96" step="12" value="72" class="w-full accent-rose-500 h-1.5 bg-slate-800 rounded cursor-pointer">
                </div>
              </div>
            </div>
          </div>

          <!-- Bottom Fixed CTAs -->
          <div class="space-y-2.5 pt-2 border-t border-white/10">
            <!-- Primary WhatsApp CTA -->
            <a href="https://wa.me/34932328715?text=Hola%20Autos%20Arag%C3%B3n,%20quiero%20reservar%20o%20pedir%20cita%20para%20ver%20el%20${encodeURIComponent(car.title)}%20(${encodeURIComponent(formatPrice(car))})." target="_blank" rel="noopener" class="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-sora font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition-all touch-press">
              <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766 0-3.18-2.587-5.771-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.275.072.376-.044c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824zm-3.392-10.416c-4.418 0-8 3.582-8 8 0 1.411.365 2.738 1.002 3.896l-1.064 3.89 3.987-1.046c1.118.608 2.399.96 3.757.96 4.418 0 8-3.582 8-8s-3.582-8-8-8z"/></svg>
              <span>Preguntar por WhatsApp</span>
            </a>

            <!-- Call Direct CTA -->
            <a href="tel:932328715" class="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-sora font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-white/10 transition-all touch-press">
              <span class="material-symbols-outlined text-[18px] text-rose-400">call</span>
              <span>Llamar al Concesionario (93 232 87 15)</span>
            </a>
          </div>
        </div>
      </div>
    `;

    // Initialize gallery functions
    window.currentCarGalleryImages = images;
    window.setGalleryImg = function(idx) {
      currentGalleryIndex = idx;
      const mainImg = document.getElementById('modal-main-img');
      const counter = document.getElementById('gallery-counter');
      if (mainImg) mainImg.src = images[idx];
      if (counter) counter.textContent = idx + 1;

      document.querySelectorAll('.gallery-thumb').forEach((thumb, i) => {
        if (i === idx) {
          thumb.classList.add('border-rose-500', 'scale-95');
          thumb.classList.remove('border-transparent', 'opacity-70');
        } else {
          thumb.classList.remove('border-rose-500', 'scale-95');
          thumb.classList.add('border-transparent', 'opacity-70');
        }
      });
    };

    window.changeGalleryImg = function(delta) {
      let next = currentGalleryIndex + delta;
      if (next < 0) next = images.length - 1;
      if (next >= images.length) next = 0;
      window.setGalleryImg(next);
    };

    // Initialize finance calculator
    const downInput = document.getElementById('calc-down');
    const monthsInput = document.getElementById('calc-months');
    const downVal = document.getElementById('calc-down-val');
    const monthsVal = document.getElementById('calc-months-val');
    const resVal = document.getElementById('calc-result');

    function updateCalc() {
      if (!downInput || !monthsInput) return;
      const down = parseFloat(downInput.value);
      const months = parseInt(monthsInput.value);
      downVal.textContent = Number(down).toLocaleString('es-ES') + ' €';
      monthsVal.textContent = `${months} meses`;

      const financed = Math.max(1000, car.price_num - down);
      const tin = 0.0799 / 12; // typical 7.99% TIN
      const cuota = (financed * tin * Math.pow(1 + tin, months)) / (Math.pow(1 + tin, months) - 1);
      resVal.textContent = `${Math.round(cuota)} €/mes`;
    }

    downInput?.addEventListener('input', updateCalc);
    monthsInput?.addEventListener('input', updateCalc);
    updateCalc();

    // Show modal
    modalEl.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  };

  // Close Modal
  function closeModal() {
    const modalEl = modal || document.getElementById('car-modal');
    if (!modalEl) return;
    modalEl.classList.add('hidden');
    document.body.style.overflow = '';
  }

  closeModalBtn?.addEventListener('click', closeModal);
  modalOverlay?.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  // Mobile Drawer Toggle
  mobileMenuToggle?.addEventListener('click', () => {
    mobileDrawer?.classList.remove('translate-x-full');
  });

  closeDrawerBtn?.addEventListener('click', () => {
    mobileDrawer?.classList.add('translate-x-full');
  });

  // Reset Filters
  function resetAllFilters() {
    activeFilter = 'all';
    searchQuery = '';
    selectedBrand = 'all';
    selectedBody = 'all';
    selectedFuel = 'all';
    selectedGear = 'all';
    maxPrice = 60000;
    sortBy = 'featured';

    if (searchInput) searchInput.value = '';
    if (brandFilter) brandFilter.value = 'all';
    if (bodyFilter) bodyFilter.value = 'all';
    if (fuelFilter) fuelFilter.value = 'all';
    if (gearFilter) gearFilter.value = 'all';
    if (sortSelect) sortSelect.value = 'featured';
    if (priceSlider) priceSlider.value = '60000';
    if (priceDisplay) priceDisplay.textContent = '60.000 €';

    quickFilterChips.forEach(chip => {
      chip.classList.toggle('bg-rose-600', chip.dataset.filter === 'all');
      chip.classList.toggle('text-white', chip.dataset.filter === 'all');
      chip.classList.toggle('bg-slate-800', chip.dataset.filter !== 'all');
      chip.classList.toggle('text-slate-300', chip.dataset.filter !== 'all');
    });

    renderCars();
  }

  document.getElementById('reset-all-btn')?.addEventListener('click', resetAllFilters);

  // Search input debounced
  searchInput?.addEventListener('input', (e) => {
    searchQuery = e.target.value.trim();
    renderCars();
  });

  // Quick filter chips
  quickFilterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      activeFilter = chip.dataset.filter;
      quickFilterChips.forEach(c => {
        const isActive = c === chip;
        c.classList.toggle('bg-rose-600', isActive);
        c.classList.toggle('text-white', isActive);
        c.classList.toggle('border-rose-500', isActive);
        c.classList.toggle('bg-slate-900', !isActive);
        c.classList.toggle('text-slate-300', !isActive);
        c.classList.toggle('border-white/10', !isActive);
      });
      renderCars();
    });
  });

  // Select events
  brandFilter?.addEventListener('change', (e) => { selectedBrand = e.target.value; renderCars(); });
  bodyFilter?.addEventListener('change', (e) => { selectedBody = e.target.value; renderCars(); });
  fuelFilter?.addEventListener('change', (e) => { selectedFuel = e.target.value; renderCars(); });
  gearFilter?.addEventListener('change', (e) => { selectedGear = e.target.value; renderCars(); });
  sortSelect?.addEventListener('change', (e) => { sortBy = e.target.value; renderCars(); });

  priceSlider?.addEventListener('input', (e) => {
    maxPrice = parseInt(e.target.value);
    if (priceDisplay) priceDisplay.textContent = Number(maxPrice).toLocaleString('es-ES') + ' €';
    renderCars();
  });

  // Valuation Form Submission
  valuationForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const brand = document.getElementById('val-brand')?.value || '';
    const model = document.getElementById('val-model')?.value || '';
    const year = parseInt(document.getElementById('val-year')?.value || '2019');
    const km = parseInt(document.getElementById('val-km')?.value || '60000');
    const phone = document.getElementById('val-phone')?.value || '';

    // Estimate realistic valuation bracket
    let base = 16000;
    const yearFactor = Math.max(0.4, 1 - (2025 - year) * 0.08);
    const kmFactor = Math.max(0.4, 1 - (km / 200000) * 0.4);
    const estimated = Math.round(base * yearFactor * kmFactor / 100) * 100;
    const minVal = Math.round(estimated * 0.9);
    const maxVal = Math.round(estimated * 1.08);

    if (valuationResult) {
      valuationResult.classList.remove('hidden');
      valuationResult.innerHTML = `
        <div class="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/50 via-slate-900 to-slate-900 border border-emerald-500/30 text-center animate-fade-in">
          <div class="w-12 h-12 mx-auto mb-2 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <span class="material-symbols-outlined text-2xl">check_circle</span>
          </div>
          <span class="text-xs font-mono uppercase text-emerald-400 font-bold">Rango de Tasación Estimada</span>
          <div class="font-sora font-extrabold text-2xl sm:text-3xl text-white my-1">
            ${minVal.toLocaleString('es-ES')} € - ${maxVal.toLocaleString('es-ES')} €
          </div>
          <p class="text-xs text-slate-300 max-w-sm mx-auto mb-4 font-manrope">
            Para ${brand} ${model} (${year}, ${km.toLocaleString('es-ES')} km). Valoración sujeta a verificación física en nuestras instalaciones de Carrer d'Aragó 507.
          </p>
          <div class="flex flex-col sm:flex-row gap-2 justify-center">
            <a href="https://wa.me/34932328715?text=Hola%20Autos%20Arag%C3%B3n,%20he%20solicitado%20tasaci%C3%B3n%20para%20un%20${encodeURIComponent(brand)}%20${encodeURIComponent(model)}%20de%20${year}%20con%20${km}%20km.%20Mi%20tel%C3%A9fono%20es%20${encodeURIComponent(phone)}." target="_blank" rel="noopener" class="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-sora font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 touch-press">
              <span>Confirmar por WhatsApp</span>
            </a>
            <a href="tel:932328715" class="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-sora font-semibold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border border-white/10 touch-press">
              <span>Llamar al 93 232 87 15</span>
            </a>
          </div>
        </div>
      `;
    }
  });

  // Initial Render
  renderCars();
});
