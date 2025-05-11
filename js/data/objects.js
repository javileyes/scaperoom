/* Objetos — sin cambios salvo posibles recortes en descripción */
export const OBJECTS = {
    /* Pasarelas -------------------------------------------------- */
    Puerta_Aula_Servidores: {
      tipo: 'Pasarela',
      nombre: 'Puerta Aula-Servidores',
      descripcion: 'Puerta metálica gris con teclado numérico.',
      // bloqueada ahora solo en state.puzzleStates
      requiere_pass: { codigo: '192.168.1.0/24' },
      bloqueada: true
    },
  
    Puerta_Aula_Taller:{tipo:'Pasarela',nombre:'Puerta Aula-Taller',
      descripcion:'Puerta de madera standard.',bloqueada:false},
  
    Conexion_Taller_Redes:{tipo:'Pasarela',nombre:'Conexión Taller-Redes',
      descripcion:'Hueco improvisado que conecta con la sala de al lado.',
      bloqueada:false},
  
    /* Decoraciones, dispositivos, items -------------------------- */
    Pizarra_Blanca:{tipo:'Decoracion',nombre:'Pizarra Blanca',
      descripcion:'Cubierta de diagramas de topologías, IP y máscaras.'},
  
    Proyector_Techo:{tipo:'Decoracion',nombre:'Proyector del Techo',
      descripcion:'Un proyector multimedia estándar, apagado.'},
  
    Mesa_Profesor:{
      tipo:'Decoracion',
      nombre:'Mesa del Profesor',
      descripcion:'Mesa grande con papeles y una nota solitaria.',
      oculto:false,
      contenidos:['Nota_Profesor']
    },
    Nota_Profesor:{
      tipo:'Item',
      recogible:true,
      nombre:'Nota del Profesor',
      descripcion:'Un post-it amarillo.',
      contenido_detalle:
        'Recordatorio: la subred de gestión es la primera subred utilizable de una red privada clase C /24.',
      oculto:true                    // sigue oculta hasta descubrirla
    },

    Rack_Principal:{tipo:'Decoracion',nombre:'Rack Principal',
      descripcion:'Rack de 19" con servidores y switches.'},
  
    Mesa_Trabajo_1:{tipo:'Decoracion',nombre:'Mesa de Trabajo',
      descripcion:'Herramientas y componentes de PC esparcidos.'},
  
    Caja_Herramientas: {
      tipo: 'Decoracion',
      nombre: 'Caja de Herramientas',
      descripcion: 'Destornilladores, alicates, crimpadora y otras herramientas.',
      oculto: false,
      contenidos: ['Bobina_Cable', 'Alicates', 'Crimpadora', 'Pelacables', 'Conectores_RJ45']
    },

    // Herramientas y materiales para fabricar el cable
    Bobina_Cable: {
      tipo: 'Item',
      recogible: true,
      nombre: 'Bobina de Cable RJ-45 UTP Cat6',
      descripcion: 'Carrete de cable de red profesional, suficiente para varios metros.',
      oculto: true,
      usable_con: ['Alicates'],
      crea_objeto: 'Cable_Red_En_Proceso' // Añadido: indica qué objeto se crea al usarla con Alicates
    },

    Alicates: {
      tipo: 'Item',
      recogible: true,
      nombre: 'Alicates',
      descripcion: 'Herramientas para cortar cables y otros materiales.',
      oculto: true
    },

    Crimpadora: {
      tipo: 'Item',
      recogible: true,
      nombre: 'Crimpadora',
      descripcion: 'Herramienta especializada para prensar conectores RJ-45.',
      oculto: true
    },

    Pelacables: {
      tipo: 'Item',
      recogible: true,
      nombre: 'Pelacables',
      descripcion: 'Herramienta con cuchilla especial para quitar recubrimiento de cables sin dañar los hilos.',
      oculto: true
    },

    Conectores_RJ45: {
      tipo: 'Item',
      recogible: true,
      nombre: 'Conectores RJ-45',
      descripcion: 'Pequeña bolsa con conectores transparentes para terminar cables de red.',
      oculto: true
    },

    // Cable en proceso con estados múltiples
    Cable_Red_En_Proceso: {
      tipo: 'Item',
      recogible: true,
      nombre: 'Cable de Red UTP',
      descripcion_base: 'Un trozo de cable de red UTP cortado de la bobina.',
      oculto: true, // Se crea al usar alicates con bobina
      estado_actual: 'sin_pelar',
      descripciones_estado: {
        'sin_pelar': {
          descripcion: 'Cable de red recién cortado de la bobina, con el revestimiento exterior intacto.',
          siguiente: 'pelado_destrenzado',
          necesita: ['Pelacables']
        },
        'pelado_destrenzado': {
          descripcion: 'Cable de red con los extremos pelados, mostrando los pares de hilos de cobre trenzados.',
          siguiente: 'listo',
          necesita: ['Crimpadora', 'Conectores_RJ45'] // Necesita ambos para el siguiente estado
        },
        'listo': {
          descripcion: 'Latiguillo de red UTP Cat6 terminado, con conectores RJ-45 en ambos extremos, listo para usar.'
        }
      }
    },  
  
    Armario_Rack:{tipo:'Decoracion',nombre:'Armario Rack',
      descripcion:'Contiene switches, routers y patch-panels.'},
  
  /* … */
  Switch_Cisco: {
    tipo:    'Dispositivo',
    nombre:  'Switch Cisco',
    descripcion:
      'Switch Cisco con CLI IOS para configurar VLANs.',
    sistema: true,

    // ── definimos diálogos como en npc.js ──────────────────
    dialogues: [
      {
        // mientras puzzleStates['configuracion_switch']==false, éste es el diálogo activo
        superado: 'configuracion_switch',
        system_prompt: `Eres un Switch Cisco IOS. 
Compórtate estrictamente como un switch Cisco IOS configurado por defecto y sin contraseñas, empezando 
desde el terminal en modo no privilegiado. 
Sé minimalista, sin información adicional ni de compilación. 
Solo ejecuta el comando que el usario te pida (ninguno más).
IMPORTANTE: Al configurar VLAN 10 para "alumnos" en puertos 1–20 
y VLAN 20 para "profesores" en puertos 21–24, 
debes emitir "/hito configuración_switch superado". 
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
      '/hito configuración_switch superado': 'configuracion_switch'
    }
  },
  /* … resto de OBJECTS … */
  
  
    Patch_Panel:{tipo:'Decoracion',nombre:'Patch-Panel',
      descripcion:'Panel con decenas de RJ-45 etiquetados.'},
  
    Portatil_Tecnico:{tipo:'Decoracion',nombre:'Portátil del Técnico',
      descripcion:'Consola abierta; el técnico no te deja tocar.'},
    
    SRV_DC01: {
      tipo: 'Dispositivo',
      nombre: 'Servidor SRV-DC01',
      descripcion_base: 'Servidor HP ProLiant 2U en rack.',
      estado_actual: 'offline_disconnected',
      descripciones_estado: {
        'offline_disconnected': {
          descripcion: 'Servidor HP ProLiant 2U con luz roja parpadeando.',
          siguiente: 'offline_connected',
          necesita: ['Cable_Red_En_Proceso']
        },
        'offline_connected': {
          descripcion: 'Servidor HP ProLiant 2U con luz verde.',
          siguiente: 'online',
          necesita: ['Terminal_Admin'] // Por ejemplo, si luego se quiere encender desde terminal
        },
        'online': {
          descripcion: 'Servidor HP ProLiant 2U encendido y funcionando correctamente.'
        }
      }
    },
    Terminal_Admin: {
      tipo: 'Dispositivo',
      nombre: 'Terminal de Administración',
      descripcion: 'Vieja torre con monitor CRT: prompt "Usuario:" parpadea.',
      requiere_pass: { usuario: 'admin', password: 'password123' }
    },
  
    Manual_Ensamblaje:{tipo:'Item',recogible:false,nombre:'Manual de Ensamblaje',
      descripcion:'Cómo montar un PC paso a paso.'},
  
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