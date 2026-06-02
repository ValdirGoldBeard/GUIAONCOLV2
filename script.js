// ---------- BASE DE DATOS GLOBAL ----------
// Iniciamos 'data' vacío. Se rellenará automáticamente al cargar los Markdown compilados.
let data = {
  fauna: { label: 'Fauna', subcategories: {} },
  flora: { label: 'Flora', subcategories: {} },
  fungi: { label: 'Fungi', subcategories: {} }
};

// ---------- NAVEGACIÓN ----------
let currentScreen = 'welcome';
const history = []; // pila para el botón atrás

function navigateTo(screenId) {
  if (currentScreen !== screenId) {
    history.push(currentScreen); // guardamos la pantalla actual antes de cambiar
  }
  showScreen(screenId);
}

function goBack() {
  if (history.length === 0) return; // por seguridad
  const previousScreen = history.pop();
  showScreen(previousScreen, false);
}

function showScreen(screenId, addToHistory = true) {
  document.querySelector(`#screen-${currentScreen}`)?.classList.remove('active');
  document.querySelector(`#screen-${screenId}`)?.classList.add('active');
  
  const backBtn = document.getElementById('btn-back');
  if (screenId === 'welcome') {
    if (backBtn) backBtn.style.display = 'none';
    history.length = 0;
  } else {
    if (backBtn) backBtn.style.display = 'flex';
  }
  currentScreen = screenId;
}

// ---------- MOSTRAR SUBCATEGORÍAS ----------
function showSubcategories(categoryKey) {
  const category = data[categoryKey];
  if (!category) return;
  
  document.getElementById('subcategory-title').textContent = category.label;
  const container = document.getElementById('subcategory-container');
  container.innerHTML = '';
  
  for (let key in category.subcategories) {
    const sub = category.subcategories[key];
    const circle = document.createElement('div');
    circle.className = 'circle';
    circle.innerHTML = `<span>🔹</span><p>${sub.label}</p>`;
    circle.onclick = () => showSpeciesList(categoryKey, key);
    container.appendChild(circle);
  }
  
  navigateTo('subcategories');
}

// ---------- MOSTRAR LISTA DE ESPECIES (carrusel) ----------
function showSpeciesList(categoryKey, subcategoryKey) {
  const sub = data[categoryKey].subcategories[subcategoryKey];
  if (!sub) return;
  
  document.getElementById('species-list-title').textContent = sub.label;
  const carousel = document.getElementById('species-carousel');
  carousel.innerHTML = '';
  
  sub.species.forEach((species) => {
    const circle = document.createElement('div');
    circle.className = 'circle';
    
    // Si la especie tiene imagen asignada la usa, si no, usa el placeholder
    const imageSource = species.imagen_principal ? `<img src="${species.imagen_principal}" alt="${species.common}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">` : '📷';
    
    circle.innerHTML = `<span>${imageSource}</span><p>${species.common}</p>`;
    circle.onclick = () => showSpeciesDetail(species);
    carousel.appendChild(circle);
  });
  
  navigateTo('species-list');
}

// ---------- MOSTRAR FICHA DE ESPECIE ----------
function showSpeciesDetail(species) {
  const imageDiv = document.getElementById('detail-image');
  
  // Renderizar imagen real si existe
  if (species.imagen_principal) {
    imageDiv.innerHTML = `<img src="${species.imagen_principal}" alt="${species.common}" style="max-width:100%; max-height:200px; border-radius:8px;">`;
  } else {
    imageDiv.innerHTML = '📷';
  }

  // Mapeo de íconos según los atributos estandarizados de tus fotos de la guía
  const iconoObservacion = species.facilidad === 'Dificil' ? '👁️❌' : species.facilidad === 'Moderada' ? '👁️⚠️' : '👁️✔️';
  const iconoDimorfismo = species.dimorfismo ? '静态 ⚤ Con dimorfismo' : '⚦|♀ Sin dimorfismo';

  document.getElementById('detail-common-name').textContent = species.common;
  document.getElementById('detail-scientific-name').textContent = species.scientific;
  
  // Añadimos las insignias visuales (badges) aprovechando los nuevos datos de campo
  document.getElementById('detail-risk').innerHTML = `
    <span class="badge-risk ${species.risk_code.toLowerCase()}">Riesgo: ${species.risk} (${species.risk_code})</span>
    <div style="margin-top: 10px; display: flex; gap: 5px; justify-content: center; flex-wrap: wrap;">
      <span class="badge">${iconoObservacion} ${species.facilidad}</span>
      <span class="badge">📏 ${species.tamano}</span>
      <span class="badge">${iconoDimorfismo}</span>
    </div>
  `;
  
  // Construcción del texto largo estructurado desde Obsidian
  document.getElementById('detail-description').innerHTML = `
    <p><strong>Origen:</strong> ${species.origen}</p>
    <hr>
    <h3>Descripción Morfológica</h3>
    <p>${species.desc || 'No especificada.'}</p>
    <h3>Historia Natural</h3>
    <p>${species.historia || 'No especificada.'}</p>
    <h3>Hábitat</h3>
    <p>${species.habitat || 'No especificado.'}</p>
    <h3>Distribución</h3>
    <p>${species.distribucion || 'No especificada.'}</p>
    <h3>Amenazas</h3>
    <p>${species.amenazas || 'No especificadas.'}</p>
  `;
  
  navigateTo('species-detail');
}

// ---------- CONECTOR DE OBSIDIAN (CARGA DINÁMICA) ----------
async function inicializarBaseDeDatos() {
  try {
    const response = await fetch('especies.json');
    const especiesRaw = await response.json();
    
    // Procesamos el JSON plano generado por Python y lo agrupamos en la estructura que usa tu HTML
    especiesRaw.forEach(esp => {
      const cat = esp.reino_categoria; // 'fauna', 'flora' o 'fungi'
      const sub = esp.grupo_subcategoria; // 'mamiferos', 'arboles', 'aves', etc.
      
      if (!data[cat]) return; 
      
      // Si la subcategoría no existe en el objeto interno, la creamos dinámicamente
      if (!data[cat].subcategories[sub]) {
        data[cat].subcategories[sub] = {
          label: sub.charAt(0).toUpperCase() + sub.slice(1), // Pone la primera letra en mayúscula
          species: []
        };
      }
      
      // Mapeamos los datos de Obsidian para que coincidan exactamente con tus variables del Frontmatter
      data[cat].subcategories[sub].species.push({
        common: esp.nombre_principal,
        scientific: esp.nombre_scientifico,
        risk: esp.estado_nacional || "No evaluado",
        risk_code: esp.iucn_codigo || "NE",
        facilidad: esp.facilidad_observacion || "Moderada",
        tamano: esp.tamano_relativo || "Mediano",
        dimorfismo: esp.dimorfismo_sexual ?? false,
        origen: esp.origen || "Nativo",
        imagen_principal: esp.imagen_asset || "",
        desc: esp.descripcion_morfologica,
        historia: esp.historia_natural,
        habitat: esp.habitat,
        distribucion: esp.distribucion_texto,
        amenazas: esp.amenazas
      });
    });

    console.log("Base de datos de Obsidian procesada con éxito:", data);
    
    // Una vez cargados los datos, mostramos la pantalla de bienvenida
    showScreen('welcome');
    
  } catch (error) {
    console.error("Error al cargar las especies desde el JSON. Usando datos vacíos.", error);
    showScreen('welcome');
  }
}

// ---------- INICIALIZAR ----------
window.onload = inicializarBaseDeDatos;