import { state, getRoom }           from './gameState.js';
import { underscoresToSpaces, nl2br } from '../utils/helpers.js';

/* --- DOM refs ------------------------------------------------------------ */
const outputDiv = document.getElementById('output');
const inputFld  = document.getElementById('input-field');
const label     = document.getElementById('input-label');
const urlFld    = document.getElementById('llm-url');
const actionSelect = document.getElementById('action-select');
const targetSelect = document.getElementById('target-select');
const onCheckbox      = document.getElementById('on-checkbox');
const onCheckboxLabel = document.getElementById('on-checkbox-label');
const target2Select   = document.getElementById('target2-select');

// refs de depuración
const debugToggle   = document.getElementById('debug-toggle');
const debugContainer= document.getElementById('debug-container');
const debugBox      = document.getElementById('debug-box');
const llmConfig      = document.getElementById('llm-config'); 

/* --- Debug --------------------------------------------------------------- */
let initedDebug = false;
function initDebug(){
  if(initedDebug) return;
  initedDebug = true;
  // arranca con flag false
  window.depuracion = false;
  // ocultamos ambos paneles al inicio
  debugContainer.style.display = 'none';
  llmConfig.style.display      = 'none';  // ← ocultar LLM config por defecto
  debugToggle.addEventListener('change', ()=>{
    window.depuracion = debugToggle.checked;
    debugContainer.style.display = window.depuracion ? 'block' : 'none';
    llmConfig .style.display     = window.depuracion ? 'block' : 'none'; // ← toggle LLM config
    updateDebug();
  });
}

/* --- print --------------------------------------------------------------- */
export function print(msg,type='game-message'){
  const line = document.createElement('div');
  line.classList.add('output-line'); if(type) line.classList.add(type);
  line.innerHTML = nl2br(msg);
  outputDiv.appendChild(line);

  const scrollOk = outputDiv.scrollHeight - outputDiv.clientHeight <=
                   outputDiv.scrollTop + 1;
  if(scrollOk) outputDiv.scrollTop = outputDiv.scrollHeight;
  if(window.depuracion) updateDebug();
}

/* ----- Etiqueta de prompt ------------------------------------------------ */
export function updatePrompt(){
  const roomName = underscoresToSpaces(getRoom()?.nombre || state.currentLocation);
  const who      = state.currentNpcRef
                     ? (state.currentAiName || state.currentNpcRef)
                     : 'Sistema';
  label.textContent = `${roomName} | ${who}> `;
  if(window.depuracion) updateDebug();
  inputFld.focus();
}

export function scrollToBottom(){
  outputDiv.scrollTop = outputDiv.scrollHeight;
}

// función que vuelca state.conversationHistory en el <pre>
export function updateDebug(){
  if(!window.depuracion) return;
  const lines = state.conversationHistory.map(
    m => `${m.role.padEnd(9)} | ${m.content}`
  );
  debugBox.textContent = lines.join('\n');
}

// inicializar debug al cargar el módulo
initDebug();

export const ui = {
  outputDiv, inputFld, label, urlFld,
  actionSelect, targetSelect,
  onCheckbox, onCheckboxLabel, target2Select,
  updateDebug
};