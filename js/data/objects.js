/* Objetos — sin cambios salvo posibles recortes en descripción */
export const OBJECTS = {
    /* Pasarelas -------------------------------------------------- */
    Puerta_Aula_Servidores:{tipo:'Pasarela',nombre:'Puerta Aula-Servidores',
      descripcion:'Puerta metálica gris con teclado numérico.',
      bloqueada:true, requiere_codigo:'192.168.1.0/24',
      mensaje_bloqueo:'La puerta está cerrada. Introduce Subred de Gestión.'},
  
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
      contenidos:['Nota_Profesor']    //  aquí asignamos lo que contiene
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
  
    Caja_Herramientas:{tipo:'Decoracion',nombre:'Caja de Herramientas',
      descripcion:'Destornilladores, alicates, crimpadora…'},
  
    Armario_Rack:{tipo:'Decoracion',nombre:'Armario Rack',
      descripcion:'Contiene switches, routers y patch-panels.'},
  
    Switch_Cisco: {
      tipo:        'Dispositivo',
      nombre:      'Switch Cisco',
      descripcion: 'Switch Cisco con CLI IOS para configurar VLANs.',
      sistema:     true,   // ← nuevo flag
      system_prompt: `Eres un Switch Cisco IOS. 
  Compórtate estrictamente como un switch Cisco IOS, empezando 
  desde el terminal en modo no privilegiado. "Help" o "?" son 
  los comandos de ayuda. Sólo muestra comandos de navegación 
  (enable, exit, configure) y de VLAN/interfaces. 
  OJO: no puedes ayudar al usuario a resolver el puzzle, comportáte como un switch real.
  IMPORTANTE: Al configurar VLAN 10 para "alumnos" en puertos 1–20 
  y VLAN 20 para "profesores" en puertos 21–24, 
  debes emitir "/hito configuración_switch superado".`,
      milestones: {
        '/hito configuración_switch superado': 'configuracion_switch'
      }
    },
  
  
    Patch_Panel:{tipo:'Decoracion',nombre:'Patch-Panel',
      descripcion:'Panel con decenas de RJ-45 etiquetados.'},
  
    Portatil_Tecnico:{tipo:'Decoracion',nombre:'Portátil del Técnico',
      descripcion:'Consola abierta; el técnico no te deja tocar.'},
    
    SRV_DC01:{tipo:'Dispositivo',nombre:'Servidor SRV-DC01',
      descripcion:'Servidor HP ProLiant 2U con luz roja parpadeando.',
      estado:'offline_disconnected',
      usable_con:['Cable_Red_Suelto_En_Suelo','Cable_Red_Nuevo_Caja']},
  
    Terminal_Admin:{tipo:'Dispositivo',nombre:'Terminal de Administración',
      descripcion:'Vieja torre con monitor CRT: prompt "Usuario:" parpadea.',
      estado:'login_required', requiere_login:['admin','password123'],
      mensaje_login:'Introduce usuario/contraseña usando formato usuario/contraseña.'},
  
    Manual_Ensamblaje:{tipo:'Item',recogible:false,nombre:'Manual de Ensamblaje',
      descripcion:'Cómo montar un PC paso a paso.'},
  
    Manual_Cisco: {
      tipo:     'Item',
      recogible:true,
      nombre:   'Manual Cisco IOS',
      descripcion:'Comandos IOS para configurar el switch.',
      contenido_detalle:
        '--- Comandos Cisco IOS básicos ---\n' +
        'interface <INT>\n' +
        '  switchport mode access\n' +
        '  switchport access vlan <VLAN_ID>\n' +
        'exit\n\n' +
        'vlan <VLAN_ID>\n' +
        '  name <VLAN_NAME>\n' +
        'exit\n\n' +
        '! Otras: show vlan brief | show interfaces status'
    },
  
    Cable_Red_Suelto_En_Suelo:{tipo:'Item',recogible:true,nombre:'Cable de Red Suelto',
      descripcion:'UTP Cat6 azul, 2 m.'},
  
    Cable_Red_Nuevo_Caja:{tipo:'Item',recogible:true,nombre:'Cable de Red Nuevo',
      descripcion:'UTP Cat5e amarillo, aún enrollado.'}
  };