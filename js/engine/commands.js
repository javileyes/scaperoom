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
  print(`${prefix} ${data.nombre}: ${data.descripcion}`);

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
  const ref  = findRefByName(name, OBJECTS);

  if (!ref || !room.objetos?.includes(ref)) {
    print(`No hay '${name}' aquí para coger.`);
    return;
  }
  if (state.inventory.includes(ref)) {
    print('Ya lo tienes.');
    return;
  }

  const obj = OBJECTS[ref];
  if (!obj.recogible) {
    print(`No puedes coger ${obj.nombre}.`);
    scrollToBottom();
    return;
  }

  state.inventory.push(ref);
  print(`Recoges: ${obj.nombre}`);
  scrollToBottom();
}


/* --- use (cables, nota, dispositivos IOS) ----------------------------- */
export function use(objName, targetName) {
  const room = getRoom();
  const ref  = findRefByName(objName, OBJECTS);
  const obj  = OBJECTS[ref];

  // ── if “use X on Y” y Y.requiere_obj ───────────────────────────
  if (targetName) {
    const tRef = findRefByName(targetName, OBJECTS);
    if (tRef) {
      const tObj = OBJECTS[tRef];
      if (Array.isArray(tObj.requiere_obj)) {
        const faltan = tObj.requiere_obj.filter(r => !state.inventory.includes(r));
        if (faltan.length) {
          print(
            `Para abrir ${tObj.nombre} faltan: ` +
            `${faltan.map(r => OBJECTS[r].nombre).join(', ')}.`
          );
        } else {
          if (tObj.tipo === 'Pasarela') {
            state.puzzleStates[`${tRef}_bloqueada`] = false;
          } else {
            tObj.oculto = false;
          }
          print(`${tObj.nombre} ahora accesible.`);
        }
        scrollToBottom();
        return;
      }
    }
  }

  // 1) Caso requiere_obj (en el caso de que no haya targetName)
  
  if (!targetName && obj?.requiere_obj) {
    const faltan = obj.requiere_obj.filter(r=>!state.inventory.includes(r));
    if (faltan.length) {
      print(
        `Faltan: ${faltan.map(r=>OBJECTS[r].nombre).join(', ')}.`
      );
    } else {
      // abrir
      if (obj.tipo==='Pasarela')
        state.puzzleStates[`${ref}_bloqueada`] = false;
      else
        obj.oculto = false;
      print(`${obj.nombre} ahora accesible.`);
    }
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

  // parámetros básicos
  const objRef = findRefByName(
    objName,
    Object.fromEntries(state.inventory.map(r => [r, OBJECTS[r]]))
  );
  if (!objRef) {
    print(`No tienes '${objName}'.`);
    scrollToBottom();
    return;
  }

  let targetRef = null;
  if (targetName) {
    targetRef = findRefByName(
      targetName,
      Object.fromEntries((room.objetos || []).map(r => [r, OBJECTS[r]]))
    );
    if (!targetRef) {
      print(`No ves '${targetName}' aquí.`);
      return;
    }
  }

  print(
    `Intentando usar ${OBJECTS[objRef].nombre}` +
    (targetRef ? ` sobre ${OBJECTS[targetRef].nombre}` : '')
  );

  // conexiones de cables a servidor
  if (
    ['Cable_Red_Suelto_En_Suelo', 'Cable_Red_Nuevo_Caja']
      .includes(objRef) &&
    targetRef === 'SRV_DC01'
  ) {
    const key = 'SRV_DC01_estado';
    if (state.puzzleStates[key] === 'offline_disconnected') {
      state.puzzleStates[key] = 'offline_connected';
      print('Conectas el cable. La luz de red se vuelve verde.');
    } else if (state.puzzleStates[key] === 'offline_connected') {
      print('El servidor ya tiene cable.');
    } else {
      print('No tiene efecto.');
    }
    scrollToBottom();
    return;
  }

  // leer nota
  if (objRef === 'Nota_Profesor' && !targetRef) {
    print(
      '\n--- Contenido de la nota ---\n' +
      OBJECTS[objRef].contenido_detalle +
      '\n---------------------------'
    );
    scrollToBottom();
    return;
  }

  // manual Cisco
  if (objRef === 'Manual_Cisco' && !targetRef) {
    print('\n' + OBJECTS[objRef].contenido_detalle);
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
