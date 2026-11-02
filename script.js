// ==========================================================================
// GUÍA DE FLORA - PARQUE ONCOL (V2)
// Lógica de navegación, carga dinámica desde especies.json y renderizado SPA
// ==========================================================================

// Diccionario de configuración visual para subcategorías conocidas
// (Cualquier subcategoría nueva que no esté aquí se formateará dinámicamente)
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
  subcategories: {}, // { [categoria_id]: { id, label, icon, order, species: [] } }
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
    AppState.subcategories = {};

    // Procesar cada especie y asignarla dinámicamente a su subcategoría según carpetas
    especiesRaw.forEach(esp => {
      const rawSub = (esp.grupo_subcategoria || 'otros').trim();
      const subKey = rawSub.toLowerCase();

      // Si la subcategoría aún no existe, inicializarla de manera 100% dinámica
      if (!AppState.subcategories[subKey]) {
        const meta = CATEGORIA_META[subKey] || {
          label: capitalizarTexto(rawSub),
          icon: '🌿',
          order: 99
        };

        AppState.subcategories[subKey] = {
          id: subKey,
          label: meta.label,
          icon: meta.icon,
          order: meta.order,
          species: []
        };
      }

      // Mapear datos botánicos normalizados
      AppState.subcategories[subKey].species.push({
        id: esp.id || esp.archivo_origen,
        common: esp.nombre_principal || 'Sin nombre común',
        scientific: esp.nombre_cientifico || 'Nombre no asignado',
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
      });
    });

    // Ordenar especies alfabéticamente por nombre común dentro de cada grupo
    Object.values(AppState.subcategories).forEach(sub => {
      sub.species.sort((a, b) => a.common.localeCompare(b.common, 'es'));
    });

    const totalGrupos = Object.keys(AppState.subcategories).length;
    const totalEspecies = AppState.rawSpecies.length;
    if (statsEl) {
      statsEl.innerHTML = `<strong>${totalEspecies}</strong> especies en <strong>${totalGrupos}</strong> grupos botánicos`;
    }

    // Renderizar botones de subcategorías listos para navegar
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

  // Botón atrás: oculto en pantalla de bienvenida, visible en el resto
  if (backBtn) {
    if (screenId === 'welcome') {
      backBtn.style.display = 'none';
      AppState.history = [];
    } else {
      backBtn.style.display = 'flex';
    }
  }

  // Scroll al tope del contenido cuando se cambia de pantalla
  window.scrollTo(0, 0);
  const detailContent = document.getElementById('detail-sections');
  if (detailContent && screenId === 'species-detail') {
    detailContent.scrollTop = 0;
  }
}

