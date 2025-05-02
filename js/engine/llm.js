import { state }         from './gameState.js';
import { ui, print }     from './ui.js';

const LLM_URL = "http://localhost:8000/v1/chat/completions";

/* Llamada stream a LM-Studio ------------------------------------------------ */
export async function askLLM(userInput){

  if(state.isWaitingForAI) return;
  state.isWaitingForAI = true;
  ui.inputFld.disabled = true;

  const messages = [
    {role:'system', content: state.currentSystemPrompt},
    ...state.conversationHistory,
    {role:'user',   content: userInput + '/no_think'}
  ];

  /* Prepara línea para stream --------------------------------------------- */
  const line = document.createElement('div');
  line.classList.add('output-line','ai-response');
  line.innerHTML = `${state.currentAiName}: `;
  ui.outputDiv.appendChild(line); ui.outputDiv.scrollTop = ui.outputDiv.scrollHeight;

  let full = '';

  try{
    const res = await fetch(LLM_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        model:'qwen3-api',messages,temperature:0.7,max_tokens:1000,stream:true
      })
    });
    if(!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const reader = res.body.getReader(); const decoder = new TextDecoder();
    let buffer='';

    for(;;){
      const {value,done} = await reader.read();
      if(done) break;
      buffer += decoder.decode(value,{stream:true});
      let idx;
      while((idx = buffer.indexOf('\n\n')) !== -1){
        const chunk = buffer.slice(0,idx); buffer = buffer.slice(idx+2);
        if(!chunk.startsWith('data:')) continue;
        const data = chunk.slice(5).trim();
        if(data==='[DONE]') { buffer=''; break; }
        const delta = JSON.parse(data).choices?.[0]?.delta;
        if(delta?.content){
          const t = delta.content;
          line.innerHTML += t.replace(/\n/g,'<br>');
          ui.outputDiv.scrollTop = ui.outputDiv.scrollHeight;
          full += t;
        }
      }
    }
  }catch(e){
    print(`Error LLM: ${e.message}`,'error-message');
    full = '[Error LLM]';
  }finally{
    ui.inputFld.disabled = false; ui.inputFld.focus();
    state.isWaitingForAI = false;

    /* Guardar en historial ------------------------------------------------- */
    state.conversationHistory.push({role:'user',content:userInput});
    state.conversationHistory.push({role:'assistant',content:full});
    while(state.conversationHistory.length > 10)
      state.conversationHistory.shift();
  }

  return full;        // para post-procesado (Raúl / Javier)
}