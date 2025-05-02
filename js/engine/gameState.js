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
  npcContexts     : {}           // Mapa refNpc → {history:[...]}
};

/* ----- Inicialización de puzzles ---------------------------------------- */
export function initializePuzzleStates(){
  const s = {};

  for (const ref in OBJECTS){
    const obj = OBJECTS[ref];
    if (obj.tipo==='Pasarela' && obj.bloqueada) s[`${ref}_bloqueada`] = true;
    if (obj.tipo==='Dispositivo' && obj.estado) s[`${ref}_estado`] = obj.estado;
  }

  s['raul_asked_sql'] = false;
  s['raul_gave_credentials'] = false;
  s['javier_passed'] = false;

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