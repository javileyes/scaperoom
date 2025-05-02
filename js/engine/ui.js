import { state, getRoom }           from './gameState.js';
import { underscoresToSpaces, nl2br } from '../utils/helpers.js';

/* --- DOM refs ------------------------------------------------------------ */
const outputDiv = document.getElementById('output');
const inputFld  = document.getElementById('input-field');
const label     = document.getElementById('input-label');

export const ui = { outputDiv, inputFld, label };

/* --- print --------------------------------------------------------------- */
export function print(msg,type='game-message'){
  const line = document.createElement('div');
  line.classList.add('output-line'); if(type) line.classList.add(type);
  line.innerHTML = nl2br(msg);
  outputDiv.appendChild(line);

  const scrollOk = outputDiv.scrollHeight - outputDiv.clientHeight <=
                   outputDiv.scrollTop + 1;
  if(scrollOk) outputDiv.scrollTop = outputDiv.scrollHeight;
}

/* ----- Etiqueta de prompt ------------------------------------------------ */
export function updatePrompt(){
  const roomName = underscoresToSpaces(getRoom()?.nombre || state.currentLocation);
  const who      = state.currentNpcRef
                     ? (state.currentAiName || state.currentNpcRef)
                     : 'Sistema';
  label.textContent = `${roomName} | ${who}> `;
}

export function scrollToBottom(){
  outputDiv.scrollTop = outputDiv.scrollHeight;
}