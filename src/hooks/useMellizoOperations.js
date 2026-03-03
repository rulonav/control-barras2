import databaseService from '../services/databaseService';

export const useMellizoOperations = () => {
  const obtenerProductoPrincipal = (productos) => {
    return [...productos].sort((a, b) => {
      if (a.id && b.id) return a.id - b.id;
      const timeA = new Date(a.timestamp || a.created_at).getTime();
      const timeB = new Date(b.timestamp || b.created_at).getTime();
      return timeA - timeB;
    })[0];
  };

  const obtenerMellizos = (productos) => {
    const ordenados = [...productos].sort((a, b) => {
      if (a.id && b.id) return a.id - b.id;
      const timeA = new Date(a.timestamp || a.created_at).getTime();
      const timeB = new Date(b.timestamp || b.created_at).getTime();
      return timeA - timeB;
    });
    return ordenados.slice(1);
  };

  const procesarMellizosConAccion = async (accion, mellizoActual) => {
    try {
      const { codigo, productos } = mellizoActual;
      if (!productos || productos.length < 2) {
        return { completado: true, mensaje: 'No hay suficientes duplicados para procesar' };
      }

      const productoPrincipal = obtenerProductoPrincipal(productos);
      const mellizos = obtenerMellizos(productos);
      console.log(`🔍 Código ${codigo}: 1 principal (ID: ${productoPrincipal.id}), ${mellizos.length} mellizos`);

      if (accion === 'marcar_todos_mellizos') {
        for (const mellizo of mellizos) {
          await databaseService.actualizarProducto(mellizo.id, { es_mellizo: true });
        }
        return { completado: true, mensaje: `Marcados ${mellizos.length} productos como mellizos` };
      } else if (accion === 'eliminar_dejando_uno' || accion === 'eliminar_todos_duplicados') {
        for (const mellizo of mellizos) {
          await databaseService.eliminarProducto(mellizo.id);
        }
        return { completado: true, mensaje: `Eliminados todos los ${mellizos.length} duplicados. Se conservó el primero.` };
      }

      return { completado: false, error: 'Acción desconocida' };
    } catch (error) {
      console.error('❌ Error en procesarMellizosConAccion:', error);
      return { completado: false, error: error.message || 'Error desconocido' };
    }
  };

  return { procesarMellizosConAccion, obtenerProductoPrincipal, obtenerMellizos };
};