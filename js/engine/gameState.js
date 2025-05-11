import { OBJECTS }  from '../data/objects.js';
import { ROOMS }    from '../data/rooms.js';
import { NPCS }     from '../data/npcs.js';

/* Estado vivo del juego --------------------------------------------------- */
export const state = {
  currentLocation : 'Aula_Teoria',
  inventory       : [],
  puzzleStates    : {},
  currentNpcRef   : null,
  currentAiName   : 'Sistema',
  currentSystemPrompt : 'Eres un narrador y sistema de ayuda...',
  conversationHistory : [],
  isWaitingForAI  : false,
  npcContexts     : {},           // Mapa refNpc → {history:[...]}
  pending: null    // { ref, type:'pass', keys:[…], idx, creds:{…} } o null
};

/* ----- Inicialización de puzzles ---------------------------------------- */
export function initializePuzzleStates(){
  const s = {};

  // Inicializamos estados de dispositivos
  for (const ref in OBJECTS){
    const obj = OBJECTS[ref];
    if (obj.tipo==='Dispositivo' && obj.estado) {
      s[`${ref}_estado`] = obj.estado;
    }
  }

  // Puzzles (hitos)
  s['raul_asked_sql'] = false;
  s['raul_gave_credentials'] = false;
  s['javier_passed'] = false;
  s['configuracion_switch'] = false;

  return s;
}

/* ----- Getter sencillos -------------------------------------------------- */
export const getRoom = ()       => ROOMS[state.currentLocation];
export const getObj  = ref      => OBJECTS[ref];
export const getNpc  = ref      => NPCS[ref];

/* ----- Reset completo ---------------------------------------------------- */
export function resetGame(){
  state.currentLocation     = 'Aula_Teoria';
  state.inventory           = [];
  state.puzzleStates        = initializePuzzleStates();
  state.currentNpcRef       = null;
  state.currentAiName       = 'Sistema';
  state.currentSystemPrompt = 'Eres un narrador y sistema de ayuda...';
  state.conversationHistory = [];
  state.npcContexts         = {};
}

/* ----- Contexto por NPC -------------------------------------------------- */
export function saveCurrentNpcContext(){
  if (state.currentNpcRef){
    state.npcContexts[state.currentNpcRef] = {
      history : [...state.conversationHistory]
    };
  }
}

export function loadNpcContext(npcRef){
  state.conversationHistory =
    state.npcContexts[npcRef]?.history || [];
}