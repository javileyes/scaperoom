import { ui, print, updatePrompt }     from './engine/ui.js';
import { resetGame, state, getRoom }   from './engine/gameState.js';
import { showLocation, process as processInput } from './engine/commands.js';
import { OBJECTS }                     from './data/objects.js';
import { NPCS }                        from './data/npcs.js';
import { ROOMS }                      from './data/rooms.js';

const ACTIONS = [
  '/look','/go','/cross','/examine','/take',
  '/use','/talk','/inventory','/help'
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
    else if(act==='/examine'){
      // 1) pasarelas de la sala
      for(const ref of Object.keys(room.salidas||{})){
        opts.push({ref, label:OBJECTS[ref].nombre});
      }
      // 2) objetos visibles
      (room.objetos || [])
        .filter(r => !OBJECTS[r]?.oculto)
        .forEach(ref => opts.push({ ref, label: OBJECTS[ref].nombre }));
      // 3) NPCs
      (room.npcs || []).forEach(ref => {
        opts.push({ ref, label: NPCS[ref].nombre });
      });
      // 4) inventario
      state.inventory.forEach(ref => {
        opts.push({ ref, label: OBJECTS[ref].nombre });
      });
    }
    else if(act==='/use'){
      // 1) pasarelas de la sala
      for(const ref of Object.keys(room.salidas || {})){
        opts.push({ ref, label: OBJECTS[ref].nombre });
      }
      // 2) objetos visibles en sala
      (room.objetos || [])
        .filter(r => !OBJECTS[r]?.oculto)
        .forEach(ref => opts.push({ ref, label: OBJECTS[ref].nombre }));
      // 3) tu inventario
      state.inventory.forEach(ref =>
        opts.push({ ref, label: OBJECTS[ref].nombre })
      );
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
    ui.targetSelect.size = opts.length + 1;
  }

  function populateTargets2(){
    const room = getRoom();
    const opts = [];
    // sólo objetos visibles en sala + pasarelas
    Object.keys(room.salidas||{}).forEach(r => opts.push({ref:r, label:OBJECTS[r].nombre}));
    (room.objetos||[])
      .filter(r=>!OBJECTS[r].oculto)
      .forEach(r=>opts.push({ref:r, label:OBJECTS[r].nombre}));
    ui.target2Select.innerHTML =
      '<option value=""></option>' +
      opts.map(o=>`<option value="${o.ref}">${o.label}</option>`).join('');
    ui.target2Select.size = opts.length + 1;
  }  

  function initSelectors(){
    // … existing populateActions/Targets …
    ui.actionSelect.addEventListener('change',()=>{
      populateTargets();
      // Sólo en /use mostramos checkbox “on”
      const isUse = ui.actionSelect.value === '/use';
      ui.onCheckboxLabel.style.display = isUse ? 'inline-block' : 'none';
      ui.onCheckbox.checked           = false;
      ui.target2Select.style.display  = 'none';
      updateInputFromSelects();
      ui.inputFld.focus();
    });
    ui.targetSelect.addEventListener('change',()=>{
      // cuando cambie origen, si estamos en /use, resetea tercer select
      if(ui.actionSelect.value==='/use'){
        ui.onCheckbox.checked = false;
        ui.target2Select.style.display = 'none';
        // y recargamos opciones objetivo
        populateTargets2();
      }
      // actualiza input
      updateInputFromSelects();
      ui.inputFld.focus();
    });
    ui.onCheckbox.addEventListener('change',()=>{
      ui.target2Select.style.display = ui.onCheckbox.checked ? 'block' : 'none';
      updateInputFromSelects();
      ui.inputFld.focus();
    });
    ui.target2Select.addEventListener('change',()=>{
      updateInputFromSelects();
      ui.inputFld.focus();   // ← foco al input
    });  
  }
  
  // Construye el comando en el input según selects
  function updateInputFromSelects(){
    const act  = ui.actionSelect.value.trim();
    const t1   = ui.targetSelect.value;
    if(!t1){ ui.inputFld.value = act; return; }
    const name1 = OBJECTS[t1]?.nombre || NPCS[t1]?.nombre || t1;
    if(act==='/use' && ui.onCheckbox.checked && ui.target2Select.value){
      const t2 = ui.target2Select.value;
      const name2 = OBJECTS[t2]?.nombre || t2;
      ui.inputFld.value = `${act} ${name1} on ${name2}`;
    } else {
      ui.inputFld.value = `${act} ${name1}`;
    }
  }

function init(){
  print('--- ASIR Room-Escape Web (modular) ---');
  print('Usando LM-Studio en http://localhost:8000');
  print('Escribe /help para ver los comandos.');

  resetGame();
  showLocation();
  updatePrompt();
  populateActions();
  populateTargets();
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