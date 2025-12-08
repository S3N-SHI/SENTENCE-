// script.js
// Gestiona reproducción persistente, efectos y control de volumen.
// Guarda posición de la música periódicamente para simular continuidad entre páginas.

// --- Configuración ---
const POS_KEY = 'pya_musica_pos';
const TIME_KEY = 'pya_musica_time';
const VOL_KEY = 'pya_musica_vol';
const VOL_BOTONES_KEY = 'pya_boton_vol';

// Referencias de audio (se usan si existen elementos <audio> en la página)
let musica = null;
let hoverSound = null;
let selectSound = null;
let saveIntervalId = null;

// Intenta iniciar o reanudar la música (llamado en DOMContentLoaded)
function setupAudioElements() {
  musica = document.getElementById('musicaFondo') || new Audio('sonido/sala_principal.mp3');
  hoverSound = document.getElementById('hoverSound') || new Audio('sonido/hover.mp3');
  selectSound = document.getElementById('selectSound') || new Audio('sonido/SELEC.mp3');

  // Preload y loop para música
  musica.preload = 'auto';
  musica.loop = true;
  hoverSound.preload = 'auto';
  selectSound.preload = 'auto';

  // Aplicar volumen guardado
  const vol = localStorage.getItem(VOL_KEY);
  musica.volume = vol ? parseFloat(vol) : 0.5;
  
  const volBotones = localStorage.getItem(VOL_BOTONES_KEY);
  hoverSound.volume = volBotones ? parseFloat(volBotones) : 0.9;
  selectSound.volume = volBotones ? parseFloat(volBotones) : 0.9;
  // también aplicamos a efectos si quieres (opcional): mantener algo más alto para efectos
}

// Calcula posición a la que reanudar según último guardado + tiempo transcurrido
function calcularPosicionParaReanudar() {
  const storedPos = parseFloat(localStorage.getItem(POS_KEY));
  const storedTime = parseInt(localStorage.getItem(TIME_KEY), 10);
  if (!isFinite(storedPos) || !storedTime) return 0;
  const ahora = Date.now();
  const elapsed = (ahora - storedTime) / 1000; // segundos
  // si duración disponible, utiliza modulo; sino sumamos directo
  const dur = isFinite(musica.duration) ? musica.duration : null;
  if (dur && dur > 0) {
    return (storedPos + elapsed) % dur;
  } else {
    return storedPos + elapsed;
  }
}

function intentarPlayMusica() {
  // Si ya está sonando, nada que hacer
  if (!musica) return;
  if (!musica.paused && musica.currentTime > 0) return;

  // Reanudar en posición calculada antes de play
  function startAfterMetadata() {
    try {
      const newPos = calcularPosicionParaReanudar();
      // Asegurarnos de no exceder duración si está disponible
      if (isFinite(musica.duration) && musica.duration > 0) {
        musica.currentTime = Math.min(newPos, musica.duration - 0.001);
      } else {
        musica.currentTime = newPos;
      }
    } catch (e) {
      // ignorar
    }
    musica.play().catch(err => {
      // Si el navegador bloquea el autoplay, nada grave: esperamos interacción del usuario
      // console.log('play bloqueado', err);
    });
  }

  if (musica.readyState >= 1) { // metadata loaded
    startAfterMetadata();
  } else {
    musica.addEventListener('loadedmetadata', startAfterMetadata, { once: true });
  }
}

// Guardar posición + timestamp periódicamente
function comenzarGuardadoPeriodo() {
  if (!musica) return;
  // limpiar intervalo previo
  if (saveIntervalId) clearInterval(saveIntervalId);
  saveIntervalId = setInterval(() => {
    try {
      localStorage.setItem(POS_KEY, String(musica.currentTime || 0));
      localStorage.setItem(TIME_KEY, String(Date.now()));
    } catch (e) {
      // posible quota error; ignorar
    }
  }, 300); // cada 300 ms
}

// Restaurar volumen desde slider o localStorage
function aplicarVolumenDesdeLocalStorage() {
  const vol = localStorage.getItem(VOL_KEY);
  if (vol !== null && musica) {
    musica.volume = parseFloat(vol);
  }
  const slider = document.getElementById('volumen');
  if (slider && vol !== null) slider.value = vol;
}

