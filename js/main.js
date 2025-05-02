import { ui, print, updatePrompt } from './engine/ui.js';
import { resetGame } from './engine/gameState.js';
import { showLocation, process as processInput } from './engine/commands.js';

function init(){
  print('--- ASIR Room-Escape Web (modular) ---');
  print('Usando LM-Studio en http://localhost:8000');
  print('Escribe /help para ver los comandos.');

  resetGame();
  showLocation(); updatePrompt();

  ui.inputFld.disabled = false; ui.inputFld.focus();

  if (!ui.inputFld.listenerAttached) {        // ← evita duplicados
    ui.inputFld.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const txt = ui.inputFld.value.trim();
        if (txt) processInput(txt);
        ui.inputFld.value = '';
      }
    });
    ui.inputFld.listenerAttached = true;
  }
}

if(document.readyState==='loading')
  document.addEventListener('DOMContentLoaded',init);
else
  init();