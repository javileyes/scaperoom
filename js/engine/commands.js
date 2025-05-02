import { state, getRoom, getObj, getNpc,
    saveCurrentNpcContext, loadNpcContext } from './gameState.js';
import { OBJECTS }   from '../data/objects.js';
import { NPCS }      from '../data/npcs.js';
import { ROOMS }     from '../data/rooms.js';
import { print, updatePrompt } from './ui.js';
import { askLLM }    from './llm.js';
import { underscoresToSpaces, spacesToUnderscores } from '../utils/helpers.js';

/* ============ Helpers de búsqueda ======================================= */
function findRefByName(name, pool){
if(!name) return null;
const lower = name.toLowerCase();
const maybeRef = spacesToUnderscores(name);
if(pool[maybeRef]) return maybeRef;
for(const r in pool) if(pool[r]?.nombre?.toLowerCase()===lower) return r;
for(const r in pool) if(pool[r]?.nombre?.toLowerCase().includes(lower)) return r;
for(const r in pool) if(r.toLowerCase().includes(maybeRef.toLowerCase())) return r;
return null;
}

/* ============ Comandos básicos ========================================= */
export function showLocation(){
const room = getRoom();
print(`\n=== ${room.nombre} ===`,'location-title');
print(room.descripcion);

const objs = (room.objetos||[]).filter(r=>!state.inventory.includes(r)&&OBJECTS[r]?.tipo!=='Pasarela');
if(objs.length){print('\nObservas:'); objs.forEach(r=>print('  - '+OBJECTS[r].nombre));}

const npcs = room.npcs||[];
if(npcs.length){print('\nVes a:'); npcs.forEach(r=>print('  - '+NPCS[r].nombre));}

print('\nSalidas:');
for(const pas of Object.keys(room.salidas||{})){
const dest = room.salidas[pas].destino;
const blocked = state.puzzleStates[`${pas}_bloqueada`];
const stat = blocked?'[BLOQUEADA]':'';
print(`  - ${OBJECTS[pas].nombre} → ${ROOMS[dest].nombre} ${stat}`);
}
print('====================');
}

/* --- examine ----------------------------------------------------------- */
export function examine(name){
const room   = getRoom();
const search = {};
(room.objetos||[]).forEach(r=>search[r]=OBJECTS[r]);
(room.npcs  ||[]).forEach(r=>search[r]=NPCS[r]);

let ref = findRefByName(name,search);
if(!ref){
state.inventory.forEach(r=>search[r]=OBJECTS[r]);
ref = findRefByName(name,search);
}
if(!ref){ print(`No ves '${name}' por aquí.`); return; }

const data = search[ref];
const prefix = data.rol?'Observas a':'Examinas';
print(`${prefix} ${data.nombre}: ${data.descripcion}`);

if(data.tipo==='Pasarela' && state.puzzleStates[`${ref}_bloqueada`])
print(data.mensaje_bloqueo||'Parece bloqueada.');

if(data.tipo==='Dispositivo'){
const key = `${ref}_estado`;
if(state.puzzleStates[key]) print(`Estado actual: ${state.puzzleStates[key]}`);
if(state.puzzleStates[key]==='login_required' && data.mensaje_login)
 print(data.mensaje_login);
}

/* detalle nota */
if(ref==='Nota_Profesor'&&state.inventory.includes(ref))
print('\n--- Contenido ---\n'+data.contenido_detalle+'\n---------------');
}

/* --- take -------------------------------------------------------------- */
export function take(name){
const room = getRoom();
const ref = findRefByName(name, OBJECTS);
if(!ref||!room.objetos?.includes(ref)){ print(`No hay '${name}' aquí para coger.`);return; }
if(state.inventory.includes(ref)){ print('Ya lo tienes.');return; }

const obj = OBJECTS[ref];
if(!obj.recogible){ print(`No puedes coger ${obj.nombre}.`);return; }
state.inventory.push(ref);
print(`Recoges: ${obj.nombre}`);
}

