import {
  state,
  getRoom,
  getObj,
  getNpc,
  saveCurrentNpcContext,
  loadNpcContext
} from './gameState.js';
import { OBJECTS } from '../data/objects.js';
import { NPCS }    from '../data/npcs.js';
import { ROOMS }   from '../data/rooms.js';
import { print, updatePrompt, scrollToBottom, updateDebug } from './ui.js';
import { askLLM }  from './llm.js';
import { underscoresToSpaces, spacesToUnderscores } from '../utils/helpers.js';


/* ============ Helpers de búsqueda ======================================= */
function findRefByName(name, pool) {
  if (!name) return null;
  const lower    = name.toLowerCase();
  const maybeRef = spacesToUnderscores(name);
  if (pool[maybeRef]) return maybeRef;
  for (const r in pool) {
    if (pool[r]?.nombre?.toLowerCase() === lower) return r;
  }
  for (const r in pool) {
    if (pool[r]?.nombre?.toLowerCase().includes(lower)) return r;
  }
  for (const r in pool) {
    if (r.toLowerCase().includes(maybeRef.toLowerCase())) return r;
  }
  return null;
}


/* ============ Comandos básicos ========================================= */
export function showLocation() {
  const room = getRoom();
  print(`\n=== ${room.nombre} ===`, 'location-title');
  print(room.descripcion);

  // objetos visibles y no recogidos
  const objs = (room.objetos || [])
    .filter(r =>
      !state.inventory.includes(r) &&
      OBJECTS[r]?.tipo !== 'Pasarela' &&
      !OBJECTS[r]?.oculto
    );
  if (objs.length) {
    print('\nObservas:');
    objs.forEach(r => print('  - ' + OBJECTS[r].nombre));
  }

  // NPCs
  const npcs = room.npcs || [];
  if (npcs.length) {
    print('\nVes a:');
    npcs.forEach(r => print('  - ' + NPCS[r].nombre));
  }

  // Salidas
  print('\nSalidas:');
  for (const pas of Object.keys(room.salidas || {})) {
    const dest    = room.salidas[pas].destino;
    const blocked = OBJECTS[pas].bloqueada;
    const stat    = blocked ? '[BLOQUEADA]' : '';
    print(
      `  - ${OBJECTS[pas].nombre} → ${ROOMS[dest].nombre} ${stat}`
    );
  }

  print('====================');
  scrollToBottom();
}


//-------- examinar ----------------------------------------------------------- */
export function examine(name) {
  const room   = getRoom();
  const search = {};

  // 1) incluir pasarelas de la sala en el pool de búsqueda
  Object.keys(room.salidas || {}).forEach(ref => {
    search[ref] = OBJECTS[ref];
  });

  // 2) sumar objetos de sala, NPCs y inventario
  (room.objetos || []).forEach(r => search[r] = OBJECTS[r]);
  (room.npcs   || []).forEach(r => search[r] = NPCS[r]);
  state.inventory.forEach(r => search[r] = OBJECTS[r]);

  const ref = findRefByName(name, search);
  if (!ref) {
    print(`No ves '${name}' por aquí.`);
    scrollToBottom();
    return;
  }

  const data   = search[ref];
  const prefix = data.rol ? 'Observas a' : 'Examinas';
  let currentDescription = data.descripcion; // Descripción por defecto

  // Comprobar si hay descripciones basadas en estado para este objeto
  if (data.tipo === 'Dispositivo' && data.descripciones_estado) {
    const stateKey = `${ref}_estado`; // Construye la clave del estado, ej: "SRV_DC01_estado"
    const currentState = state.puzzleStates[stateKey];
    if (currentState && data.descripciones_estado[currentState]) {
      currentDescription = data.descripciones_estado[currentState];
    }
  }

  print(`${prefix} ${data.nombre}: ${currentDescription}`); // Usar la descripción determinada

  // requisitos genéricos
  if (data.requiere_pass) {
    const campos = Object.keys(data.requiere_pass).join(', ');
    print(`Requiere contraseña para: ${campos}.`);
    print(`Ejecuta "/use ${data.nombre}" para introducirla.`);
  }
  if (Array.isArray(data.requiere_obj)) {
    const lista = data.requiere_obj
      .map(r => OBJECTS[r]?.nombre || r)
      .join(', ');
    print(`Requiere para abrir: ${lista}.`);
  }

  // resto de la lógica anterior (detalle, contenidos ocultos, bloqueo pasarela…)
  if (data.contenido_detalle) {
    print('\n--- Detalle ---');
    print(data.contenido_detalle);
    print('----------------');
  }
  if (Array.isArray(data.contenidos)) {
    data.contenidos.forEach(oRef => {
      if (OBJECTS[oRef].oculto) {
        OBJECTS[oRef].oculto = false;
        if (!room.objetos.includes(oRef)) room.objetos.push(oRef);
        print(`Al examinar ${data.nombre}, encuentras: ${OBJECTS[oRef].nombre}.`);
      }
    });
  }
  if (data.tipo === 'Pasarela' && state.puzzleStates[`${ref}_bloqueada`]) {
    print(data.mensaje_bloqueo || 'Parece bloqueada.');
  }
  if (data.tipo === 'Dispositivo') {
    const key = `${ref}_estado`;
    if (state.puzzleStates[key]) {
      print(`Estado actual: ${state.puzzleStates[key]}`);
      if (state.puzzleStates[key]==='login_required' && data.mensaje_login) {
        print(data.mensaje_login);
      }
    }
  }

  scrollToBottom();
}

