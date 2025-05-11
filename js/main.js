import { ui, print, updatePrompt }     from './engine/ui.js';
import { resetGame, state, getRoom }   from './engine/gameState.js';
import { showLocation, process as processInput } from './engine/commands.js';
import { OBJECTS }                     from './data/objects.js';
import { NPCS }                        from './data/npcs.js';
import { ROOMS }                      from './data/rooms.js';

const ACTIONS = [
  '/look','/go','/cross','/examine','/take','/drop',
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
    // 2) objetos visibles EN LA SALA (ya no están en inventario si se cogieron)
    (room.objetos || [])
      .filter(r => !OBJECTS[r]?.oculto)
      .forEach(ref => opts.push({ ref, label: OBJECTS[ref].nombre }));
    // 3) NPCs
    (room.npcs || []).forEach(ref => {
      opts.push({ ref, label: NPCS[ref].nombre });
    });
    // 4) inventario (para examinar objetos del inventario)
    state.inventory.forEach(ref => {
      opts.push({ ref, label: OBJECTS[ref].nombre });
    });
  }
  else if(act==='/use'){
    // Para /use, el primer objeto puede ser del inventario o de la sala
    // 1) pasarelas de la sala (si son usables directamente o tienen requisitos)
    for(const ref of Object.keys(room.salidas || {})){
      if (OBJECTS[ref].requiere_pass || OBJECTS[ref].sistema) {
          opts.push({ ref, label: OBJECTS[ref].nombre });
      }
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
  else if(act==='/take'){ // Para /take, solo objetos de la sala que sean recogibles
      (room.objetos || [])
          .filter(r => !OBJECTS[r]?.oculto && OBJECTS[r]?.recogible) 
          .forEach(ref => opts.push({ ref, label: OBJECTS[ref].nombre }));
  }
  else if(act==='/drop'){ // Para /drop (o /soltar), solo objetos del inventario
      state.inventory.forEach(ref => {
          opts.push({ ref, label: OBJECTS[ref].nombre });
      });
  }
  // Para comandos como /look, /inventory, /help, opts permanecerá vacío y el select se deshabilitará.

  // cabecera en blanco + opciones
  ui.targetSelect.innerHTML =
    '<option value=""></option>' +
    opts.map(o=>`<option value="${o.ref}">${o.label}</option>`).join('');
  ui.targetSelect.value = ''; // Resetear selección
  ui.targetSelect.disabled = opts.length===0; // Deshabilitar si no hay opciones
  ui.targetSelect.size = Math.max(2, Math.min(opts.length + 1, 10)); // Ajustar tamaño dinámicamente
}

function populateTargets2(){ // Para el segundo objetivo de /use obj on target2
  const room = getRoom();
  const opts = [];
  
  // 1. Pasarelas como segundo objetivo de "use X on Y"
  Object.keys(room.salidas||{}).forEach(r => {
      // Añadir pasarelas si pueden ser objetivo de una acción "on"
      if (OBJECTS[r].requiere_pass) {
          opts.push({ref:r, label:OBJECTS[r].nombre});
      }
  });
  
  // 2. Objetos normales en la sala
  (room.objetos||[])
    .filter(r=>!OBJECTS[r].oculto)
    .forEach(r=>opts.push({ref:r, label:OBJECTS[r].nombre}));
  
  // 3. Objetos del inventario (AÑADIDO)
  state.inventory.forEach(ref => {
    opts.push({ref, label:OBJECTS[ref].nombre});
  });
  
  ui.target2Select.innerHTML =
    '<option value=""></option>' +
    opts.map(o=>`<option value="${o.ref}">${o.label}</option>`).join('');
  ui.target2Select.value = ''; // Resetear selección
  ui.target2Select.size = Math.max(2, Math.min(opts.length + 1, 10)); // Ajustar tamaño
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