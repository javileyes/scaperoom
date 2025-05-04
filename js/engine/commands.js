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
import { print, updatePrompt, scrollToBottom } from './ui.js';
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
    const blocked = state.puzzleStates[`${pas}_bloqueada`];
    const stat    = blocked ? '[BLOQUEADA]' : '';
    print(
      `  - ${OBJECTS[pas].nombre} → ${ROOMS[dest].nombre} ${stat}`
    );
  }

  print('====================');
  scrollToBottom();
}


/* --- examine ----------------------------------------------------------- */
export function examine(name) {
  const room   = getRoom();
  const search = {};

  // sumar objetos de sala, NPCs y inventario
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

  // contenido_detalle genérico
  if (data.contenido_detalle) {
    print('\n--- Detalle ---');
    print(data.contenido_detalle);
    print('----------------');
  }

  // descubrir contenidos ocultos
  if (Array.isArray(data.contenidos)) {
    data.contenidos.forEach(oRef => {
      if (OBJECTS[oRef].oculto) {
        OBJECTS[oRef].oculto = false;
        if (!room.objetos.includes(oRef)) {
          room.objetos.push(oRef);
        }
        print(
          `Al examinar ${data.nombre}, encuentras: ` +
          `${OBJECTS[oRef].nombre}.`
        );
      }
    });
  }

  // mensaje si pasarela bloqueada
  if (data.tipo === 'Pasarela' &&
      state.puzzleStates[`${ref}_bloqueada`]) {
    print(data.mensaje_bloqueo || 'Parece bloqueada.');
  }

  // estado de dispositivos
  if (data.tipo === 'Dispositivo') {
    const key = `${ref}_estado`;
    if (state.puzzleStates[key]) {
      print(`Estado actual: ${state.puzzleStates[key]}`);
    }
    if (state.puzzleStates[key] === 'login_required' &&
        data.mensaje_login) {
      print(data.mensaje_login);
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

  // configuración Switch Cisco
  if (!targetName &&
      (objName.toLowerCase().includes('switch') ||
       spacesToUnderscores(objName) === 'Switch_Cisco') &&
      room.objetos?.includes('Switch_Cisco')) {

    saveCurrentNpcContext();
    state.currentNpcRef       = 'Switch_Cisco';
    state.currentAiName       = 'Switch Cisco';
    state.currentSystemPrompt = `Eres un Switch Cisco IOS. \
Compórtate estrictamente como un switch Cisco IOS, empezando \
desde el terminal en modo no privilegiado. "Help" o "?" son \
los comandos de ayuda. Sólo muestra comandos de navegación \
(enable, exit, configure) y de VLAN/interfaces. \
IMPORTANTE: Al configurar VLAN 10 para "alumnos" en puertos 1–20 \
y VLAN 20 para "profesores" en puertos 21–24, \
debes emitir "/hito configuración_switch superado".`;

    state.conversationHistory = [];
    print('\n--- Entras en modo configuración del Switch Cisco IOS ---', 'game-message');
    updatePrompt();
    scrollToBottom();
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

  if (!npcRef || !room.npcs?.includes(npcRef)) {
    print(`No ves a '${name}' aquí.`);
    return;
  }

  saveCurrentNpcContext();
  state.currentNpcRef       = npcRef;
  state.currentAiName       = NPCS[npcRef].nombre;
  state.currentSystemPrompt = NPCS[npcRef].system_prompt;
  loadNpcContext(npcRef);

  const saludo = NPCS[npcRef].saludo;
  print(`\n--- Hablando con ${state.currentAiName} ---`, 'location-title');
  print(`${state.currentAiName}: ${saludo}`, 'ai-response');

  state.conversationHistory.push({ role: 'assistant', content: saludo });
  updatePrompt();
}


/* --- solve (códigos / logins) ------------------------------------------ */
export function solve(str) {
  print(`Intentando resolver con '${str}'`);
  let ok = false;

  // abrir puertas
  const room = getRoom();
  for (const p of Object.keys(room.salidas || {})) {
    if (
      state.puzzleStates[`${p}_bloqueada`] &&
      OBJECTS[p].requiere_codigo === str
    ) {
      state.puzzleStates[`${p}_bloqueada`] = false;
      print(`¡Clic! ${OBJECTS[p].nombre} desbloqueada.`);
      ok = true;
    }
  }

  // terminal admin
  if (
    !ok &&
    state.currentLocation === 'Cuarto_Servidores' &&
    state.puzzleStates['Terminal_Admin_estado'] === 'login_required'
  ) {
    const [u, p]         = str.split('/', 2);
    const [cu, cp]       = OBJECTS['Terminal_Admin'].requiere_login;
    if (u?.trim() === cu && p?.trim() === cp) {
      state.puzzleStates['Terminal_Admin_estado'] = 'logged_in';
      print('¡Acceso concedido! Prompt C:\\>');
      ok = true;
    } else {
      print('Usuario / contraseña incorrectos.');
      ok = true;
    }
  }

  if (!ok) print('No parece resolver nada.');
  scrollToBottom();
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

  if (state.puzzleStates[`${ref}_bloqueada`]) {
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
      !state.puzzleStates[`${p}_bloqueada`]
    ) {
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
  print('> ' + cmd, 'player-input');

  // modo configuración Switch Cisco
  if (
    !cmd.startsWith('/') &&
    state.currentNpcRef === 'Switch_Cisco'
  ) {
    const llmAnswer = await askLLM(cmd);
    if (
      !state.puzzleStates['configuracion_switch'] &&
      llmAnswer.includes('/hito configuración_switch superado')
    ) {
      state.puzzleStates['configuracion_switch'] = true;
      print('Switch Cisco: Configuración aceptada.', 'ai-response');
      scrollToBottom();
    }
    return;
  }

  // auto-talk
  if (!cmd.startsWith('/')) {
    const room = getRoom();
    const npcs = room.npcs || [];

    if (npcs.length > 1) {
      print(
        'hay varias personas en la habitación, usa /talk [persona] para hablar',
        'game-message'
      );
      return;
    }

    if (npcs.length === 1) {
      const npcRef = npcs[0];
      saveCurrentNpcContext();
      state.currentNpcRef       = npcRef;
      state.currentAiName       = NPCS[npcRef].nombre;
      state.currentSystemPrompt = NPCS[npcRef].system_prompt;
      loadNpcContext(npcRef);

      print(
        `\n--- Hablando con ${state.currentAiName} ---`,
        'location-title'
      );
      updatePrompt();

      const llmAnswer = await askLLM(cmd);
      if (
        state.currentNpcRef === 'Javier_ProfesorRedes' &&
        !state.puzzleStates['javier_passed'] &&
        llmAnswer.includes('/hito preguntas_teoría superado')
      ) {
        state.puzzleStates['javier_passed'] = true;
        print('Se oye un clic: la puerta del aula queda libre.');
        scrollToBottom();
      }
      return;
    }

    print('no hay nadie con quien hablar en la sala', 'game-message');
    scrollToBottom();
    return;
  }

  // comandos con '/'
  if (cmd.startsWith('/look ')) {
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
/solve <texto> – resolver puzzle
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
  if (cmd.startsWith('/solve ')) {
    solve(cmd.slice(7));
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