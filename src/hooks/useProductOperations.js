// src/hooks/useProductOperations.js
import barcodeService from '../services/barcodeService';
import audioService from '../services/audioService';
import databaseService from '../services/databaseService';

export const useProductOperations = ({ ruta, productos, setProductos, setUltimoResultado, setLoading }) => {
  
  // ✅ PROCESAR ESCANEO CON VALIDACIÓN MEJORADA
  const procesarEscaneo = async (codigo, esDefectuoso = false) => {

    try {
      // ✅ Limpiar y validar código (la validación se hace dentro de limpiarCodigo)
      const codigoLimpio = barcodeService.limpiarCodigo(codigo);
      
      // ✅ SOLO verificar si ya fue procesado recientemente (últimos 2-3 segundos)
      if (barcodeService.esCodigoReciente(codigoLimpio)) {
        await audioService.playErrorSound();
        return {
          success: false,
          mensaje: '🔄 Código ya procesado (reciente)',
          tipo: 'duplicado'
        };
      }

      // ✅ Crear producto en base de datos
      const productoData = {
        codigo: codigoLimpio,
        ruta_id: ruta.id,
        detalle: esDefectuoso ? 'DAÑADO' : 'NORMAL',
        es_mellizo: false,
        es_defectuoso: esDefectuoso,
        es_repetido: false
        // No incluir timestamp, la base de datos lo generará automáticamente
      };

      const productoGuardado = await databaseService.agregarProducto(productoData);
      
      // ✅ Registrar en el servicio de códigos recientes
      barcodeService.registrarCodigoProcesado(codigoLimpio);
      
      // ✅ Actualizar estado local
      setProductos(prev => [...prev, productoGuardado]);
      
      // ✅ Actualizar último resultado
      const resultado = {
        success: true,
        mensaje: esDefectuoso ? '📦 Producto DAÑADO guardado' : '📦 Producto guardado',
        tipo: esDefectuoso ? 'defectuoso' : 'normal',
        codigo: codigoLimpio
      };
      
      setUltimoResultado(resultado);
      return resultado;
      
    } catch (error) {

      const resultadoError = {
        success: false,
        mensaje: error.message, // ✅ Usar el mensaje específico de validación
        tipo: 'error'
      };
      setUltimoResultado(resultadoError);
      return resultadoError;
    }
  };

  // ✅ MARCAR PRODUCTO COMO DAÑADO
  const marcarProductoComoDefectuoso = async (codigo) => {

    try {
      const codigoLimpio = barcodeService.limpiarCodigo(codigo);
      
      // ✅ Buscar producto en la lista actual
      const productoExistente = productos.find(p => p.codigo === codigoLimpio);
      
      if (productoExistente) {
        // ✅ Actualizar producto existente
        const productoActualizado = {
          ...productoExistente,
          es_defectuoso: true,
          detalle: 'DAÑADO'
        };
        
        // ✅ Actualizar en la base de datos
        await databaseService.actualizarProducto(productoExistente.id, { 
          es_defectuoso: 1, 
          detalle: 'DAÑADO' 
        });
        
        // ✅ Actualizar estado local
        setProductos(prev => prev.map(p => 
          p.id === productoExistente.id ? productoActualizado : p
        ));
        
        return { success: true, mensaje: '✅ Producto marcado como defectuoso' };
      } else {
        // ✅ Si no está en la lista actual, buscarlo en la base de datos
        const productoDB = await databaseService.obtenerProductoPorCodigo(codigoLimpio, ruta.id);
        
        if (productoDB) {
          await databaseService.actualizarProducto(productoDB.id, { 
            es_defectuoso: 1, 
            detalle: 'DAÑADO' 
          });
          return { success: true, mensaje: '✅ Producto encontrado y marcado como defectuoso' };
        } else {
          return { success: false, mensaje: '❌ Producto no encontrado en la ruta actual' };
        }
      }
    } catch (error) {

      return { success: false, mensaje: error.message };
    }
  };

  // ✅ MARCAR PRODUCTO COMO MELLIZO
  const marcarProductoComoMellizo = async (codigo, esMellizo = true) => {

    try {
      const codigoLimpio = barcodeService.limpiarCodigo(codigo);
      const productoExistente = productos.find(p => p.codigo === codigoLimpio);
      
      if (productoExistente) {
        const productoActualizado = {
          ...productoExistente,
          es_mellizo: esMellizo,
          detalle: esMellizo ? 'MELLIZO' : 'NORMAL'
        };
        
        await databaseService.actualizarProducto(productoExistente.id, { 
          es_mellizo: esMellizo ? 1 : 0, 
          detalle: esMellizo ? 'MELLIZO' : 'NORMAL' 
        });
        
        setProductos(prev => prev.map(p => 
          p.id === productoExistente.id ? productoActualizado : p
        ));
        
        return { 
          success: true, 
          mensaje: esMellizo ? '✅ Producto marcado como mellizo' : '✅ Producto desmarcado como mellizo' 
        };
      } else {
        const productoDB = await databaseService.obtenerProductoPorCodigo(codigoLimpio, ruta.id);
        
        if (productoDB) {
          await databaseService.actualizarProducto(productoDB.id, { 
            es_mellizo: esMellizo ? 1 : 0, 
            detalle: esMellizo ? 'MELLIZO' : 'NORMAL' 
          });
          return { 
            success: true, 
            mensaje: esMellizo ? '✅ Producto encontrado y marcado como mellizo' : '✅ Producto encontrado y desmarcado como mellizo' 
          };
        } else {
          return { success: false, mensaje: '❌ Producto no encontrado en la ruta actual' };
        }
      }
    } catch (error) {

      return { success: false, mensaje: error.message };
    }
  };

  // ✅ OBTENER ESTADÍSTICAS DE PRODUCTOS
  const obtenerEstadisticas = () => {
    if (!productos || productos.length === 0) {
      return { total: 0, defectuosos: 0, mellizos: 0 };
    }

    const estadisticas = productos.reduce((acc, producto) => {
      acc.total++;
      if (producto.es_defectuoso) acc.defectuosos++;
      if (producto.es_mellizo) acc.mellizos++;
      return acc;
    }, { total: 0, defectuosos: 0, mellizos: 0 });

    return estadisticas;
  };

  return {
    procesarEscaneo,
    marcarProductoComoDefectuoso,
    marcarProductoComoMellizo,
    obtenerEstadisticas
  };
};