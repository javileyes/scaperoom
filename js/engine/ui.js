import { state, getRoom, getHito, setHito }           from './gameState.js';
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
    if(window.depuracion) updateHitosUI();
  });
  
  // Agregar evento al botón de refrescar hitos
  const refreshHitosBtn = document.getElementById('refresh-hitos');
  if(refreshHitosBtn) {
    refreshHitosBtn.addEventListener('click', updateHitosUI);
  }
}

// función que vuelca state.conversationHistory en el <pre>
export function updateDebug(){
  if(!window.depuracion) return;
  const lines = state.conversationHistory.map(
    m => `${m.role.padEnd(9)} | ${m.content}`
  );
  debugBox.textContent = lines.join('\n');
  
  // También actualizar la UI de hitos cuando se active el debug
  updateHitosUI();
}

// Nueva función para actualizar la UI de hitos
export function updateHitosUI() {
  if (!window.depuracion) return;
  
  const hitosContainer = document.getElementById('hitos-container');
  if (!hitosContainer) return;
  
  // Limpiar contenedor actual
  hitosContainer.innerHTML = '';
  
  // Si no hay hitos, mostrar mensaje
  if (Object.keys(state.puzzleStates).length === 0) {
    hitosContainer.innerHTML = '<i>No hay hitos definidos todavía</i>';
    return;
  }
  
  // Crear un checkbox para cada hito
  for (const [hitoName, hitoValue] of Object.entries(state.puzzleStates)) {
    const hitoDiv = document.createElement('div');
    hitoDiv.style.margin = '3px 0';
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `hito-${hitoName}`;
    checkbox.checked = !!hitoValue;
    checkbox.dataset.hitoName = hitoName;
    
    checkbox.addEventListener('change', (e) => {
      const newValue = e.target.checked;
      const hitoToChange = e.target.dataset.hitoName;
      setHito(hitoToChange, newValue);
      console.log(`Hito "${hitoToChange}" cambiado a: ${newValue}`);
    });
    
    const label = document.createElement('label');
    label.htmlFor = `hito-${hitoName}`;
    label.textContent = ` ${hitoName} = ${hitoValue}`;
    
    hitoDiv.appendChild(checkbox);
    hitoDiv.appendChild(label);
    hitosContainer.appendChild(hitoDiv);
  }

  const createHitoDiv = document.createElement('div');
  createHitoDiv.style.marginTop = '10px';
  createHitoDiv.style.borderTop = '1px dashed #0f0';
  createHitoDiv.style.paddingTop = '5px';
  createHitoDiv.innerHTML = `
    <form id="create-hito-form" style="display:flex; gap:5px;">
      <input type="text" id="new-hito-name" placeholder="Nombre del hito" 
            style="background:#222; color:#0f0; border:1px solid #0f0; flex:1;">
      <select id="new-hito-value" style="background:#222; color:#0f0; border:1px solid #0f0;">
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
      <button type="submit" style="background:#333; color:#0f0; border:1px solid #0f0; cursor:pointer;">Crear</button>
    </form>
  `;
  hitosContainer.appendChild(createHitoDiv);

  // Añadir evento al formulario
  document.getElementById('create-hito-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const hitoName = document.getElementById('new-hito-name').value.trim();
    const hitoValue = document.getElementById('new-hito-value').value === 'true';
    
    if (hitoName) {
      setHito(hitoName, hitoValue);
      document.getElementById('new-hito-name').value = '';
      updateHitosUI();
    }
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


// inicializar debug al cargar el módulo
initDebug();

export const ui = {
  outputDiv, inputFld, label, urlFld,
  actionSelect, targetSelect,
  onCheckbox, onCheckboxLabel, target2Select,
  updateDebug, updateHitosUI
};