// Reanudar reproducción si el navegador bloqueó autoplay: escuchamos la primera interacción
function setupResumeOnUserGesture() {
  const resume = () => {
    intentarPlayMusica();
    // reproducir también cualquier efecto pendiente (no necesario)
    window.removeEventListener('pointerdown', resume);
    window.removeEventListener('keydown', resume);
    window.removeEventListener('touchstart', resume);
  };
  window.addEventListener('pointerdown', resume, { once: true });
  window.addEventListener('keydown', resume, { once: true });
  window.addEventListener('touchstart', resume, { once: true });
}

// Conectar eventos hover / click a botones para sonidos
function conectarEfectosAElementos() {
  const botones = document.querySelectorAll('.btn');
  botones.forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      if (!hoverSound) return;
      try {
        hoverSound.currentTime = 0;
        hoverSound.play().catch(() => {/* si bloquea, la interacción del usuario ya habrá desbloqueado */ });
      } catch (e) { }
    }, { passive: true });

    btn.addEventListener('click', () => {
      if (!selectSound) return;
      try {
        selectSound.currentTime = 0;
        selectSound.play().catch(() => { });
      } catch (e) { }
    }, { passive: true });
  });
}

// Control de volumen en opciones
function conectarSliderVolumen() {
  // Slider volumen de fondo
  const sliderFondo = document.getElementById('volumenfondo');
  if (sliderFondo) {
    const volFondo = localStorage.getItem(VOL_KEY);
    sliderFondo.value = volFondo !== null ? volFondo : (musica ? musica.volume : 0.5);

    sliderFondo.addEventListener('input', (e) => {
      const val = e.target.value;
      try {
        localStorage.setItem(VOL_KEY, val);
      } catch (err) { }
      if (musica) musica.volume = parseFloat(val);
    });
  }

  // Slider volumen de botones
  const sliderBotones = document.getElementById('botonvolumen');
  if (sliderBotones) {
    const volBotones = localStorage.getItem(VOL_BOTONES_KEY);
    sliderBotones.value = volBotones !== null ? volBotones : 0.9;

    sliderBotones.addEventListener('input', (e) => {
      const val = e.target.value;
      try {
        localStorage.setItem(VOL_BOTONES_KEY, val);
      } catch (err) { }
      if (hoverSound) hoverSound.volume = parseFloat(val);
      if (selectSound) selectSound.volume = parseFloat(val);
    });
  }
}

// Botón Jugar: NO navega (según tu petición actual), solo reproduce efecto
function configurarBtnJugar() {
  const btn = document.getElementById('btnJugar');
  if (!btn) return;
  btn.addEventListener('click', (e) => {
    // No navegamos a otra parte; solo reproducir efecto (ya manejado por conectarEfectosAElementos)
    // Si en el futuro quieres que al pulsar 'jugar' se detenga la música, descomenta:
    // if (musica) { musica.pause(); }
  });
}

// Iniciar todo en DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  setupAudioElements();
  aplicarVolumenDesdeLocalStorage();

  // Si la página NO es "jugar", intentamos iniciar la música
  const path = window.location.pathname.toLowerCase();
  if (!path.includes('jugar')) {
    intentarPlayMusica();
    comenzarGuardadoPeriodo();
    setupResumeOnUserGesture();
  }

  conectarEfectosAElementos();
  conectarSliderVolumen();
  configurarBtnJugar();

  // Máquina de escribir menor (opcional)
  const typeEl = document.getElementById('typewriter');
  if (typeEl) {
    const t = typeEl.textContent;
    typeEl.textContent = '';
    let i = 0;
    const interval = setInterval(() => {
      typeEl.textContent += t.charAt(i);
      i++;
      if (i >= t.length) clearInterval(interval);
    }, 45);
  }
});

// Cuando el usuario cierre o cambie de página, dejamos guardado final inmediato
window.addEventListener('beforeunload', () => {
  try {
    if (musica) {
      localStorage.setItem(POS_KEY, String(musica.currentTime || 0));
      localStorage.setItem(TIME_KEY, String(Date.now()));
    }
  } catch (e) { }
});

