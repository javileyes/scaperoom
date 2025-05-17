/* Objetos — sin cambios salvo posibles recortes en descripción */
export const OBJECTS = {
    /* Pasarelas -------------------------------------------------- */
    Puerta_Aula_Servidores: {
      tipo: 'Pasarela',
      nombre: 'Puerta Aula-Servidores',
      descripcion: 'Puerta metálica gris con teclado numérico.',
      // bloqueada ahora solo en state.puzzleStates
      requiere_pass: { codigo: '255.255.255.192' },
      bloqueada: true,
      hito_requerido: 'javier_passed',
      mensaje_hito_requerido: 'Javier se interpone, habla con Javier para que te deje pasar.'
    
    },


    Puerta_Oraculo: {
      tipo: 'Pasarela',
      nombre: 'Puerta del Oráculo',
      descripcion: 'Puerta metálica gris con teclado numérico.',
      bloqueada: true,
      requiere_pass: { codigo: 'Mendoza' },
      // bloqueada ahora solo en state.puzzleStates
      // bloqueada: true,
      hito_requerido: 'misterio_acertijo',
      mensaje_hito_requerido: 'Una voz fantasmagórica se escucha cerca del portal: "habla conmigo! Debes descubrir un misterio!! y tendrás mi permiso espiritual para salir".',
    },
  
    Puerta_Aula_Taller:{tipo:'Pasarela',nombre:'Puerta Aula-Taller',
      descripcion:'Puerta de madera standard.',bloqueada:false,
      hito_requerido: 'javier_passed',
      mensaje_hito_requerido: 'Javier se interpone, habla con Javier para que te deje pasar.'
    },
  
    Conexion_Taller_Redes:{tipo:'Pasarela',nombre:'Conexión Taller-Redes',
      descripcion:'Hueco improvisado que conecta con la sala de al lado.',
      bloqueada:false},
  
    /* Decoraciones, dispositivos, items -------------------------- */
    Pizarra_Blanca:{tipo:'Decoracion',nombre:'Pizarra Blanca',
      descripcion:`Hay un plano del Departamento de Informática:
        +------------------------+                       ººººººººººººº
        |  Cuarto de Servidores  |===(p. del oráculo)=== º  SALIDA   º
        +------------------------+                       ººººººººººººº
                  ||
        (Puerta. Aula-Servidores [bloqueada])
                  ||
        +------------------------+
        |     Aula de Teoría     | === (P. Aula-Taller) === +------------------------+
        +------------------------+                          |   Taller de Hardware   |
                                                            +------------------------+
                                                                      ||
                                                            (Conex. Taller-Redes)
                                                                      ||
                                                            +------------------------+
                                                            |      Zona de Redes     |
                                                            +------------------------+`},
  
    Proyector_Techo:{tipo:'Decoracion',nombre:'Proyector del Techo',
      descripcion:'Un proyector multimedia estándar.'},
  
    Mesa_Profesor:{
      tipo:'Decoracion',
      nombre:'Mesa del Profesor',
      descripcion:'Mesa grande con papeles y una nota solitaria.',
      contenidos:['Nota_Profesor']
    },
    Nota_Profesor:{
      tipo:'Item',
      recogible:true,
      nombre:'Nota del Profesor',
      descripcion:'Un post-it amarillo.',
      contenido_detalle:
        'Recordatorio: la contraseña de la puerta de servidores es la máscara /26 en formato estándar.',
    },

    Nota_enigma:{
      tipo:'Item',
      recogible:true,
      nombre:'Nota del Enigma',
      descripcion:'Una nota de tamaño cuartilla.',
      contenido_detalle:
        `
        El enigma es descubir quien es el asesino de un cluedo:
A partir de seis sospechosos con varios atributos booleanos (1 = verdadero, 0 = falso), las pistas del inspector son estas proposiciones:
	1.	El culpable es zurdo.
	2.	Ama el jazz.
	3.	No tiene coartada.
	4.	Fuma en pipa o lleva sombrero (exclusiva: exactamente uno de los dos).
  Pista: usa la consulta SQL para averiguarlo.
  para ver las tablas de la base de datos:
  SELECT table_name FROM user_tables;  
  `,
    },

    Rack_Principal:{tipo:'Decoracion',nombre:'Rack Principal',
      descripcion:'Rack de 19" con servidores y switches.',
      contenido_detalle:
      'Un poxit pegado en el lateral tiene escrito "Red de la sala: 10.0.0.0/16. Los servidores tienen las últimas IPs. Credenciales ordenador de Torre -> user: quesada, password:macarena123"',

    },
  
    Mesa_Trabajo_1:{tipo:'Decoracion',nombre:'Mesa de Trabajo',
      descripcion:'Herramientas y componentes de PC esparcidos.'},
  
    Caja_Herramientas: {
      tipo: 'Decoracion',
      nombre: 'Caja de Herramientas',
      descripcion: 'Destornilladores, alicates, crimpadora y otras herramientas.',
      contenidos: ['Bobina_Cable', 'Alicates', 'Crimpadora', 'Pelacables', 'Conectores_RJ45'],
      hito_requerido: 'configuracion_switch',
      mensaje_hito_requerido: 'Emilio dice: oye deja mis cosas, solo los buenos alumnos pueden coger mis cosas.'
    },

    // Herramientas y materiales para fabricar el cable
    Bobina_Cable: {
      tipo: 'Item',
      recogible: true,
      nombre: 'Bobina de Cable RJ-45 UTP Cat6',
      descripcion: 'Carrete de cable de red profesional, suficiente para varios metros.',
      usable_con: ['Alicates'],
      crea_objeto: 'Trozo_Cable_UTP' // Añadido: indica qué objeto se crea al usarla con Alicates
    },
    
    Alicates: {
      tipo: 'Item',
      recogible: true,
      nombre: 'Alicates',
      descripcion: 'Herramientas para cortar cables y otros materiales.',
    },
    
    Crimpadora: {
      tipo: 'Item',
      recogible: true,
      nombre: 'Crimpadora',
      descripcion: 'Herramienta especializada para prensar conectores RJ-45.',
    },
    
    Pelacables: {
      tipo: 'Item',
      recogible: true,
      nombre: 'Pelacables',
      descripcion: 'Herramienta con cuchilla especial para quitar recubrimiento de cables sin dañar los hilos.',
    },
    
    Conectores_RJ45: {
      tipo: 'Item',
      recogible: true,
      nombre: 'Conectores RJ-45',
      descripcion: 'Pequeña bolsa con conectores transparentes para terminar cables de red.',
    },
    
    // Etapa 1: Cable recién cortado
    Trozo_Cable_UTP: {
      tipo: 'Item',
      recogible: true,
      nombre: 'Trozo de Cable UTP',
      descripcion: 'Cable de red recién cortado de la bobina, con el revestimiento exterior intacto.',
      transforma_con: 'Pelacables',
      transforma_en: 'Trozo_Cable_UTP_Pelado'
    },
    
    // Etapa 2: Cable pelado
    Trozo_Cable_UTP_Pelado: {
      tipo: 'Item',
      recogible: true,
      nombre: 'Trozo de Cable UTP Pelado',
      descripcion: 'Cable de red con los extremos pelados, mostrando los pares de hilos de cobre trenzados.',
      transforma_con_todos: ['Crimpadora', 'Conectores_RJ45'], // Requiere ambos objetos
      transforma_en: 'Latiguillo_Red_Terminado'
    },
    
    // Etapa 3: Cable terminado (final)
    Latiguillo_Red_Terminado: {
      tipo: 'Item',
      recogible: true,
      nombre: 'Latiguillo de Red Terminado',
      descripcion: 'Latiguillo de red UTP Cat6 terminado, con conectores RJ-45 en ambos extremos, listo para usar.',
      one_use: true // Se consume al usarlo con el servidor
    },
  
    Armario_Rack:{tipo:'Decoracion',nombre:'Armario Rack',
      descripcion:'Contiene switches, routers y patch-panels.'},
  
  /* … */
  Switch_Cisco: {
    tipo:    'Dispositivo',
    nombre:  'Switch Cisco',
    descripcion:
      'Switch Cisco con un pequeño portatil conectado a modo de consola CLI IOS.',
    sistema: true,

    // ── definimos diálogos como en npc.js ──────────────────
    dialogues: [
      {
        // mientras puzzleStates['configuracion_switch']==false, éste es el diálogo activo
        superado: 'configuracion_switch',
        system_prompt: `Eres un Switch Cisco IOS. 
Compórtate estrictamente como un switch Cisco IOS configurado por defecto y sin contraseñas, empezando 
desde el terminal en modo no privilegiado. 
Sé minimalista, por cada comando que escriba el usuario responderás únicamente con la salida del comando pedido. 
Solo ejecuta el comando que el usario te pida (ninguno más).
El comando de ayuda es "?" o "help" solo imprimirá los comandos disponibles en el nivel actual.
IMPORTANTE: Al configurar VLAN 10 para "alumnos" en puertos 1–20 
y VLAN 20 para "profesores" en puertos 21–24, 
debes emitir "/hito configuracion_switch superado". 
Intenta simplificar el número de comandos, los más importantes para realizar la tarea encomendada. 
(enable, exit, configure) y de VLAN/interfaces. `,
        saludo: 'Consola IOS lista. help o ? para ayuda.'
      },
      {
        // tras superar el hito aparece este diálogo
        superado: false,
        system_prompt: `Eres un Switch Cisco IOS, estás perfectamente configurado. 
        Comportate extrictamente como un switch Cisco IOS configurado por defecto y sin contraseñas, empezando desde el terminal en modo no privilegiado.
        tienes una VLAN 10 para "alumnos" en puertos 1–20  y VLAN 20 para "profesores" en puertos 21–24`,
        saludo: 'NOTA: La configuración de VLAN está OK, mejor no tocar nada.'
      }
    ],

    // el map de hitos funciona idéntico al de NPCS
    milestones: {
      '/hito configuracion_switch superado': 'configuracion_switch'
    }
  },
  /* … resto de OBJECTS … */
  
  
    Patch_Panel:{tipo:'Decoracion',nombre:'Patch-Panel',
      descripcion:'Panel con decenas de RJ-45 etiquetados.'},
  
    
    Servidor_oracle: {
      tipo: 'Dispositivo',
      nombre: 'Servidor Oracle',
      descripcion: 'Servidor en rack Oracle versión 11g.',
    },
    

    Ordenador_torre: {
      tipo: 'Dispositivo',
      sistema: true,
      nombre: 'Viejo ordenador de Torre',
      descripcion_base: 'Vieja torre con monitor CRT',
      estado_actual: 'offline_disconnected',
      descripciones_estado: {
        'offline_disconnected': {
          descripcion: 'Torre con luz roja parpadeando en la tarjeta de red.',
          siguiente: 'online_disconnected',
          necesita: ['Latiguillo_Red_Terminado'], // Requiere el latiguillo para conectarse
        },
        'online_disconnected': {
          descripcion: 'Torre con tarjeta con luz verde.',
          siguiente: 'online',      
        }
      },
      estado_requerido: 'online_disconnected', // TODO: Cambiar a 'online_connected' para que funcione
      mensaje_estado_requerido: 'El ordenador no está conectado físicamente a la red, debes primero conectarlo con un latiguillo de red.',
      // mensaje_hito_requerido: 'El ordenador no está conectado a la red, primero debes conectarlo.',
      requiere_pass: { usuario: 'quesada', password: 'macarena123' },
          // ── definimos diálogos como en npc.js ──────────────────
    dialogues: [
      {
        // mientras puzzleStates['configuracion_switch']==false, éste es el diálogo activo
        superado: 'configuracion_correcta',
        system_prompt: `Eres un  ordenador con un sistema operativo linux.
Compórtate estrictamente como un ordenador con un sistema operativo linux, Ya has sido logueado como "quesada".
Tu configuración de red es erronea y no puedes acceder a la red. Tu IP y máscara es 192.168.1.10/24.
COMPORTATE ESTRICTAMENTE COMO UN ORDENADOR CON UN SISTEMA OPERATIVO LINUX sin dar información adicional, si el usuario escribe algo que no sea un comando de linux simplemente responde "comando no encontrado". 
Sé muy escueto y directo, imprime muy poco texto en comandos de ayuda y no des explicaciones.
NOTA: El uso correcto del comando "ip" será algo parecido a: "ip addr show" para mostrar configuración interfaces y "ip addr [ip/máscara] dev [interfaz]" para cambiar configuración. 
IMPORTANTE: Si el usuario cambia la IP y la máscara a una compatible con 10.0.0.0/16 escribirás exactamente "/hito configuracion_correcta superado".`,
        saludo: 'Pista: Umm... Parece que la configuración de red está mal intentaré usar el comando "ip addr" para ver configuración y cambiarla.'
      },
      {
        // mientras puzzleStates['configuracion_switch']==false, éste es el diálogo activo
        superado: 'ip_servidor_encontrada',
        system_prompt: `Eres un  ordenador con un sistema operativo linux.
Compórtate estrictamente como un ordenador con un sistema operativo linux, Ya has sido logueado como "quesada".
COMPORTATE ESTRICTAMENTE COMO UN ORDENADOR CON UN SISTEMA OPERATIVO LINUX sin dar información adicional, si el usuario escribe algo que no sea un comando de linux simplemente responde "comando no encontrado". 
Sé muy escueto y directo, imprime muy poco texto en comandos de ayuda y no des explicaciones.
IMPORTANTE: La IP del servidor Oracle es: 10.0.255.254 si consigues hacer ping a esta IP debes escribir "/hito ip_servidor_encontrada superado"`,
        saludo: 'Pista: Ahora tenemos que averiguar cual es la ip del servidor Oracle, podríamos usar ping".'
      },      
      {
        // tras superar el hito aparece este diálogo
        superado: 'acceso_base_datos',
        conservarDialogo: false,
        system_prompt: `Eres un ordenador con sistema operativo linux.
El usauario para acceder a la base de datos Oracle del departamento, con esquema "enigma" y contraseña "crimen" deberá ejecutar el siguiente comando:
"sqlplus enigma/crimen@//10.0.255.254:6666/xe" si pone mal la IP o el puerto o el usuario o contraseña dará un error de acceso.
IMPORTANTE: Si el usuario configura bien los parámetros de conexión escribirás exactamente "/hito acceso_base_datos superado".`,
        saludo: `Pista: Ahora vamos a conectarnos a la base de datos, usaremos comando: 
        sqlplus usuario/contraseña@//host:puerto/servicio`
      },
      {
        // tras superar el hito aparece este diálogo
        superado: false,
        conservarDialogo: false,
        system_prompt: `Eres un ordenador que está ejecutando un cliente sql.
        Comportate estrictamente como un ordenador con un cliente sql de Oracle.
        IMPORTANTE: COMPORTATE ESTRICTAMENTE COMO UN CLIENTE SQL DE ORACLE sin dar información adicional, si el usuario escribe algo que no sea un comando de sql simplemente responde "comando no encontrado".
        Estas son tus tablas:
        -- Creación de la base de datos del misterio del museo
-- TABLA
CREATE TABLE sospechosos(
  id  INT PRIMARY KEY,
  nombre TEXT,
  zurdo INT,  -- 1 = sí
  jazz  INT,
  coartada INT,
  pipa  INT,
  sombrero INT
);

-- DATOS
INSERT INTO sospechosos VALUES
(1,'Pablo Pistacho',1,1,0,1,0),
(2,'Rosa Rubí',     1,1,0,1,1),
(3,'Marco Magenta', 0,1,0,0,1),
(4,'Celia Cian',    1,0,0,0,1),
(5,'Olivia Ocre',   1,1,1,0,1),
(6,'Bruno Beige',   1,1,0,0,0);

-- CONSULTA-SOLUCIÓN
--SELECT nombre
--FROM   sospechosos
--WHERE  zurdo = 1
--  AND  jazz = 1
--  AND  coartada = 0
--  AND  ( (pipa = 1 AND sombrero = 0)
--      OR (pipa = 0 AND sombrero = 1) );

        `,
        saludo: `Acabo de entrar al cliente sql Estamos dentro del esquema quesada, Ummm... debo de averiguar las tablas que hay.
        `
      }],
      // el map de hitos funciona idéntico al de NPCS
      milestones: {
        '/hito configuracion_correcta superado': 'configuracion_correcta',
        '/hito ip_servidor_encontrada superado': 'ip_servidor_encontrada',
        '/hito acceso_base_datos superado': 'acceso_base_datos'
      }
    },
  
    Manual_Cableado:{tipo:'Item',recogible:true,nombre:'Manual de Cableado',
      descripcion:`Cómo pelar y crimpar cableado UTP.
      Pasos esenciales para crimpar un cable UTP:
	1.	Corta el cable a la longitud deseada con un corte recto.
	2.	Pela ~2 cm de la funda exterior sin dañar los hilos.
	3.	Ordena los 8 conductores según la norma (T568B suele usarse: blanco-naranja, naranja, blanco-verde, azul, blanco-azul, verde, blanco-marrón, marrón).
	4.	Recorta las puntas alineadas a unos 13 mm y deslízalas en el conector RJ-45 (pestaña abajo).
	5.	Crimpa firmemente; la garra debe prensar la funda.
  `},
  
    Manual_Cisco: {
      tipo:     'Item',
      recogible:true,
      nombre:   'Manual Cisco IOS',
      descripcion:'Comandos IOS para configurar el switch.',
      contenido_detalle:`Configuring VLANs

Switch#show vlan - Display current VLANs
Switch(config)#vlan 10 - Create a VLAN with the number 10
Switch(config-vlan)#name sales - Give the VLAN a name “sales”
Switch(config-if)#switchport mode access - Set a switch interface to access mode (es el estado por defecto de fábrica, por tanto no es necesario ejecutar este comando a no ser que estuviera en modo trunk y quisieramos cambiarlo a modo access. De fábrica todos los puertos son de tipo access y son de la vlan 1)
Switch(config-if)#switchport mode trunk - Set a switch interface to trunk mode
Switch(config-if)#switchport access vlan 10 - Assign an interface to VLAN 10
Switch(config-if)#switchport trunk allowed vlan 10, 20 – selecciona vlan aceptadas(por defecto acepta todas)
Switch(config)# interface range f0/0 -15 – Select a range of interfaces to config.
Switch(config-if-range)# switchport access vlan 10 – set range of interface to vlan 10

Switch#show interfaces switchport – Muestra todas las interfaces y si son de access o trunk y las vlan que pueden etiquetar

Switch#show interfaces FastEthernet 0/1 status – Muestra el estado de un interfaz
Switch#show interfaces FastEthernet 0/1 switchport – Muestra el estado más info
Switch#show vlan brief – Muestra todas las vlans y los puertos asignados a cada vlan

Switch#show vlan id 10 – Muestra la vlan 10 y los puertos asignados

--- misceláneos ---
Switch#show version – Muestra la versión del IOS
Switch#show ip interface brief – Muestra todas las interfaces y su estado
Switch#show mac address-table – Muestra la tabla de direcciones MAC
Switch#show ip route – Muestra la tabla de rutas
Switch#show running-config – Muestra la configuración actual
Switch#show startup-config – Muestra la configuración de inicio`
    },
  
};