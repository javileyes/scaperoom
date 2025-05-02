/* Funciones de uso general en todo el proyecto */
export const escapeHtml = txt =>
    txt.replace(/&/g,"&amp;")
       .replace(/</g,"&lt;")
       .replace(/>/g,"&gt;")
       .replace(/"/g,"&quot;")
       .replace(/'/g,"&#39;");
  
  export const underscoresToSpaces  = txt => txt?.replace(/_/g, ' ') || '';
  export const spacesToUnderscores  = txt => txt?.replace(/\s+/g, '_') || '';
  
  /* Convierte CR/LF a <br> para insertar en innerHTML seguro */
  export const nl2br = txt => escapeHtml(txt).replace(/\n/g,'<br>');