// ==========================================================================
// 3. PANTALLA: MENÚ DE SUBCATEGORÍAS
// ==========================================================================
function renderSubcategoriesMenu() {
  const container = document.getElementById('subcategory-container');
  if (!container) return;
  container.innerHTML = '';

  // Ordenar subcategorías según prioridad definida o alfabéticamente
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
      <span class="circle-count">${sub.species.length}</span>
    `;
    container.appendChild(circle);
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

  // Actualizar títulos
  const titleEl = document.getElementById('species-list-title');
  const subtitleEl = document.getElementById('species-list-subtitle');
  const searchInput = document.getElementById('species-search');

  if (titleEl) titleEl.textContent = `${sub.icon} ${sub.label}`;
  if (subtitleEl) subtitleEl.textContent = `${sub.species.length} especies registradas`;
  if (searchInput) searchInput.value = '';

  renderCarouselItems(AppState.currentFilteredSpecies);
  navigateTo('species-list');
}

function handleSearch(query) {
  const sub = AppState.subcategories[AppState.currentSubcategoryKey];
  if (!sub) return;

  const q = query.trim().toLowerCase();
  if (!q) {
    AppState.currentFilteredSpecies = [...sub.species];
  } else {
    AppState.currentFilteredSpecies = sub.species.filter(esp => {
      return esp.common.toLowerCase().includes(q) ||
             esp.scientific.toLowerCase().includes(q) ||
             esp.altNames.toLowerCase().includes(q) ||
             esp.family.toLowerCase().includes(q);
    });
  }

  const subtitleEl = document.getElementById('species-list-subtitle');
  if (subtitleEl) {
    subtitleEl.textContent = `${AppState.currentFilteredSpecies.length} de ${sub.species.length} especies`;
  }

  renderCarouselItems(AppState.currentFilteredSpecies);
}

function renderCarouselItems(speciesList) {
  const carousel = document.getElementById('species-carousel');
  if (!carousel) return;
  carousel.innerHTML = '';

  if (speciesList.length === 0) {
    carousel.innerHTML = `
      <div class="empty-state">
        <p>No se encontraron especies que coincidan con la búsqueda.</p>
      </div>
    `;
    return;
  }

  speciesList.forEach(species => {
    const item = document.createElement('div');
    item.className = 'circle carousel-item';
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');

    // Imagen real o placeholder botánico
    const imageSource = species.image
      ? `<img src="${species.image}" alt="${species.common}">`
      : `<span class="placeholder-icon">🌿</span>`;

    item.innerHTML = `
      <div class="circle-avatar">${imageSource}</div>
      <p class="circle-common-name" title="${species.common}">${species.common}</p>
      <p class="circle-sci-name" title="${species.scientific}">${species.scientific}</p>
    `;

    item.onclick = () => showSpeciesDetail(species);
    carousel.appendChild(item);
  });
}

// ==========================================================================
// 5. PANTALLA: FICHA DETALLADA
// ==========================================================================
function showSpeciesDetail(species) {
  // Imagen de cabecera
  const imageDiv = document.getElementById('detail-image');
  if (species.image) {
    imageDiv.innerHTML = `<img src="${species.image}" alt="${species.common}">`;
  } else {
    imageDiv.innerHTML = `<span>🌿</span>`;
  }

  // Títulos
  document.getElementById('detail-common-name').textContent = species.common;
  document.getElementById('detail-scientific-name').textContent = species.scientific;
  
  const familyEl = document.getElementById('detail-family');
  if (species.family && species.family !== 'pendiente') {
    familyEl.style.display = 'block';
    familyEl.textContent = `Familia ${species.family}`;
  } else {
    familyEl.style.display = 'none';
  }

  // Insignias compactas pensadas para pantalla de móvil
  renderDetailBadges(species);

  // Secciones de contenido estructurado
  renderDetailSections(species);

  navigateTo('species-detail');
}

function renderDetailBadges(species) {
  const badgesContainer = document.getElementById('detail-badges');
  if (!badgesContainer) return;

  const badges = [];

  // 1. Estado de conservación IUCN
  if (species.iucnCode && species.iucnCode !== 'PENDIENTE') {
    const code = species.iucnCode;
    const label = species.nationalStatus && species.nationalStatus !== 'pendiente'
      ? species.nationalStatus
      : `Categoría ${code}`;
    badges.push(`<span class="badge-risk ${code.toLowerCase()}">IUCN: ${code} · ${label}</span>`);
  }

  // Contenedor secundario para badges compactos
  const compactBadges = [];

  // 2. Origen (Nativo, Endémico, Exótica)
  if (species.origin && species.origin !== 'pendiente') {
    let iconOrigen = '🇨🇱';
    if (species.origin.toLowerCase().includes('endem')) iconOrigen = '⭐';
    if (species.origin.toLowerCase().includes('exot')) iconOrigen = '🌍';
    compactBadges.push(`<span class="badge">${iconOrigen} ${species.origin}</span>`);
  }

  // 3. Altura máxima
  if (species.maxHeight && species.maxHeight !== 'pendiente') {
    const alt = String(species.maxHeight).replace(/[^\d.,]/g, '');
    compactBadges.push(`<span class="badge">📏 ${alt} m máx.</span>`);
  }

  // 4. Tipo de hoja
  if (species.leafType && species.leafType !== 'pendiente') {
    compactBadges.push(`<span class="badge">🍃 Hoja ${species.leafType.toLowerCase()}</span>`);
  }

  // 5. Propiedad medicinal
  if (species.medicinal === true) {
    compactBadges.push(`<span class="badge badge-medicinal">🩺 Medicinal</span>`);
  }

  // 6. Facilidad de observación
  if (species.ease && species.ease !== 'pendiente') {
    let eye = '👁️';
    if (species.ease.toLowerCase() === 'facil' || species.ease.toLowerCase() === 'fácil') eye = '👁️ Fácil';
    else if (species.ease.toLowerCase() === 'moderada') eye = '👁️ Moderada';
    else if (species.ease.toLowerCase() === 'dificil' || species.ease.toLowerCase() === 'difícil') eye = '👁️ Difícil';
    else eye = `👁️ ${species.ease}`;
    compactBadges.push(`<span class="badge">${eye}</span>`);
  }

  // 7. Presencia confirmada en Oncol
  if (species.oncolPresence && species.oncolPresence !== 'pendiente') {
    compactBadges.push(`<span class="badge">📍 Oncol: ${species.oncolPresence}</span>`);
  }

  badgesContainer.innerHTML = `
    ${badges.join('')}
    <div class="compact-badges-grid">
      ${compactBadges.join('')}
    </div>
  `;
}

function renderDetailSections(species) {
  const sectionsContainer = document.getElementById('detail-sections');
  if (!sectionsContainer) return;

  const html = [];

  // Callout destacado: Cómo Reconocerla (clave para identificación en terreno)
  if (species.howToRecognize) {
    html.push(`
      <div class="callout-box callout-recognize">
        <h4>💡 Cómo Reconocerla</h4>
        <p>${species.howToRecognize}</p>
      </div>
    `);
  }

  // Callout destacado: Dato Curioso
  if (species.funFact) {
    html.push(`
      <div class="callout-box callout-curiosity">
        <h4>✨ Dato Curioso</h4>
        <p>${species.funFact}</p>
      </div>
    `);
  }

  // Bloques estándar de texto (se omiten si están vacíos)
  const bloques = [
    { title: 'Descripción Morfológica', text: species.morphology },
    { title: 'Historia Natural', text: species.naturalHistory },
    { title: 'Hábitat', text: species.habitat },
    { title: 'Distribución', text: species.distribution },
    { title: 'Usos Tradicionales', text: species.uses },
    { title: 'Presencia en Oncol', text: species.inOncol },
    { title: 'Amenazas y Conservación', text: species.threats },
    { title: 'Fuentes y Referencias', text: species.sources }
  ];

  bloques.forEach(b => {
    if (b.text && b.text.trim()) {
      html.push(`
        <div class="detail-section">
          <h3>${b.title}</h3>
          <p>${formatearTextoMarkdown(b.text)}</p>
        </div>
      `);
    }
  });

  // Si no hubiera ninguna sección con texto
  if (html.length === 0) {
    html.push(`<p class="empty-text">Ficha en elaboración. No hay contenido descriptivo aún.</p>`);
  }

  sectionsContainer.innerHTML = html.join('');
}

// ==========================================================================
// 6. UTILIDADES AUXILIARES
// ==========================================================================
function capitalizarTexto(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatearTextoMarkdown(texto) {
  if (!texto) return '';
  // Convertir *cursiva* a <em>
  let res = texto.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // Convertir saltos de línea dobles a párrafos
  res = res.replace(/\n\n+/g, '</p><p>');
  // Convertir saltos simples a <br>
  res = res.replace(/\n/g, '<br>');
  return res;
}

// Inicializar la aplicación al cargar la ventana
window.onload = inicializarBaseDeDatos;