/* --- use (cables y nota) ------------------------------------------------ */
export function use(objName,targetName){
const objRef = findRefByName(objName, Object.fromEntries(state.inventory.map(r=>[r,OBJECTS[r]])));
if(!objRef){ print(`No tienes '${objName}'.`);return; }

let targetRef=null; let room=getRoom();
if(targetName){
targetRef = findRefByName(targetName,Object.fromEntries((room.objetos||[]).map(r=>[r,OBJECTS[r]])));
if(!targetRef){ print(`No ves '${targetName}' aquí.`); return; }
}

print(`Intentando usar ${OBJECTS[objRef].nombre}`+
  (targetRef?` sobre ${OBJECTS[targetRef].nombre}`:'') );

/* cable ↔ servidor */
if(['Cable_Red_Suelto_En_Suelo','Cable_Red_Nuevo_Caja'].includes(objRef) && targetRef==='SRV_DC01'){
const k='SRV_DC01_estado';
if(state.puzzleStates[k]==='offline_disconnected'){
 state.puzzleStates[k]='offline_connected';
 print('Conectas el cable. La luz de red se vuelve verde.');
}else if(state.puzzleStates[k]==='offline_connected'){
 print('El servidor ya tiene cable.');
}else{
 print('No tiene efecto.');
}
return;
}

/* Nota – leerla */
if(objRef==='Nota_Profesor'&&!targetRef){
print('\n--- Contenido de la nota ---\n'+OBJECTS[objRef].contenido_detalle+'\n---------------------------');
return;
}

print('No ocurre nada.');
}

/* --- talk -------------------------------------------------------------- */
export async function talk(name){
const room = getRoom();
const npcRef = findRefByName(name,NPCS);
if(!npcRef||!room.npcs?.includes(npcRef)){ print(`No ves a '${name}' aquí.`);return; }

saveCurrentNpcContext();       // guardamos al que estábamos usando
state.currentNpcRef = npcRef;
state.currentAiName = NPCS[npcRef].nombre;
state.currentSystemPrompt = NPCS[npcRef].system_prompt;
loadNpcContext(npcRef);        // recupera historial

const saludo = NPCS[npcRef].saludo;
print(`\n--- Hablando con ${state.currentAiName} ---`,'location-title');
print(`${state.currentAiName}: ${saludo}`,'ai-response');

state.conversationHistory.push({role:'assistant',content:saludo});
updatePrompt();
}

/* --- solve (códigos / logins) ------------------------------------------ */
export function solve(str){
print(`Intentando resolver con '${str}'`);
let ok=false;

/* puertas */
const room=getRoom();
for(const p of Object.keys(room.salidas||{})){
if(state.puzzleStates[`${p}_bloqueada`] && OBJECTS[p].requiere_codigo===str){
 state.puzzleStates[`${p}_bloqueada`]=false;
 print(`¡Clic! ${OBJECTS[p].nombre} desbloqueada.`);
 ok=true;
}
}

/* terminal admin */
if(!ok && state.currentLocation==='Cuarto_Servidores' &&
state.puzzleStates['Terminal_Admin_estado']==='login_required'){
const [u,p] = str.split('/',2);
const [cu,cp] = OBJECTS['Terminal_Admin'].requiere_login;
if(u?.trim()===cu && p?.trim()===cp){
 state.puzzleStates['Terminal_Admin_estado'] = 'logged_in';
 print('¡Acceso concedido! Prompt C:\\>');
 ok=true;
}else{
 print('Usuario / contraseña incorrectos.');
 ok=true;
}
}

if(!ok) print('No parece resolver nada.');
}

/* --- movement ----------------------------------------------------------- */
function canLeaveAula(){
return state.puzzleStates['javier_passed'];
}

export function cross(name){
const room=getRoom();
const ref=findRefByName(name,Object.fromEntries(Object.keys(room.salidas||{}).map(p=>[p,OBJECTS[p]])));
if(!ref){ print(`No hay salida '${name}'.`);return; }

if(state.currentLocation==='Aula_Teoria' && !canLeaveAula()){
print('Javier se interpone: «Necesitas acertar 3 preguntas antes de salir».');
return;
}

if(state.puzzleStates[`${ref}_bloqueada`]){
print(OBJECTS[ref].mensaje_bloqueo||'Está bloqueada.');
return;
}
const dest=room.salidas[ref].destino;
moveTo(dest,OBJECTS[ref].nombre);
}

