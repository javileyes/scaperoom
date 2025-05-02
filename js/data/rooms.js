/* Salas y su “estático” (sin estados).  Se exporta como ROOMS */
export const ROOMS = {
    Aula_Teoria : {
      nombre : 'Aula de Teoría',
      descripcion : 'Una típica aula de instituto con mesas individuales desgastadas, una pizarra blanca... ',
      objetos : ['Nota_Profesor','Pizarra_Blanca','Proyector_Techo','Mesa_Profesor'],
      npcs    : ['Javier_ProfesorRedes'],     // Asistente IA eliminado
      salidas : {
        Puerta_Aula_Servidores : { destino:'Cuarto_Servidores' },
        Puerta_Aula_Taller     : { destino:'Taller_Hardware' }
      }
    },
  
    Cuarto_Servidores : {
      nombre:'Cuarto de Servidores',
      descripcion:'El aire aquí es más frío y el zumbido constante...',
      objetos:['Rack_Principal','SRV_DC01','Terminal_Admin','Cable_Red_Suelto_En_Suelo'],
      npcs:[],
      salidas:{ Puerta_Aula_Servidores:{ destino:'Aula_Teoria'} }
    },
  
    Taller_Hardware : {
      nombre:'Taller de Hardware',
      descripcion:'Un caos organizado de componentes de ordenador...',
      objetos:['Mesa_Trabajo_1','Caja_Herramientas','Manual_Ensamblaje','Manual_Cisco','Cable_Red_Nuevo_Caja'],
      npcs:[],
      salidas:{
        Puerta_Aula_Taller:{ destino:'Aula_Teoria'},
        Conexion_Taller_Redes:{ destino:'Zona_Redes'}
      }
    },
  
    Zona_Redes : {
      nombre:'Zona de Redes',
      descripcion:'Dominada por un armario rack de comunicaciones abierto...',
      objetos:['Armario_Rack','Switch_Cisco','Router_Mikrotik','Patch_Panel','Portatil_Tecnico'],
      npcs:['Tecnico_Estresado'],
      salidas:{ Conexion_Taller_Redes:{ destino:'Taller_Hardware'} }
    }
  };