/* --- take -------------------------------------------------------------- */
export function take(name) {
  const room = getRoom();
  // Buscar el objeto por nombre entre los objetos DEFINIDOS en la sala actual
  const poolForTake = Object.fromEntries(
    (room.objetos || []).map(objRef => [objRef, OBJECTS[objRef]])
  );
  const ref  = findRefByName(name, poolForTake);

  if (!ref) { 
    print(`No hay '${name}' aquí para coger.`);
    scrollToBottom();
    return;
  }

  if (state.inventory.includes(ref)) {
    print('Ya lo tienes.');
    scrollToBottom();
    return;
  }

  const obj = OBJECTS[ref];
  if (!obj.recogible) {
    print(`No puedes coger ${obj.nombre}.`);
    scrollToBottom();
    return;
  }

  // Quitar de la lista de objetos de la sala
  room.objetos = room.objetos.filter(itemRef => itemRef !== ref);
  
  // Añadir al inventario
  state.inventory.push(ref);

  print(`Recoges: ${obj.nombre}`);
  scrollToBottom();
}

/* --- drop (soltar) ------------------------------------------------------- */
export function drop(name) {
  const room = getRoom();
  // Buscar el objeto por nombre SÓLO en el inventario
  const poolForDrop = Object.fromEntries(
    state.inventory.map(objRef => [objRef, OBJECTS[objRef]])
  );
  const ref = findRefByName(name, poolForDrop);

  if (!ref) { 
    print(`No tienes '${name}' en tu inventario para soltar.`);
    scrollToBottom();
    return;
  }

  const obj = OBJECTS[ref];

  // Quitar del inventario
  state.inventory = state.inventory.filter(itemRef => itemRef !== ref);
  
  // Añadir a la lista de objetos de la sala actual
  if (!room.objetos) {
    room.objetos = []; 
  }
  room.objetos.push(ref);

  print(`Sueltas: ${obj.nombre} en ${room.nombre}.`);
  scrollToBottom();
}


function consumeObject(objectRefToRemove) {
  const objToConsume = OBJECTS[objectRefToRemove];
  if (!objToConsume) return;

  const room = getRoom();

  // Eliminar del inventario del jugador
  const initialInventoryLength = state.inventory.length;
  state.inventory = state.inventory.filter(itemRef => itemRef !== objectRefToRemove);
  
  // Eliminar de la lista de objetos de la sala actual (si no estaba en el inventario)
  if (room.objetos && initialInventoryLength === state.inventory.length) { // Solo si no se quitó del inventario
    room.objetos = room.objetos.filter(itemRef => itemRef !== objectRefToRemove);
  }
  
  print(`${objToConsume.nombre} ha desaparecido después de su uso.`, 'game-message');
}

