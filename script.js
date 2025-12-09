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

function aplicarVolumenDesdeLocalStorage() {
  // Volumen de la música de fondo
  const vol = localStorage.getItem(VOL_KEY);
  if (vol !== null && musica) {
    musica.volume = parseFloat(vol);
  }
  const sliderFondo = document.getElementById('volumenfondo');
  if (sliderFondo && vol !== null) sliderFondo.value = vol;

  // Volumen de los efectos de botones
  const volBot = localStorage.getItem(VOL_BOTONES_KEY);
  if (volBot !== null) {
    if (hoverSound) hoverSound.volume = parseFloat(volBot);
    if (selectSound) selectSound.volume = parseFloat(volBot);
  }
  const sliderBot = document.getElementById('botonvolumen');
  if (sliderBot && volBot !== null) sliderBot.value = volBot;
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


//--------------------------------------------------------//
                        // JUEGO
//--------------------------------------------------------//

// ============================================
// VARIABLES GLOBALES
// ============================================
let textoOriginal = '';
let erroresActuales = 0;
let probabilidadActual = 5; // 1 en 5
let tiempoInicio = 0;
let tiempoTranscurrido = 0;
let timerInterval = null;
let juegoActivo = false;
let totalSorteos = 0;
let totalErrores = 0;

const entrada = document.getElementById('entradaUsuario');
const textoOriginalEl = document.getElementById('textoOriginal');
const textoUsuarioOverlay = document.getElementById('textoUsuarioOverlay');
const textoContainer = document.getElementById('textoContainer');

// ============================================
// LIMPIEZA Y NORMALIZACIÓN
// ============================================
function limpiarTexto(s) {
  if (typeof s !== 'string') s = String(s);
  s = s.replace(/[\uFEFF\u00A0\u200B-\u200F\u2028\u2029\u2060]/g, '');
  s = s.replace(/\r/g, '');
  try { s = s.normalize('NFC'); } catch (e) {}
  return s;
}

// ============================================
// INICIO DEL JUEGO
// ============================================
function iniciarJuego() {
  document.getElementById('instrucciones').style.display = 'none';
  document.getElementById('hud').style.display = 'grid';
  textoContainer.style.display = 'block';

  const textoRaw = textoOriginalEl.textContent;
  textoOriginal = limpiarTexto(textoRaw).trim();

  erroresActuales = 0;
  probabilidadActual = 5;
  totalSorteos = 0;
  totalErrores = 0;
  actualizarErrores();
  actualizarProbabilidad();

  mostrarCuentaRegresiva();
}

// ============================================
// CUENTA REGRESIVA
// ============================================
function mostrarCuentaRegresiva() {
  const countdownEl = document.getElementById('countdown');
  const numberEl = document.getElementById('countdownNumber');
  
  countdownEl.style.display = 'flex';
  let contador = 3;

  const intervalo = setInterval(() => {
    if (contador > 0) {
      numberEl.textContent = contador;
      numberEl.style.animation = 'none';
      setTimeout(() => numberEl.style.animation = 'countdown-pulse 1s ease-out', 10);
      contador--;
    } else {
      clearInterval(intervalo);
      countdownEl.style.display = 'none';
      comenzarJuego();
    }
  }, 1000);
}

// ============================================
// COMENZAR JUEGO
// ============================================
function comenzarJuego() {
  juegoActivo = true;
  entrada.focus();
  
  tiempoInicio = Date.now();
  timerInterval = setInterval(actualizarCronometro, 100);

  entrada.addEventListener('input', validarTexto);
  entrada.addEventListener('paste', (e) => {
    e.preventDefault();
    alert("❌ ¡No puedes copiar y pegar!");
  });

  // Click en el contenedor enfoca el input
  textoContainer.addEventListener('click', () => {
    if (juegoActivo) entrada.focus();
  });
}

// ============================================
// VALIDACIÓN EN TIEMPO REAL
// ============================================
function validarTexto() {
  if (!juegoActivo) return;

  const valorRaw = entrada.value;
  const valor = limpiarTexto(valorRaw);
  const esperado = textoOriginal.slice(0, valor.length);

  textoUsuarioOverlay.textContent = valor;

  if (valor.length > textoOriginal.length) {
    registrarError();
    return;
  }

  if (valor === esperado) {
    const porcentaje = Math.round((valor.length / textoOriginal.length) * 100);
    document.getElementById('progreso').textContent = porcentaje + '%';

    if (valor === textoOriginal) {
      victoria();
    }
  } else {
    registrarError();
  }
}

// ============================================
// REGISTRAR ERROR
// ============================================
function registrarError() {
  juegoActivo = false;
  totalErrores++;
  erroresActuales++;
  
  textoContainer.classList.add('error-shake');
  setTimeout(() => textoContainer.classList.remove('error-shake'), 500);

  actualizarErrores();

  if (erroresActuales >= 3) {
    // SORTEO DE RULETA RUSA
    pausarCronometro();
    setTimeout(() => sortearRuletaRusa(), 1000);
  } else {
    // Resetear y continuar
    setTimeout(() => {
      entrada.value = '';
      textoUsuarioOverlay.textContent = '';
      juegoActivo = true;
      entrada.focus();
    }, 1000);
  }
}

    // ============================================
    // SORTEO DE RULETA RUSA
    // ============================================
    function sortearRuletaRusa() {
      totalSorteos++;
      const random = Math.floor(Math.random() * probabilidadActual) + 1;

      console.log(`🎲 Sorteo #${totalSorteos}: ${random} de ${probabilidadActual}`);

      if (random === 1 || probabilidadActual === 1) {
        // MUERTE - Game Over
        reproducirVideo('videos/valio_vrg.mp4', true);
      } else {
        // SALVADO - pero bajan probabilidades
        reproducirVideo('videos/hable_bien.mp4', false);
      }
    }
// ============================================
// REPRODUCIR VIDEO
// ============================================
function reproducirVideo(nombreVideo, esGameOver) {
  const overlay = document.getElementById('videoOverlay');
  const player = document.getElementById('videoPlayer');
  const info = document.getElementById('videoInfo');

  player.src = nombreVideo;
  overlay.style.display = 'flex';
  
  if (esGameOver) {
    info.textContent = '💀 VALIÓ VRG - GAME OVER 💀';
    info.style.color = '#ff4444';
  } else {
    info.textContent = '⚠️ TE SALVASTE ESTA VEZ... ⚠️';
    info.style.color = '#f5c16c';
  }

  player.play();

  player.onended = () => {
    overlay.style.display = 'none';
    
    if (esGameOver) {
      gameOver();
    } else {
      // Continuar - bajar probabilidad
      if (probabilidadActual > 1) {
        probabilidadActual--;
      }
      actualizarProbabilidad();
      
      erroresActuales = 0;
      actualizarErrores();
      entrada.value = '';
      textoUsuarioOverlay.textContent = '';
      reanudarCronometro();
      juegoActivo = true;
      entrada.focus();
    }
  };

  // Fallback si no carga el video
  player.onerror = () => {
    console.warn('Video no encontrado:', nombreVideo);
    overlay.style.display = 'none';
    
    if (esGameOver) {
      gameOver();
    } else {
      alert('⚠️ TE SALVASTE (video no encontrado)');
      if (probabilidadActual > 1) probabilidadActual--;
      actualizarProbabilidad();
      erroresActuales = 0;
      actualizarErrores();
      entrada.value = '';
      textoUsuarioOverlay.textContent = '';
      reanudarCronometro();
      juegoActivo = true;
      entrada.focus();
    }
  };
}

// ============================================
// CRONÓMETRO
// ============================================
function actualizarCronometro() {
  tiempoTranscurrido = Date.now() - tiempoInicio;
  const segundos = Math.floor(tiempoTranscurrido / 1000);
  const minutos = Math.floor(segundos / 60);
  const segs = segundos % 60;
  document.getElementById('tiempo').textContent = 
    `${String(minutos).padStart(2, '0')}:${String(segs).padStart(2, '0')}`;
}

function pausarCronometro() {
  clearInterval(timerInterval);
  tiempoTranscurrido = Date.now() - tiempoInicio;
}

function reanudarCronometro() {
  tiempoInicio = Date.now() - tiempoTranscurrido;
  timerInterval = setInterval(actualizarCronometro, 100);
}

// ============================================
// UI UPDATES
// ============================================
function actualizarErrores() {
  document.getElementById('contadorErrores').textContent = `${erroresActuales}/3`;
  
  for (let i = 1; i <= 3; i++) {
    const dot = document.getElementById(`error${i}`);
    if (i <= erroresActuales) {
      dot.classList.add('activo');
    } else {
      dot.classList.remove('activo');
    }
  }

  if (erroresActuales >= 2) {
    document.getElementById('contadorErrores').classList.add('danger');
  } else {
    document.getElementById('contadorErrores').classList.remove('danger');
  }
}

function actualizarProbabilidad() {
  const probEl = document.getElementById('probabilidad');
  probEl.textContent = `1/${probabilidadActual}`;
  
  if (probabilidadActual <= 2) {
    probEl.classList.add('danger');
  } else {
    probEl.classList.remove('danger');
  }
}

// ============================================
// GAME OVER Y VICTORIA
// ============================================
function gameOver() {
  clearInterval(timerInterval);
  const segundos = Math.floor(tiempoTranscurrido / 1000);
  document.getElementById('mensajeGameOver').textContent = 
    `Sobreviviste ${segundos} segundos y ${totalSorteos} sorteos antes de morir`;
  document.getElementById('gameOver').style.display = 'flex';
}

function victoria() {
  clearInterval(timerInterval);
  juegoActivo = false;
  textoContainer.style.display = 'none';
  document.getElementById('victoria').style.display = 'block';
  
  const segundos = Math.floor(tiempoTranscurrido / 1000);
  const minutos = Math.floor(segundos / 60);
  const segs = segundos % 60;
  
  document.getElementById('tiempoFinal').textContent = 
    `⏱️ Tiempo: ${minutos}:${String(segs).padStart(2, '0')}`;
  
  document.getElementById('estadisticas').textContent = 
    `📊 Errores totales: ${totalErrores} | Sorteos: ${totalSorteos} | Probabilidad final: 1/${probabilidadActual}`;
}

