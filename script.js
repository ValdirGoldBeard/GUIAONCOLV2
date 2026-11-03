// ==========================================================================
// GUÍA DE FLORA - PARQUE ONCOL (V2)
// Lógica de navegación, búsqueda global, sellos UICN y fichas con desplegables
// ==========================================================================

// Configuración de Sellos / Logos Oficiales UICN (Lista Roja)
const IUCN_DATA = {
  'CR': {
    code: 'CR',
    name: 'En Peligro Crítico',
    english: 'Critically Endangered',
    color: '#d81e05',
    textColor: '#ffffff',
    bgBadge: 'rgba(216, 30, 5, 0.18)',
    borderColor: '#d81e05',
    desc: 'Riesgo extremadamente alto de extinción'
  },
  'EN': {
    code: 'EN',
    name: 'En Peligro',
    english: 'Endangered',
    color: '#fc7f3f',
    textColor: '#ffffff',
    bgBadge: 'rgba(252, 127, 63, 0.18)',
    borderColor: '#fc7f3f',
    desc: 'Riesgo muy alto de extinción silvestre'
  },
  'VU': {
    code: 'VU',
    name: 'Vulnerable',
    english: 'Vulnerable',
    color: '#f9e814',
    textColor: '#1a1a1a',
    bgBadge: 'rgba(249, 232, 20, 0.18)',
    borderColor: '#f9e814',
    desc: 'Riesgo alto de extinción en estado silvestre'
  },
  'NT': {
    code: 'NT',
    name: 'Casi Amenazado',
    english: 'Near Threatened',
    color: '#cce226',
    textColor: '#1a1a1a',
    bgBadge: 'rgba(204, 226, 38, 0.18)',
    borderColor: '#cce226',
    desc: 'Cercano a calificar en categoría de amenaza'
  },
  'LC': {
    code: 'LC',
    name: 'Preocupación Menor',
    english: 'Least Concern',
    color: '#60c659',
    textColor: '#ffffff',
    bgBadge: 'rgba(96, 198, 89, 0.18)',
    borderColor: '#60c659',
    desc: 'Menor riesgo, taxón abundante y extendido'
  },
  'DD': {
    code: 'DD',
    name: 'Datos Insuficientes',
    english: 'Data Deficient',
    color: '#b0bec5',
    textColor: '#1a1a1a',
    bgBadge: 'rgba(176, 190, 197, 0.18)',
    borderColor: '#90a4ae',
    desc: 'Información insuficiente para evaluar riesgo'
  },
  'NE': {
    code: 'NE',
    name: 'No Evaluado',
    english: 'Not Evaluated',
    color: '#78909c',
    textColor: '#ffffff',
    bgBadge: 'rgba(120, 144, 156, 0.18)',
    borderColor: '#78909c',
    desc: 'Aún no contrastado con criterios UICN'
  },
  'NO APLICA': {
    code: 'N/A',
    name: 'Exótica / No Aplica',
    english: 'Not Applicable',
    color: '#8d6e63',
    textColor: '#ffffff',
    bgBadge: 'rgba(141, 110, 99, 0.18)',
    borderColor: '#8d6e63',
    desc: 'Especie introducida o exótica en la zona'
  }
};

// Generador de Logo Circular UICN oficial
function generarLogoUICN(iucnCode) {
  const codeRaw = (iucnCode || '').toUpperCase().trim();
  if (!codeRaw || codeRaw === 'PENDIENTE') return '';

  let meta = IUCN_DATA[codeRaw];
  if (!meta) {
    if (codeRaw.includes('NO APLICA')) meta = IUCN_DATA['NO APLICA'];
    else if (codeRaw.includes('LC')) meta = IUCN_DATA['LC'];
    else if (codeRaw.includes('VU')) meta = IUCN_DATA['VU'];
    else if (codeRaw.includes('EN')) meta = IUCN_DATA['EN'];
    else if (codeRaw.includes('CR')) meta = IUCN_DATA['CR'];
    else if (codeRaw.includes('NT')) meta = IUCN_DATA['NT'];
    else if (codeRaw.includes('DD')) meta = IUCN_DATA['DD'];
    else if (codeRaw.includes('NE')) meta = IUCN_DATA['NE'];
  }
  if (!meta) return '';

  return `
    <div class="hero-iucn-seal" style="background-color: ${meta.color}; color: ${meta.textColor};" title="Estado UICN: ${meta.name} (${meta.code})">
      <span class="iucn-seal-ring"></span>
      <span class="iucn-seal-text">${meta.code}</span>
    </div>
  `;
}