/* --- use (cables, nota, dispositivos IOS) ----------------------------- */
export function use(objName, targetName) {
  const room = getRoom();
  const ref  = findRefByName(objName, OBJECTS); // ref del objeto origen (X)
  const obj  = OBJECTS[ref]; // El objeto origen (X)

  // ── if “use X on Y” y Y.requiere_obj ───────────────────────────
  if (targetName) {
    const tRef = findRefByName(targetName, OBJECTS); // tRef es el ID del objeto destino (Y)
    if (tRef) {
      const tObj = OBJECTS[tRef]; // tObj es el objeto destino (Y)
      if (Array.isArray(tObj.requiere_obj)) {
        const faltan = tObj.requiere_obj.filter(r => !state.inventory.includes(r));
        if (faltan.length) {
          print(
            `Para abrir ${tObj.nombre} faltan: ` +
            `${faltan.map(r => OBJECTS[r].nombre).join(', ')}.`
          );
        } else { // Todos los objetos requeridos por tObj están en el inventario
          let success = false;
          if (tObj.tipo === 'Pasarela') {
            if (tObj.bloqueada) {
                tObj.bloqueada = false;
                success = true;
            }
          } else {
            if (tObj.oculto) {
                tObj.oculto = false;
                success = true;
            }
          }

          if (success) {
            print(`${tObj.nombre} ahora accesible.`);
            // Consumir TODOS los objetos one_use que eran parte del requisito
            tObj.requiere_obj.forEach(requiredRef => {
              const requiredObj = OBJECTS[requiredRef];
              // Se comprueba si el objeto requerido estaba en el inventario (condición para ser "usado")
              if (requiredObj.one_use && state.inventory.includes(requiredRef)) { 
                consumeObject(requiredRef);
              }
            });
          } else {
            print(`${tObj.nombre} ya estaba accesible o no cambió de estado.`);
          }
        }
        scrollToBottom();
        return;
      }
    }
  }

  // 1) Caso requiere_obj (en el caso de que no haya targetName, usar X en sí mismo si X requiere_obj)
  if (!targetName && obj?.requiere_obj) {
    const faltan = obj.requiere_obj.filter(r=>!state.inventory.includes(r));
    if (faltan.length) {
      print(
        `Para usar ${obj.nombre}, faltan: ${faltan.map(r=>OBJECTS[r].nombre).join(', ')}.`
      );
    } else {
      let success = false;
      if (obj.tipo==='Pasarela') {
        if (obj.bloqueada) {
            obj.bloqueada = false;
            success = true;
        }
      } else {
        if (obj.oculto) {
            obj.oculto = false;
            success = true;
        }
      }
      if (success) {
        print(`${obj.nombre} ahora accesible.`);
        // Consumir TODOS los objetos one_use que eran parte del requisito
        obj.requiere_obj.forEach(requiredRef => {
            const requiredObj = OBJECTS[requiredRef];
            if (requiredObj.one_use && state.inventory.includes(requiredRef)) {
                consumeObject(requiredRef);
            }
        });
      } else {
         print(`${obj.nombre} ya estaba accesible o no cambió de estado.`);
      }
    }
    scrollToBottom();
    return;
  }

  // 2) Caso requiere_pass
  if (!targetName && obj?.requiere_pass) {
    const keys = Object.keys(obj.requiere_pass);
    state.pending = {
      ref, type:'pass',
      keys, idx:0,
      creds: obj.requiere_pass,
      inputs:{}
    };
    print(`Introduce ${keys[0]}:`); scrollToBottom();
    return;
  }

 

  // ── modo “conversación” con un sistema ──────────────────────
  const sysRef = findRefByName(
    objName,
    Object.fromEntries((room.objetos||[]).map(r => [r, OBJECTS[r]]))
  );
  if (!targetName && sysRef && OBJECTS[sysRef].sistema) {
    const sys    = OBJECTS[sysRef];
    const dialog = sys.dialogues.find(d =>
      d.superado === false || !state.puzzleStates[d.superado]
    );

    // 1) Guardar contexto del NPC/sistema anterior
    saveCurrentNpcContext();

    // 2) Cambiar a este “sistema” y cargar su contexto previo
    state.currentNpcRef       = sysRef;
    state.currentAiName       = sys.nombre;
    state.currentSystemPrompt = dialog.system_prompt;
    loadNpcContext(sysRef);

    // 3) Mostrar saludo y añadirlo al history
    print(`\n--- Conectado a ${sys.nombre} ---`, 'game-message');
    print(`${sys.nombre}: ${dialog.saludo}`, 'ai-response');
    state.conversationHistory.push({ role:'assistant', content:dialog.saludo });

    updatePrompt();
    scrollToBottom();
    if (window.depuracion) updateDebug();
    return;
  }

  // Para los siguientes usos específicos (cables, notas, etc.),
  // el objeto principal (objName, ya resuelto a 'ref' y 'obj') 
  // debe estar en el inventario o ser un objeto visible en la sala.

  if (!obj) { // 'obj' fue definido al inicio de la función como OBJECTS[ref]
    print(`No existe tal cosa como '${objName}'.`);
    scrollToBottom();
    return;
  }

  const isInInventory = state.inventory.includes(ref); // 'ref' es el ID de objName
  const isInRoomAndVisible = room.objetos?.includes(ref) && !obj.oculto;

  // Si no es un caso especial ya manejado (requiere_*, sistema)
  // y el objeto no está en el inventario ni es un objeto visible en la sala,
  // entonces no se puede usar de esta manera.
  if (!isInInventory && !isInRoomAndVisible) {
    // Si es una pasarela, ya debería haber sido manejada por requiere_pass/obj o no es usable así.
    if (obj.tipo === 'Pasarela') {
        print(`No puedes usar '${obj.nombre}' de esa manera.`);
    } else {
        print(`No puedes usar '${obj.nombre}' porque no está accesible (ni en tu inventario ni visible aquí).`);
    }
    scrollToBottom();
    return;
  }
  
  // targetRef (para "use X on Y")
  let targetObj = null; // Para el objeto destino
  if (targetName) {
    const tRef = findRefByName(targetName, OBJECTS);
    if (!tRef || !room.objetos?.includes(tRef) && !OBJECTS[tRef].tipo === 'Pasarela' /* Permitir pasarelas como target */) {
        // El objetivo (targetName) debe ser un objeto visible en la sala o una pasarela.
        const targetPool = Object.fromEntries(
            (room.objetos || []).filter(r => !OBJECTS[r]?.oculto).map(r => [r, OBJECTS[r]])
        );
        Object.keys(room.salidas || {}).forEach(r => targetPool[r] = OBJECTS[r]); // Añadir pasarelas al pool de búsqueda para target

        const foundTargetRef = findRefByName(targetName, targetPool);
        if (!foundTargetRef) {
            print(`No ves '${targetName}' aquí para usar algo sobre él.`);
            scrollToBottom();
            return;
        }
        targetObj = OBJECTS[foundTargetRef];
    } else {
        targetObj = OBJECTS[tRef];
    }
  }

  // Mensaje de intento
  print(
    `Intentando usar ${obj.nombre}` +
    (targetObj ? ` sobre ${targetObj.nombre}` : '')
  );

  // conexiones de cables a servidor
  if (
    (ref === 'Cable_Red_Nuevo_Caja') &&
    targetObj && targetObj === OBJECTS['SRV_DC01'] // Comparar con la referencia directa al objeto servidor
  ) {
    const key = 'SRV_DC01_estado';
    let success = false;
    if (state.puzzleStates[key] === 'offline_disconnected') {
      state.puzzleStates[key] = 'offline_connected';
      print('Conectas el cable. La luz de red se vuelve verde.');
      success = true;
    } else if (state.puzzleStates[key] === 'offline_connected') {
      print('El servidor ya tiene cable.');
    } else {
      print('No tiene efecto.');
    }

    if (success && obj.one_use) { // obj es el cable (OBJECTS[ref])
        consumeObject(ref);
    }
    scrollToBottom();
    return;
  }

  // leer nota
  if (ref === 'Nota_Profesor' && !targetRef) {
    print(
      '\n--- Contenido de la nota ---\n' +
      obj.contenido_detalle +
      '\n---------------------------'
    );
    scrollToBottom();
    return;
  }

  // manual Cisco
  if (ref === 'Manual_Cisco' && !targetRef) {
    print('\n' + obj.contenido_detalle);
    scrollToBottom();
    return;
  }

  print('No ocurre nada.');
  scrollToBottom();
}


