// src/services/RecoveryService.js
import AsyncStorage from '@react-native-async-storage/async-storage';

class RecoveryService {
  constructor() {
    this.RECUPERATION_KEY = 'RECUPERACION_SESSION';
    this.ACTIVE_ROUTE_KEY = 'RUTA_ACTIVA';
    this.BUFFER_KEY_PREFIX = 'BUFFER_PRODUCTOS_';
  }

  // ✅ MÉTODO REQUERIDO POR AppNavigator.js
  async checkPendingSession() {
    try {
      const session = await AsyncStorage.getItem('puntoRecuperacion');
      if (session) {
        const data = JSON.parse(session);
        const ahora = Date.now();
        const diferencia = ahora - data.timestamp;
        const MAX_TIEMPO_RECUPERACION = 30 * 60 * 1000; // 30 minutos

        if (diferencia <= MAX_TIEMPO_RECUPERACION) {
          return {
            shouldResume: true,
            rutaId: data.rutaId,
            totalProductos: data.cantidadTotal,
            ultimosCodigos: data.ultimosCodigos,
            timestamp: data.timestamp
          };
        } else {

          await this.limpiarRecuperacion();
        }
      }
      return { shouldResume: false };
    } catch (error) {

      return { shouldResume: false };
    }
  }

  // ✅ INICIALIZAR RECUPERACIÓN PARA UNA NUEVA RUTA
  async inicializarRecuperacion(ruta) {
    try {

      // Limpiar cualquier recuperación anterior
      await this.limpiarRecuperacion();

      // Guardar ruta activa
      await AsyncStorage.setItem(this.ACTIVE_ROUTE_KEY, JSON.stringify({
        id: ruta.id,
        numero: ruta.numero,
        tipo: ruta.tipo || 'numerica',
        usuario_id: ruta.usuario_id,
        fecha_inicio: new Date().toISOString()
      }));

      // Inicializar buffer vacío para esta ruta
      await AsyncStorage.setItem(`${this.BUFFER_KEY_PREFIX}${ruta.id}`, JSON.stringify([]));

      return { success: true, rutaId: ruta.id };
    } catch (error) {

      throw error;
    }
  }

  // ✅ GUARDAR PRODUCTO EN RECUPERACIÓN
  async guardarProducto(producto) {
    try {

      // Obtener ruta activa
      const rutaActiva = await this.obtenerRutaActiva();
      if (!rutaActiva) {

        return { success: false, error: 'No hay ruta activa' };
      }

      // Obtener buffer actual
      const bufferKey = `${this.BUFFER_KEY_PREFIX}${rutaActiva.id}`;
      const bufferActual = await AsyncStorage.getItem(bufferKey);
      const productosBuffer = bufferActual ? JSON.parse(bufferActual) : [];

      // Agregar nuevo producto (evitar duplicados)
      const productoExistente = productosBuffer.find(p => p.codigo === producto.codigo);
      if (!productoExistente) {
        productosBuffer.push(producto);
        await AsyncStorage.setItem(bufferKey, JSON.stringify(productosBuffer));

      } else {

      }

      return { success: true, total: productosBuffer.length };
    } catch (error) {

      return { success: false, error: error.message };
    }
  }

  // ✅ OBTENER RUTA ACTIVA
  async obtenerRutaActiva() {
    try {
      const rutaActiva = await AsyncStorage.getItem(this.ACTIVE_ROUTE_KEY);
      if (rutaActiva) {
        return JSON.parse(rutaActiva);
      }
      return null;
    } catch (error) {

      return null;
    }
  }

  // ✅ RECUPERAR PRODUCTOS DE SESIÓN ANTERIOR
  async recuperarProductos() {
    try {

      // Obtener ruta activa
      const rutaActiva = await this.obtenerRutaActiva();
      if (!rutaActiva) {

        return { productos: [], punto: null, ruta: null };
      }

      // Obtener buffer de productos
      const bufferKey = `${this.BUFFER_KEY_PREFIX}${rutaActiva.id}`;
      const bufferGuardado = await AsyncStorage.getItem(bufferKey);
      
      if (!bufferGuardado || bufferGuardado === '[]') {

        return { productos: [], punto: null, ruta: rutaActiva };
      }

      const productosRecuperados = JSON.parse(bufferGuardado);

      // Crear punto de recuperación
      const puntoRecuperacion = {
        rutaId: rutaActiva.id,
        totalProductos: productosRecuperados.length,
        timestamp: new Date().toISOString(),
        ultimosCodigos: productosRecuperados.slice(-5).map(p => p.codigo)
      };

      return {
        productos: productosRecuperados,
        punto: puntoRecuperacion,
        ruta: rutaActiva
      };
    } catch (error) {

      return { productos: [], punto: null, ruta: null };
    }
  }

  // ✅ LIMPIAR RECUPERACIÓN COMPLETA
  async limpiarRecuperacion() {
    try {

      // Obtener ruta activa para limpiar su buffer específico
      const rutaActiva = await this.obtenerRutaActiva();
      
      // Limpiar todos los datos de recuperación
      const keysToRemove = [
        'puntoRecuperacion',
        this.ACTIVE_ROUTE_KEY
      ];

      // Agregar buffer de ruta activa si existe
      if (rutaActiva) {
        keysToRemove.push(`${this.BUFFER_KEY_PREFIX}${rutaActiva.id}`);
      }

      await AsyncStorage.multiRemove(keysToRemove);

      return { success: true };
    } catch (error) {

      return { success: false, error: error.message };
    }
  }
}

// Exportar una instancia única (singleton)
const recoveryService = new RecoveryService();
export default recoveryService;