// Diccionario de categorías botánicas conocidas
const CATEGORIA_META = {
  'arboles': { label: 'Árboles', icon: '🌲', order: 1 },
  'arbustos': { label: 'Arbustos', icon: '🌿', order: 2 },
  'helechos y licopodios': { label: 'Helechos y Licopodios', icon: '🪴', order: 3 },
  'hierbas': { label: 'Hierbas', icon: '🌱', order: 4 },
  'trepadoras y epifitas': { label: 'Trepadoras y Epífitas', icon: '🌾', order: 5 },
  'briofitas': { label: 'Briofitas / Musgos', icon: '🔬', order: 6 }
};

// Estado global de la aplicación
const AppState = {
  rawSpecies: [],
  allSpecies: [], // Lista aplanada para el buscador global
  subcategories: {},
  currentScreen: 'welcome',
  currentSubcategoryKey: null,
  currentFilteredSpecies: [],
  history: []
};

// ==========================================================================
// 1. CARGA DINÁMICA DE DATOS
// ==========================================================================
async function inicializarBaseDeDatos() {
  const statsEl = document.getElementById('welcome-stats');
  try {
    const response = await fetch('especies.json');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: No se pudo leer especies.json`);
    }

    const especiesRaw = await response.json();
    AppState.rawSpecies = especiesRaw;
    AppState.allSpecies = [];
    AppState.subcategories = {};

    // Procesar cada especie y asignarla dinámicamente según la carpeta contenedora
    especiesRaw.forEach(esp => {
      const rawSub = (esp.grupo_subcategoria || 'otros').trim();
      const subKey = rawSub.toLowerCase();
      const metaCat = CATEGORIA_META[subKey] || {
        label: capitalizarTexto(rawSub),
        icon: '🌿',
        order: 99
      };

      if (!AppState.subcategories[subKey]) {
        AppState.subcategories[subKey] = {
          id: subKey,
          label: metaCat.label,
          icon: metaCat.icon,
          order: metaCat.order,
          species: []
        };
      }

      const especieObj = {
        id: esp.id || esp.archivo_origen,
        common: esp.nombre_principal || 'Sin nombre común',
        scientific: esp.nombre_cientifico || 'Nombre no asignado',
        categoryKey: subKey,
        categoryLabel: metaCat.label,
        categoryIcon: metaCat.icon,
        altNames: esp.nombres_alternativos || '',
        family: esp.familia || '',
        origin: esp.origen || 'pendiente',
        iucnCode: (esp.iucn_codigo || 'pendiente').toUpperCase(),
        nationalStatus: esp.estado_nacional || 'pendiente',
        ease: esp.facilidad_observacion || 'pendiente',
        leafType: esp.tipo_hoja || 'pendiente',
        flowering: esp.floracion_meses || 'pendiente',
        maxHeight: esp.altura_max_m || 'pendiente',
        medicinal: esp.medicinal,
        oncolPresence: esp.presencia_oncol || 'pendiente',
        reviewStatus: esp.estado_ficha || 'borrador',
        image: esp.imagen_asset || '',
        morphology: esp.descripcion_morfologica || '',
        howToRecognize: esp.como_reconocerla || '',
        funFact: esp.dato_curioso || '',
        naturalHistory: esp.historia_natural || '',
        habitat: esp.habitat || '',
        distribution: esp.distribucion_texto || '',
        threats: esp.amenazas || '',
        uses: esp.usos || '',
        inOncol: esp.en_oncol || '',
        sources: esp.fuentes || '',
        extraSections: esp.secciones_adicionales || {}
      };

      AppState.subcategories[subKey].species.push(especieObj);
      AppState.allSpecies.push(especieObj);
    });

    // Ordenar alfabéticamente
    Object.values(AppState.subcategories).forEach(sub => {
      sub.species.sort((a, b) => a.common.localeCompare(b.common, 'es'));
    });
    AppState.allSpecies.sort((a, b) => a.common.localeCompare(b.common, 'es'));

    const totalGrupos = Object.keys(AppState.subcategories).length;
    const totalEspecies = AppState.rawSpecies.length;
    if (statsEl) {
      statsEl.innerHTML = `<strong>${totalEspecies}</strong> especies en <strong>${totalGrupos}</strong> grupos botánicos`;
    }

    renderSubcategoriesMenu();

  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
    if (statsEl) {
      statsEl.innerHTML = `<span style="color:#ffb4ab;">⚠️ No se encontró 'especies.json'. Ejecuta compilar.py</span>`;
    }
  }
}

// ==========================================================================
// 2. NAVEGACIÓN SPA CON HISTORIAL
// ==========================================================================
function navigateTo(screenId) {
  if (AppState.currentScreen !== screenId) {
    AppState.history.push(AppState.currentScreen);
  }
  showScreen(screenId);
}

function goBack() {
  if (AppState.history.length === 0) {
    showScreen('welcome', false);
    return;
  }
  const previousScreen = AppState.history.pop();
  showScreen(previousScreen, false);
}

function showScreen(screenId, clearForwardHistory = true) {
  const currentEl = document.querySelector(`#screen-${AppState.currentScreen}`);
  const targetEl = document.querySelector(`#screen-${screenId}`);
  const backBtn = document.getElementById('btn-back');

  if (currentEl) currentEl.classList.remove('active');
  if (targetEl) targetEl.classList.add('active');

  AppState.currentScreen = screenId;

  if (backBtn) {
    if (screenId === 'welcome') {
      backBtn.style.display = 'none';
      AppState.history = [];
    } else {
      backBtn.style.display = 'flex';
    }
  }

  window.scrollTo(0, 0);
  const detailContent = document.getElementById('detail-sections');
  if (detailContent && screenId === 'species-detail') {
    detailContent.scrollTop = 0;
  }
}

// ==========================================================================
// 3. PANTALLA: MENÚ DE SUBCATEGORÍAS & BUSCADOR GLOBAL
// ==========================================================================
function renderSubcategoriesMenu() {
  const container = document.getElementById('subcategory-container');
  if (!container) return;
  container.innerHTML = '';

  const subList = Object.values(AppState.subcategories).sort((a, b) => {
    return (a.order || 99) - (b.order || 99) || a.label.localeCompare(b.label, 'es');
  });

  subList.forEach(sub => {
    const circle = document.createElement('div');
    circle.className = 'circle';
    circle.setAttribute('role', 'button');
    circle.setAttribute('tabindex', '0');
    circle.onclick = () => showSpeciesList(sub.id);

    circle.innerHTML = `
      <span class="circle-icon">${sub.icon}</span>
      <p class="circle-label">${sub.label}</p>
      <span class="circle-count">${sub.species.length} especies</span>
    `;
    container.appendChild(circle);
  });
}

// Buscador global de flora (busca entre todas las 163 especies)
function handleGlobalSearch(query) {
  const q = (query || '').trim().toLowerCase();
  const titleEl = document.getElementById('subcategory-title');
  const subtitleEl = document.getElementById('subcategory-subtitle');
  const container = document.getElementById('subcategory-container');
  if (!container) return;

  if (!q) {
    if (titleEl) titleEl.textContent = 'Flora de Oncol';
    if (subtitleEl) subtitleEl.textContent = 'Selecciona una categoría o busca una especie';
    renderSubcategoriesMenu();
    return;
  }

  const resultados = AppState.allSpecies.filter(esp => {
    return esp.common.toLowerCase().includes(q) ||
           esp.scientific.toLowerCase().includes(q) ||
           esp.altNames.toLowerCase().includes(q) ||
           esp.family.toLowerCase().includes(q) ||
           esp.categoryLabel.toLowerCase().includes(q);
  });

  if (titleEl) titleEl.textContent = 'Resultados de búsqueda';
  if (subtitleEl) subtitleEl.textContent = `${resultados.length} especies encontradas para "${query.trim()}"`;

  container.innerHTML = '';

  if (resultados.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1; padding: 30px 10px;">
        <p>No se encontraron especies que coincidan con "<strong>${query.trim()}</strong>".</p>
        <p style="font-size: 0.8rem; margin-top: 8px; opacity: 0.8;">Intenta con otro nombre común (ej. <em>Canelo</em>, <em>Luma</em>, <em>Helecho</em>) o familia.</p>
      </div>
    `;
    return;
  }

  resultados.forEach(species => {
    const item = document.createElement('div');
    item.className = 'circle search-result-item';
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');

    // Mini sello UICN en esquina superior derecha
    let miniSello = '';
    const codeClean = (species.iucnCode || '').toUpperCase().trim();
    if (codeClean && codeClean !== 'PENDIENTE') {
      let meta = IUCN_DATA[codeClean];
      if (!meta && codeClean.includes('NO APLICA')) meta = IUCN_DATA['NO APLICA'];
      if (meta) {
        miniSello = `<span class="carousel-iucn-badge" style="background-color: ${meta.color}; color: ${meta.textColor};" title="UICN: ${meta.name}">${meta.code}</span>`;
      }
    }

    const imageSource = species.image
      ? `<img src="${species.image}" alt="${species.common}">`
      : `<span class="placeholder-icon">${species.categoryIcon}</span>`;

    item.innerHTML = `
      <div class="circle-avatar">
        ${imageSource}
        ${miniSello}
      </div>
      <p class="circle-common-name" title="${species.common}">${species.common}</p>
      <p class="circle-sci-name" title="${species.scientific}">${species.scientific}</p>
      <span class="search-category-tag">${species.categoryIcon} ${species.categoryLabel}</span>
    `;

    item.onclick = () => showSpeciesDetail(species);
    container.appendChild(item);
  });
}

// ==========================================================================
// 4. PANTALLA: LISTA / CARRUSEL DE ESPECIES
// ==========================================================================
function showSpeciesList(subcategoryKey) {
  const sub = AppState.subcategories[subcategoryKey];
  if (!sub) return;

  AppState.currentSubcategoryKey = subcategoryKey;
  AppState.currentFilteredSpecies = [...sub.species];

  const titleEl = document.getElementById('species-list-title');
  const subtitleEl = document.getElementById('species-list-subtitle');

  if (titleEl) titleEl.textContent = `${sub.icon} ${sub.label}`;
  if (subtitleEl) subtitleEl.textContent = `${sub.species.length} especies registradas`;

  renderCarouselItems(AppState.currentFilteredSpecies);
  navigateTo('species-list');
}

function renderCarouselItems(speciesList) {
  const carousel = document.getElementById('species-carousel');
  if (!carousel) return;
  carousel.innerHTML = '';

  if (speciesList.length === 0) {
    carousel.innerHTML = `
      <div class="empty-state">
        <p>No se encontraron especies en esta categoría.</p>
      </div>
    `;
    return;
  }

  speciesList.forEach(species => {
    const item = document.createElement('div');
    item.className = 'circle carousel-item';
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');

    // Mini sello UICN en la esquina superior derecha
    let miniSello = '';
    const codeClean = (species.iucnCode || '').toUpperCase().trim();
    if (codeClean && codeClean !== 'PENDIENTE') {
      let meta = IUCN_DATA[codeClean];
      if (!meta && codeClean.includes('NO APLICA')) meta = IUCN_DATA['NO APLICA'];
      if (meta) {
        miniSello = `<span class="carousel-iucn-badge" style="background-color: ${meta.color}; color: ${meta.textColor};" title="UICN: ${meta.name}">${meta.code}</span>`;
      }
    }

    const imageSource = species.image
      ? `<img src="${species.image}" alt="${species.common}">`
      : `<span class="placeholder-icon">🌿</span>`;

    item.innerHTML = `
      <div class="circle-avatar">
        ${imageSource}
        ${miniSello}
      </div>
      <p class="circle-common-name" title="${species.common}">${species.common}</p>
      <p class="circle-sci-name" title="${species.scientific}">${species.scientific}</p>
    `;

    item.onclick = () => showSpeciesDetail(species);
    carousel.appendChild(item);
  });
}

// ==========================================================================
// 5. PANTALLA: FICHA DETALLADA (CON DESPLEGABLES)
// ==========================================================================
function showSpeciesDetail(species) {
  // 1. Imagen a la derecha
  const imageDiv = document.getElementById('detail-image');
  if (species.image) {
    imageDiv.innerHTML = `<img src="${species.image}" alt="${species.common}">`;
  } else {
    imageDiv.innerHTML = `<span>🌿</span>`;
  }

  // 2. Logo oficial UICN en esquina superior derecha de la foto
  const iucnSlot = document.getElementById('detail-iucn-slot');
  if (iucnSlot) {
    iucnSlot.innerHTML = generarLogoUICN(species.iucnCode);
  }

  // 3. Títulos taxonómicos
  document.getElementById('detail-common-name').textContent = species.common;
  document.getElementById('detail-scientific-name').textContent = species.scientific;
  
  const familyEl = document.getElementById('detail-family');
  if (species.family && species.family !== 'pendiente') {
    familyEl.style.display = 'block';
    familyEl.textContent = `Familia ${species.family}`;
  } else {
    familyEl.style.display = 'none';
  }

  // 4. Píldoras técnicas compactas de 2 líneas (a la izquierda de la foto)
  renderDetailBadges(species);

  // 5. Secciones de contenido estructurado (visibles + desplegables)
  renderDetailSections(species);

  navigateTo('species-detail');
}

function renderDetailBadges(species) {
  const badgesContainer = document.getElementById('detail-badges');
  if (!badgesContainer) return;

  const items = [];

  // Origen (2 líneas: "🇨🇱 Origen" / "Nativo")
  const origen = formatearOrigen(species.origin);
  if (origen) items.push(origen);

  // Altura (2 líneas: "📏 Altura" / "Hasta 20 m")
  const altura = formatearAltura(species.maxHeight);
  if (altura) items.push(altura);

  // Follaje (2 líneas: "🍃 Follaje" / "Siempreverde")
  const follaje = formatearFollaje(species.leafType);
  if (follaje) items.push(follaje);

  // Avistamiento en terreno (2 líneas: "👁️ Avistamiento" / "Fácil")
  const avistamiento = formatearAvistamiento(species.ease);
  if (avistamiento) items.push(avistamiento);

  // Uso medicinal
  if (species.medicinal === true) {
    items.push({ label: '🩺 Uso', val: 'Medicinal' });
  }

  if (items.length === 0) {
    badgesContainer.innerHTML = '';
    return;
  }

  // Formato vertical de 2 líneas por píldora
  badgesContainer.innerHTML = items.map(it => `
    <div class="badge-item">
      <span class="badge-item-label">${it.label}</span>
      <span class="badge-item-val">${it.val}</span>
    </div>
  `).join('');
}

// Helpers concisos para etiquetas de campo (2 líneas)
function formatearOrigen(origin) {
  if (!origin || origin === 'pendiente') return null;
  const o = origin.toLowerCase();
  if (o.includes('endem')) {
    return { label: '⭐ Origen', val: 'Endémico' };
  } else if (o.includes('nativ')) {
    return { label: '🇨🇱 Origen', val: 'Nativo' };
  } else if (o.includes('exot') || o.includes('introduc')) {
    return { label: '🌍 Origen', val: 'Exótica' };
  }
  return { label: '🌱 Origen', val: origin };
}

function formatearAltura(maxHeight) {
  if (!maxHeight || maxHeight === 'pendiente') return null;
  const clean = String(maxHeight).replace(/[^\d.,]/g, '');
  if (!clean) return null;
  const num = parseFloat(clean.replace(',', '.'));
  if (isNaN(num)) return null;
  if (num < 1) {
    const cm = Math.round(num * 100);
    return { label: '📏 Altura', val: `Hasta ${cm} cm` };
  }
  return { label: '📏 Altura', val: `Hasta ${clean} m` };
}

function formatearFollaje(leafType) {
  if (!leafType || leafType === 'pendiente') return null;
  const l = leafType.toLowerCase();
  if (l.includes('persistente') || l.includes('siempreverde')) {
    return { label: '🍃 Follaje', val: 'Siempreverde' };
  } else if (l.includes('caduco') || l.includes('caduca')) {
    return { label: '🍂 Follaje', val: 'Caduco' };
  }
  return { label: '🍃 Follaje', val: leafType };
}

function formatearAvistamiento(ease) {
  if (!ease || ease === 'pendiente') return null;
  const e = ease.toLowerCase();
  if (e.includes('facil') || e.includes('fácil')) {
    return { label: '👁️ Avistamiento', val: 'Fácil' };
  } else if (e.includes('moderada')) {
    return { label: '👁️ Avistamiento', val: 'Moderado' };
  } else if (e.includes('dificil') || e.includes('difícil')) {
    return { label: '👁️ Avistamiento', val: 'Difícil' };
  }
  return { label: '👁️ Avistamiento', val: ease };
}

// ==========================================================================
// 6. SECCIONES: DESTACADOS Y MENÚS DESPLEGABLES (ACORDEONES)
// ==========================================================================
function renderDetailSections(species) {
  const sectionsContainer = document.getElementById('detail-sections');
  if (!sectionsContainer) return;

  const html = [];

  // Callout destacado: Cómo Reconocerla (siempre visible)
  if (species.howToRecognize && species.howToRecognize.trim()) {
    html.push(`
      <div class="callout-box callout-recognize">
        <h4>💡 Cómo Reconocerla</h4>
        <p>${formatearTextoMarkdown(species.howToRecognize)}</p>
      </div>
    `);
  }

  // Callout destacado: Dato Curioso (siempre visible)
  if (species.funFact && species.funFact.trim()) {
    html.push(`
      <div class="callout-box callout-curiosity">
        <h4>✨ Dato Curioso</h4>
        <p>${formatearTextoMarkdown(species.funFact)}</p>
      </div>
    `);
  }

  // Menús desplegables (Acordeones) para información técnica detallada
  const acordiones = [
    { icon: '🌿', title: 'Descripción Morfológica', text: species.morphology },
    { icon: '📖', title: 'Historia Natural', text: species.naturalHistory },
    { icon: '🏞️', title: 'Hábitat', text: species.habitat },
    { icon: '🗺️', title: 'Distribución', text: species.distribution },
    { icon: '🏺', title: 'Usos Tradicionales', text: species.uses },
    { icon: '🌲', title: 'Presencia en Oncol', text: species.inOncol },
    { icon: '⚠️', title: 'Amenazas y Conservación', text: species.threats },
    { icon: '📚', title: 'Fuentes y Referencias', text: species.sources }
  ];

  const acordionesHtml = [];
  acordiones.forEach(a => {
    if (a.text && a.text.trim()) {
      acordionesHtml.push(`
        <details class="accordion-item">
          <summary class="accordion-header">
            <span class="accordion-title">
              <span class="accordion-icon">${a.icon}</span>
              ${a.title}
            </span>
            <span class="accordion-chevron">▾</span>
          </summary>
          <div class="accordion-body">
            <p>${formatearTextoMarkdown(a.text)}</p>
          </div>
        </details>
      `);
    }
  });

  // Secciones adicionales dinámicas si existiesen
  if (species.extraSections) {
    Object.entries(species.extraSections).forEach(([tit, cont]) => {
      if (cont && cont.trim()) {
        acordionesHtml.push(`
          <details class="accordion-item">
            <summary class="accordion-header">
              <span class="accordion-title">
                <span class="accordion-icon">📌</span>
                ${tit}
              </span>
              <span class="accordion-chevron">▾</span>
            </summary>
            <div class="accordion-body">
              <p>${formatearTextoMarkdown(cont)}</p>
            </div>
          </details>
        `);
      }
    });
  }

  if (acordionesHtml.length > 0) {
    html.push(`
      <div class="accordion-group">
        ${acordionesHtml.join('')}
      </div>
    `);
  }

  if (html.length === 0) {
    html.push(`<p class="empty-text">Ficha en elaboración. No hay contenido descriptivo aún.</p>`);
  }

  sectionsContainer.innerHTML = html.join('');
}

// ==========================================================================
// 7. UTILIDADES AUXILIARES
// ==========================================================================
function capitalizarTexto(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatearTextoMarkdown(texto) {
  if (!texto) return '';
  // Convertir *cursiva* a <em>
  let res = texto.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  
  // Soporte para listas Markdown ("- Elemento")
  if (res.includes('\n- ') || res.startsWith('- ')) {
    const lineas = res.split('\n');
    let enLista = false;
    let out = [];
    for (let l of lineas) {
      const limpia = l.trim();
      if (limpia.startsWith('- ')) {
        if (!enLista) {
          out.push('<ul class="md-list">');
          enLista = true;
        }
        out.push(`<li>${limpia.substring(2)}</li>`);
      } else {
        if (enLista) {
          out.push('</ul>');
          enLista = false;
        }
        out.push(l);
      }
    }
    if (enLista) out.push('</ul>');
    res = out.join('\n');
  }

  // Convertir saltos dobles a párrafos
  res = res.replace(/\n\n+/g, '</p><p>');
  // Convertir saltos simples a <br>
  res = res.replace(/(?<!<\/li>)\n(?!<li|<ul|<\/ul)/g, '<br>');
  return res;
}

// Inicializar la aplicación al cargar
window.onload = inicializarBaseDeDatos;
