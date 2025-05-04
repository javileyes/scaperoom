import { ui, print, updatePrompt }     from './engine/ui.js';
import { resetGame, state, getRoom }   from './engine/gameState.js';
import { showLocation, process as processInput } from './engine/commands.js';
import { OBJECTS }                     from './data/objects.js';
import { NPCS }                        from './data/npcs.js';
import { ROOMS }                      from './data/rooms.js';

const ACTIONS = [
  '/look','/go','/cross','/examine','/take',
  '/use','/talk','/solve','/inventory','/help'
];

function populateActions(){
  ui.actionSelect.innerHTML = ACTIONS
    .map(a=>`<option value="${a}">${a}</option>`).join('');
  // fuerza que el select muestre todas las opciones
  ui.actionSelect.size = ACTIONS.length;
}

function populateTargets(){
    const act  = ui.actionSelect.value;
    const room = getRoom();
    const opts = [];
  
    if(act==='/go'){
      // sólo salas adyacentes
      for(const salida of Object.values(room.salidas||{})){
        opts.push({ref:salida.destino, label:ROOMS[salida.destino].nombre});
      }
    }
    else if(act==='/cross'){
      // sólo pasarelas (refs de salida)
      for(const ref of Object.keys(room.salidas||{})){
        opts.push({ref, label:OBJECTS[ref].nombre});
      }
    }
    else if(act==='/talk'){
      // sólo NPCs
      (room.npcs||[]).forEach(ref=>{
        opts.push({ref, label:NPCS[ref].nombre});
      });
    }
    else {
      // default: objetos visibles en sala, inventario y NPCs
      (room.objetos||[])
        .filter(ref => !OBJECTS[ref]?.oculto)         // <-- filtramos ocultos
        .forEach(ref => opts.push({ref, label:OBJECTS[ref].nombre}));

      state.inventory.forEach(ref => {
        // si tuviera ocultos en inventario (no debería), los mostramos igualmente
        opts.push({ref, label:OBJECTS[ref].nombre});
      });

      (room.npcs||[]).forEach(ref => 
        opts.push({ref, label:NPCS[ref].nombre})
      );
    }
  
    // cabecera en blanco + opciones
    ui.targetSelect.innerHTML =
      '<option value=""></option>' +
      opts.map(o=>`<option value="${o.ref}">${o.label}</option>`).join('');
    ui.targetSelect.value = '';
    ui.targetSelect.disabled = opts.length===0;
    ui.targetSelect.size = opts.length;
  }

function initSelectors(){
  populateActions();
  populateTargets();
  ui.actionSelect.addEventListener('change',()=>{
    populateTargets();
    const act = ui.actionSelect.value;
    // resetea input
    ui.inputFld.value = act;
    // si la acción lleva arg, añade espacio y activa target
    if(['/go','/cross','/examine','/take','/use','/talk','/solve'].includes(act)){
      ui.inputFld.value += ' ';
      ui.targetSelect.disabled = false;
    } else {
      ui.targetSelect.disabled = true;
    }
    ui.inputFld.focus();
  });
  ui.targetSelect.addEventListener('change',()=>{
    const act = ui.actionSelect.value.trim();
    const tgt = ui.targetSelect.value;
    // actualiza input: acción + nombre legible
    const name = OBJECTS[tgt]?.nombre || NPCS[tgt]?.nombre || tgt;
    ui.inputFld.value = `${act} ${name}`;
    ui.inputFld.focus();
  });
}

function init(){
  print('--- ASIR Room-Escape Web (modular) ---');
  print('Usando LM-Studio en http://localhost:8000');
  print('Escribe /help para ver los comandos.');

  resetGame();
  showLocation();
  updatePrompt();
  initSelectors();                     // ── inicializa selects
  ui.inputFld.disabled = false;
  ui.inputFld.focus();

  if (!ui.inputFld.listenerAttached) {
    ui.inputFld.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const txt = ui.inputFld.value.trim();
        if (txt) {
          processInput(txt);
          // tras procesar, refresca select de targets
          populateTargets();
        }
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