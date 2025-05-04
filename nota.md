# Para luego poder ejecutar cliente sin servidor http hacer un rollup:

```bash
npx rollup js/main.js --file build/bundle.js --format=iife
```

# Para ejecutar el proceso servidor web y el proceso servidor llama_cpp para el LLM
sudo python -m http.server 80
./run_qwen3_server.sh

# Para abrir tuneles inversos en VPS, si http server esta en localhost en 80 y el LLM de llama_cpp en 8000.

ssh -R 9011:localhost:80 asir
ssh -R 9012:localhost:8000 asir

en navegador ir a: http://asir.javiergimenez.es:9011

El LLM estará en http://asir.javiergimenez.es:9012