/* --- talk -------------------------------------------------------------- */
export async function talk(name) {
  const room   = getRoom();
  const npcRef = findRefByName(name, NPCS);
  if (!npcRef || !room.npcs.includes(npcRef)) {
    print(`No ves a '${name}' aquí.`);
    return;
  }

  const npc    = NPCS[npcRef];
  // escogemos el primer diálogo cuyo `superado` aún no está true
  const dialog = npc.dialogues.find(d =>
    d.superado === false || !state.puzzleStates[d.superado]
  );

  saveCurrentNpcContext();
  state.currentNpcRef       = npcRef;
  state.currentAiName       = npc.nombre;
  state.currentSystemPrompt = dialog.system_prompt;
  loadNpcContext(npcRef);

  print(`\n--- Hablando con ${npc.nombre} ---`, 'location-title');
  print(`${npc.nombre}: ${dialog.saludo}`, 'ai-response');
  state.conversationHistory.push({ role:'assistant', content:dialog.saludo });
  updatePrompt(); scrollToBottom();
  if (window.depuracion) updateDebug();
}



/* --- movement ----------------------------------------------------------- */
function canLeaveAula() {
  return state.puzzleStates['javier_passed'];
}

export function cross(name) {
  const room = getRoom();
  const ref  = findRefByName(
    name,
    Object.fromEntries(
      Object.keys(room.salidas || {}).map(p => [p, OBJECTS[p]])
    )
  );
  if (!ref) {
    print(`No hay salida '${name}'.`);
    return;
  }

  if (
    state.currentLocation === 'Aula_Teoria' &&
    !canLeaveAula()
  ) {
    print('Javier se interpone: «Necesitas acertar 3 preguntas antes de salir».');
    scrollToBottom();
    return;
  }

  if (OBJECTS[ref].bloqueada) {
    print(OBJECTS[ref].mensaje_bloqueo || 'Está bloqueada.');
    scrollToBottom();
    return;
  }

  const dest = room.salidas[ref].destino;
  moveTo(dest, OBJECTS[ref].nombre);
}