export function go(destName){
const destRef = findRefByName(destName,ROOMS); if(!destRef){ print('Lugar desconocido.');return; }
const room=getRoom();
for(const p in room.salidas){
if(room.salidas[p].destino===destRef && !state.puzzleStates[`${p}_bloqueada`]){
 cross(p); return;
}
}
print('No hay un camino abierto hasta allí.');
}

/* --- mover -------------------------------------------------------------- */
export function moveTo(destRef,via=''){
if(!ROOMS[destRef]){ print('Destino desconocido.');return; }
saveCurrentNpcContext();

if(via) print(`Cruzas por ${via}…`);
state.currentLocation = destRef;
state.currentNpcRef   = null;
state.currentAiName   = 'Sistema';
state.currentSystemPrompt = 'Eres un narrador...';
state.conversationHistory = [];
showLocation();
updatePrompt();
}

/* ============ Entrada de texto principal =============================== */
export async function process(raw){
const cmd = raw.trim(); if(!cmd) return;
print('> '+cmd,'player-input');

/* comandos barra ------------------------------------------------------- */
if(cmd==='/exit'){ window.close(); return; }
if(cmd==='/look'){ showLocation(); return; }
if(cmd==='/help'){ /* imprimir ayuda */ print(
`Comandos:
/look          – describir sala
/go <lugar>    – ir a una sala conectada
/cross <salida>– cruzar por pasarela concreta
/examine <obj> – examinar algo
/take <obj>    – coger objeto
/use <obj> [on <dest>] – usar
/talk <npc>    – hablar con alguien
/solve <text>  – resolver puzzle
/inventory     – inventario
/exit          – cerrar pestaña`, 'game-message'); return; }
if(cmd==='/inventory'){ if(!state.inventory.length) print('Inventario vacío.');
else{print('Llevas:');state.inventory.forEach(r=>print('  - '+OBJECTS[r].nombre));}
return;}

if(cmd.startsWith('/examine ')){ examine(cmd.slice(9)); return; }
if(cmd.startsWith('/take ')){ take(cmd.slice(6)); return; }
if(cmd.startsWith('/use ')){
const [obj,dest] = cmd.slice(5).split(' on ');
use(obj.trim(),dest?.trim()); return;
}
if(cmd.startsWith('/talk ')){ talk(cmd.slice(6)); return; }
if(cmd.startsWith('/solve ')){ solve(cmd.slice(7)); return; }
if(cmd.startsWith('/go ')){ go(cmd.slice(4)); return; }
if(cmd.startsWith('/cross ')){ cross(cmd.slice(7)); return; }

/* --- diálogo ----------------------------------------------- */
const talkingToRaul   = state.currentNpcRef==='Tecnico_Estresado';
const talkingToJavier = state.currentNpcRef==='Javier_ProfesorRedes';

/* respuesta al quiz SQL de Raúl ------------------------------ */
if(talkingToRaul && state.puzzleStates['raul_asked_sql'] &&
!state.puzzleStates['raul_gave_credentials']){
const low=cmd.toLowerCase();
if(low.includes('select')&&low.includes('nombre')&&low.includes('from')&&
  low.includes('empleados')&&low.includes('where')&&low.includes('departamento')&&
  low.includes('sistemas')){
 const msg="¡Correcto! Las credenciales son 'admin' y 'password123'.";
 print(`Técnico Estresado: ${msg}`,'ai-response');
 state.puzzleStates['raul_gave_credentials']=true;
}else{
 print('Técnico Estresado: No, así no es…','ai-response');
}
state.puzzleStates['raul_asked_sql']=false;
return;
}

/* llamada LLM ------------------------------------------------ */
const llmAnswer = await askLLM(cmd);

/* detectar si Raúl acaba de plantear la pregunta SQL ---------- */
if(talkingToRaul && !state.puzzleStates['raul_asked_sql'] &&
!state.puzzleStates['raul_gave_credentials'] &&
llmAnswer.toLowerCase().includes('consulta sql')){
state.puzzleStates['raul_asked_sql']=true;
}

/* detectar hito de Javier ------------------------------------ */
if(talkingToJavier && !state.puzzleStates['javier_passed'] &&
llmAnswer.includes('/hito preguntas_teoría superado')){
state.puzzleStates['javier_passed']=true;
print('Se oye un clic: la puerta del aula queda libre.');
}
}