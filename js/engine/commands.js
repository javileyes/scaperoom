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

  const data = search[ref];
  const prefix = data.rol ? 'Observas a' : 'Examinas';
  
  // Determinar la descripción basada en estado si existe
  let currentDescription = data.descripcion || data.descripcion_base || '';
  
  if (data.descripciones_estado && data.estado_actual) {
    const estadoObj = data.descripciones_estado[data.estado_actual];
    if (estadoObj) {
      currentDescription = estadoObj.descripcion || currentDescription;
    }
  }

  print(`${prefix} ${data.nombre}: ${currentDescription}`);
  
  // Mostrar información sobre requisitos para cambiar el estado si existe
  if (data.descripciones_estado && data.estado_actual) {
    const estadoObj = data.descripciones_estado[data.estado_actual];
    if (estadoObj && estadoObj.siguiente && estadoObj.necesita) {
      const necesitaTexto = estadoObj.necesita.map(r => OBJECTS[r]?.nombre || r).join(', ');
      // print(`Para avanzar a la siguiente fase necesitas: ${necesitaTexto}`);
      print("Podríamos hacer algo con esto...");
    }
  }

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
/* --- use (genérico para todos los objetos) --------------------------- */
export function use(objName, targetName) {
  const room = getRoom();
  const ref = findRefByName(objName, OBJECTS);
  const obj = OBJECTS[ref];

  if (!obj) {
    print(`No existe tal cosa como '${objName}'.`);
    scrollToBottom();
    return;
  }

  // Verificar si el objeto de origen está en el inventario o visible en la sala
  const isObjAccessible = state.inventory.includes(ref) || 
                         (room.objetos && room.objetos.includes(ref) && !obj.oculto);

  if (!isObjAccessible && obj.tipo !== 'Pasarela') {
    print(`No puedes usar '${obj.nombre}' porque no está accesible.`);
    scrollToBottom();
    return;
  }

  // CASO 1: USO DE UN OBJETO SOBRE OTRO OBJETO (use X on Y)
  if (targetName) {
    const targetRef = findRefByName(targetName, OBJECTS);
    if (!targetRef) {
      print(`No veo '${targetName}' por aquí.`);
      scrollToBottom();
      return;
    }

    const targetObj = OBJECTS[targetRef];
    
    // Verificar si el objeto de destino está visible o es una pasarela
    const isTargetAccessible = (room.objetos && room.objetos.includes(targetRef) && !targetObj.oculto) ||
                              (targetObj.tipo === 'Pasarela' && room.salidas && room.salidas[targetRef]) ||
                              state.inventory.includes(targetRef);

    if (!isTargetAccessible) {
      print(`No puedes usar nada sobre '${targetObj.nombre}' porque no está accesible.`);
      scrollToBottom();
      return;
    }

    print(`Intentando usar ${obj.nombre} sobre ${targetObj.nombre}`);

    // CASO 1-A: OBJETO DE DESTINO TIENE requiere_obj
    if (Array.isArray(targetObj.requiere_obj)) {
      const faltan = targetObj.requiere_obj.filter(r => !state.inventory.includes(r));
      if (faltan.length) {
        print(`Para abrir ${targetObj.nombre} faltan: ${faltan.map(r => OBJECTS[r].nombre).join(', ')}.`);
      } else {
        let success = false;
        if (targetObj.tipo === 'Pasarela') {
          if (targetObj.bloqueada) {
            targetObj.bloqueada = false;
            success = true;
          }
        } else if (targetObj.oculto) {
          targetObj.oculto = false;
          success = true;
        }

        if (success) {
          print(`${targetObj.nombre} ahora accesible.`);
          // Consumir objetos de un solo uso
          targetObj.requiere_obj.forEach(requiredRef => {
            if (OBJECTS[requiredRef].one_use && state.inventory.includes(requiredRef)) {
              consumeObject(requiredRef);
            }
          });
        } else {
          print(`${targetObj.nombre} ya estaba accesible.`);
        }
      }
      scrollToBottom();
      return;
    }

    // CASO 1-B: OBJETO DE DESTINO TIENE SISTEMA DE ESTADOS
    // Objeto con descripciones_estado y estado_actual (sistema genérico de cambio de estado)
    if (targetObj.descripciones_estado && targetObj.estado_actual) {
      const currentState = targetObj.descripciones_estado[targetObj.estado_actual];
      
      // Si el estado actual tiene un estado siguiente y requisitos
      if (currentState && currentState.siguiente && currentState.necesita) {
        // Verificar si el objeto usado está entre los necesarios para la transición
        if (currentState.necesita.includes(ref)) {
          // Verificar si todos los demás objetos requeridos están en el inventario
          const faltantes = currentState.necesita
            .filter(r => r !== ref) // Excluir el objeto que estamos usando
            .filter(r => !state.inventory.includes(r)); // Ver qué falta
          
          if (faltantes.length === 0) {
            // Todos los requisitos cumplidos, realizar transición de estado
            const estadoAnterior = targetObj.estado_actual;
            targetObj.estado_actual = currentState.siguiente;
            
            // Mensaje de éxito
            print(`Has usado ${obj.nombre} correctamente sobre ${targetObj.nombre}.`);
            
            // Si hay nueva descripción, mostrarla
            const nuevoEstadoObj = targetObj.descripciones_estado[targetObj.estado_actual];
            if (nuevoEstadoObj && nuevoEstadoObj.descripcion) {
              print(`Ahora: ${nuevoEstadoObj.descripcion}`);
            }
            
            // Si el objeto usado es de un solo uso, consumirlo
            if (obj.one_use) {
              consumeObject(ref);
            }
            
            // CASO ESPECIAL: Si el objeto es SRV_DC01, sincronizar con puzzleStates para compatibilidad
            if (targetRef === 'SRV_DC01') {
              state.puzzleStates['SRV_DC01_estado'] = targetObj.estado_actual;
            }
            
            // CASO ESPECIAL: TRANSFORMACIÓN DE OBJETOS
            // Si el estado resultante debe crear un nuevo objeto
            if (nuevoEstadoObj && nuevoEstadoObj.crea_objeto) {
              const nuevoObjRef = nuevoEstadoObj.crea_objeto;
              if (OBJECTS[nuevoObjRef]) {
                if (!room.objetos) {
                  room.objetos = [];
                }
                if (!room.objetos.includes(nuevoObjRef)) {
                  room.objetos.push(nuevoObjRef);
                  OBJECTS[nuevoObjRef].oculto = false;
                  print(`Se ha creado: ${OBJECTS[nuevoObjRef].nombre}`);
                }
              }
            }
          } else {
            // Faltan requisitos
            const textoDeFaltantes = faltantes.map(r => OBJECTS[r].nombre).join(', ');
            print(`No puedes avanzar porque te faltan: ${textoDeFaltantes}`);
          }
        } else {
          print(`${obj.nombre} no es útil para este propósito.`);
        }
        scrollToBottom();
        return;
      }
    }

    // CASO 1-C: CREACIÓN GENÉRICA DE OBJETOS
    // Si el objeto actual se puede usar con este destino para crear algo nuevo
    if (obj.usable_con && obj.usable_con.includes(targetRef) && obj.crea_objeto) {
      const nuevoObjRef = obj.crea_objeto;
      
      // Verificar si el objeto ya existe en la sala o el inventario
      const objetoYaExiste = (room.objetos && room.objetos.includes(nuevoObjRef)) || 
                            state.inventory.includes(nuevoObjRef);
      
      if (!objetoYaExiste) {
        // Crear el nuevo objeto
        if (!room.objetos) {
          room.objetos = [];
        }
        room.objetos.push(nuevoObjRef);
        OBJECTS[nuevoObjRef].oculto = false;
        
        print(`Has creado: ${OBJECTS[nuevoObjRef].nombre}`);
        
        // Consumir objeto de origen si es de un solo uso
        if (obj.one_use) {
          consumeObject(ref);
        }
      } else {
        print(`Ya existe un ${OBJECTS[nuevoObjRef].nombre}.`);
      }
      scrollToBottom();
      return;
    }
    
    // Caso inverso: si el objeto destino puede usarse con este origen para crear algo
    if (targetObj.usable_con && targetObj.usable_con.includes(ref) && targetObj.crea_objeto) {
      const nuevoObjRef = targetObj.crea_objeto;
      
      // Verificar si el objeto ya existe
      const objetoYaExiste = (room.objetos && room.objetos.includes(nuevoObjRef)) || 
                            state.inventory.includes(nuevoObjRef);
      
      if (!objetoYaExiste) {
        // Crear el nuevo objeto
        if (!room.objetos) {
          room.objetos = [];
        }
        room.objetos.push(nuevoObjRef);
        OBJECTS[nuevoObjRef].oculto = false;
        
        print(`Has creado: ${OBJECTS[nuevoObjRef].nombre}`);
        
        // Consumir el objeto de origen si es de un solo uso
        if (obj.one_use) {
          consumeObject(ref);
        }
      } else {
        print(`Ya existe un ${OBJECTS[nuevoObjRef].nombre}.`);
      }
      scrollToBottom();
      return;
    }

    // Si llegamos aquí, es porque no hay una acción definida
    print(`Usar ${obj.nombre} sobre ${targetObj.nombre} no produce ningún efecto.`);
    scrollToBottom();
    return;
  }

  // CASO 2: USO DE UN OBJETO SIN TARGET (use X)
  
  // CASO 2-A: OBJETOS QUE REQUIEREN OTROS OBJETOS PARA FUNCIONAR
  if (obj.requiere_obj) {
    const faltan = obj.requiere_obj.filter(r => !state.inventory.includes(r));
    if (faltan.length) {
      print(`Para usar ${obj.nombre}, faltan: ${faltan.map(r => OBJECTS[r].nombre).join(', ')}.`);
    } else {
      let success = false;
      if (obj.tipo === 'Pasarela') {
        if (obj.bloqueada) {
          obj.bloqueada = false;
          success = true;
        }
      } else if (obj.oculto) {
        obj.oculto = false;
        success = true;
      }
      
      if (success) {
        print(`${obj.nombre} ahora accesible.`);
        // Consumir objetos de un solo uso
        obj.requiere_obj.forEach(requiredRef => {
          if (OBJECTS[requiredRef].one_use && state.inventory.includes(requiredRef)) {
            consumeObject(requiredRef);
          }
        });
      } else {
        print(`${obj.nombre} ya estaba accesible.`);
      }
    }
    scrollToBottom();
    return;
  }
  
  // CASO 2-B: OBJETOS QUE REQUIEREN CONTRASEÑA
  if (obj.requiere_pass) {
    const keys = Object.keys(obj.requiere_pass);
    state.pending = {
      ref, type: 'pass',
      keys, idx: 0,
      creds: obj.requiere_pass,
      inputs: {}
    };
    print(`Introduce ${keys[0]}:`);
    scrollToBottom();
    return;
  }
  
  // CASO 2-C: SISTEMAS INTERACTIVOS
  if (obj.sistema) {
    const dialog = obj.dialogues.find(d =>
      d.superado === false || !state.puzzleStates[d.superado]
    );

    saveCurrentNpcContext();
    state.currentNpcRef = ref;
    state.currentAiName = obj.nombre;
    state.currentSystemPrompt = dialog.system_prompt;
    loadNpcContext(ref);

    print(`\n--- Conectado a ${obj.nombre} ---`, 'game-message');
    print(`${obj.nombre}: ${dialog.saludo}`, 'ai-response');
    state.conversationHistory.push({ role: 'assistant', content: dialog.saludo });

    updatePrompt();
    scrollToBottom();
    if (window.depuracion) updateDebug();
    return;
  }
  
  // CASO 2-D: OBJETOS CON CONTENIDO DETALLE (DOCUMENTOS, MANUALES, ETC.)
  if (obj.contenido_detalle) {
    const titulo = obj.tipo === 'Nota' ? 'Contenido de la nota' : `Contenido de ${obj.nombre}`;
    print(`\n--- ${titulo} ---\n${obj.contenido_detalle}\n-------------------`);
    scrollToBottom();
    return;
  }

  // Si llegamos aquí, no hay un uso definido
  print(`No ocurre nada al usar ${obj.nombre}.`);
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