export function go(destName) {
  const destRef = findRefByName(destName, ROOMS);
  if (!destRef) {
    print('Lugar desconocido.');
    return;
  }
  const room = getRoom();
  for (const p in room.salidas) {
    if (
      room.salidas[p].destino === destRef &&
      !OBJECTS[p].bloqueada     ) {
      cross(p);
      return;
    }
  }
  print('No hay un camino abierto hasta allí.');
  scrollToBottom();
}

export function moveTo(destRef, via = '') {
  if (!ROOMS[destRef]) {
    print('Destino desconocido.');
    return;
  }

  saveCurrentNpcContext();
  if (via) print(`Cruzas por ${via}…`);

  state.currentLocation      = destRef;
  state.currentNpcRef        = null;
  state.currentAiName        = 'Sistema';
  state.currentSystemPrompt  = 'Eres un narrador...';
  state.conversationHistory  = [];

  showLocation();
  updatePrompt();
  scrollToBottom();
}


/* ============ Entrada de texto principal =============================== */
export async function process(raw) {
  const cmd = raw.trim();
  if (!cmd) return;

  // ── si estamos pidiendo contraseña ──────────────────────────────
  if (state.pending?.type==='pass') {
    const p = state.pending;
    const key = p.keys[p.idx];
    if (raw === p.creds[key]) {
      p.inputs[key] = raw;
      p.idx++;
      if (p.idx < p.keys.length) {
        const next = p.keys[p.idx];
        print(`Introduce ${next}:`);
      } else {
        // todo ok → abrir
        const obj = OBJECTS[p.ref];
        if (obj.tipo==='Pasarela')
          obj.bloqueada = false; 
        else
          obj.oculto = false;
        print(`Acceso concedido a ${obj.nombre}.`);
        state.pending = null;
      }
    } else {
      print('Acceso denegado.');
      print(`Vuelve a ejecutar "/use ${OBJECTS[p.ref].nombre}" para volver a intentarlo.`);
      state.pending.inputs[key] = raw;
      state.pending = null;
    }
    scrollToBottom();
    return;
  }


  // comandos con '/'
  // ── 1) SLASH commands ─────────────────────────────────────────
  if (cmd.startsWith('/')) {

    // atender '/look' sin parámetros o con extra
    if (cmd === '/look' || cmd.startsWith('/look ')) {
      showLocation();
      return;
    }

    if (cmd.startsWith('/help')) {
      print(
  `Comandos:
  /look          – describir sala
  /go <lugar>    – ir a una sala conectada
  /cross <salida>– cruzar por pasarela concreta
  /examine <obj> – examinar algo
  /take <obj>    – coger objeto
  /drop <obj>    – soltar objeto del inventario
  /use <obj> [on <dest>] – usar
  /talk <npc>    – hablar con alguien
  /inventory     – inventario`,
        'game-message'
      );
      scrollToBottom();
      return;
    }
    if (cmd === '/inventory') {
      if (!state.inventory.length) {
        print('Inventario vacío.', 'game-message');
      } else {
        print('Llevas:', 'game-message');
        state.inventory.forEach(r => print('  - ' + OBJECTS[r].nombre, 'game-message'));
      }
      scrollToBottom();
      return;
    }

    if (cmd.startsWith('/examine ')) {
      examine(cmd.slice(9));
      return;
    }
    if (cmd.startsWith('/take ')) {
      take(cmd.slice(6));
      return;
    }
    if (cmd.startsWith('/drop ')) { // Comando /soltar
      drop(cmd.slice(6)); 
      return;
    }    
    if (cmd.startsWith('/use ')) {
      const [obj, dest] = cmd.slice(5).split(' on ');
      use(obj.trim(), dest?.trim());
      return;
    }
    if (cmd.startsWith('/talk ')) {
      talk(cmd.slice(6));
      return;
    }

    if (cmd.startsWith('/go ')) {
      go(cmd.slice(4));
      return;
    }
    if (cmd.startsWith('/cross ')) {
      cross(cmd.slice(7));
      return;
    }

  }

  // ── 2) MODO CONVERSACIÓN NPC o SISTEMA ──────────────────────────
  if (state.currentNpcRef) {
    const llmAnswer = await askLLM(raw.trim());
    if (window.depuracion) updateDebug();
  
    // procesar hitos genéricos en NPCS o SYSTEMS (objeto con propiedad sistema, dialogues, milestones)
    const def = NPCS[state.currentNpcRef] || OBJECTS[state.currentNpcRef];
    if (def?.milestones) {
      for (const [hito, psKey] of Object.entries(def.milestones)) {
        if (!state.puzzleStates[psKey] && llmAnswer.includes(hito)) {
          state.puzzleStates[psKey] = true;
          print(`Puzzle "${psKey}" desbloqueado.`, 'game-message');
          scrollToBottom();
        }
      }
    }
    return;
  }
    
    // if (state.currentNpcRef==='Switch_Cisco' &&
    //          llmAnswer.includes('/hito configuración_switch superado')) {
    //   state.puzzleStates['configuracion_switch'] = true;
    //   print('Switch Cisco: Configuración aceptada.', 'ai-response');
    //   scrollToBottom();
    // }
   

  // ── 3) sin comando ni NPC ─────────────────────────────────────────
  print('Usa /talk o /use para interactuar.');
  scrollToBottom();

} 
