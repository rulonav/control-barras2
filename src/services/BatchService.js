// src/services/BatchService.js
class BatchService {
  constructor() {
    this.batchBuffer = [];
    this.MAX_BATCH_SIZE = 10; // Máximo 10 productos por batch
    this.BATCH_TIMEOUT_MS = 10000; // 10 segundos máximo
    this.lastFlushTime = Date.now();
    this.flushTimeout = null;
    this.rutaId = null;
    this.enabled = true;
  }

  // Inicializar para una ruta específica
  initializeForRoute(rutaId) {
    this.rutaId = rutaId;
    this.batchBuffer = [];
    this.lastFlushTime = Date.now();
    this.setupAutoFlush();

  }

  // Configurar autoflush
  setupAutoFlush() {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
    }
    
    this.flushTimeout = setTimeout(() => {
      if (this.batchBuffer.length > 0) {

        this.flushBuffer();
      }
    }, this.BATCH_TIMEOUT_MS);

    return this.flushTimeout;
  }

  // Agregar producto al batch
  async agregarProducto(producto, rutaId = null) {
    if (!this.enabled) {

      return await this.guardarProductoDirecto(producto, rutaId);
    }

    try {
      // Si se proporciona rutaId, actualizar
      if (rutaId) {
        this.rutaId = rutaId;
      }

      // Agregar producto al buffer
      this.batchBuffer.push(producto);

      // Verificar si se alcanzó el tamaño máximo
      if (this.batchBuffer.length >= this.MAX_BATCH_SIZE) {

        await this.flushBuffer();
      } else {
        // Reiniciar timeout
        this.setupAutoFlush();
      }

      return {
        success: true,
        batched: true,
        producto,
        totalEnBatch: this.batchBuffer.length
      };

    } catch (error) {

      return {
        success: false,
        error: error.message
      };
    }
  }

  // Forzar guardado de todos los productos en el buffer
  async flushBuffer() {
    if (this.batchBuffer.length === 0) {

      return { success: true, total: 0, productos: [] };
    }

    try {
      if (!this.rutaId) {
        throw new Error('No hay ruta ID definida para guardar productos');
      }

      // Simular guardado en base de datos
      const productosGuardados = [...this.batchBuffer];
      
      // Limpiar buffer
      this.batchBuffer = [];
      this.lastFlushTime = Date.now();

      return {
        success: true,
        total: productosGuardados.length,
        productos: productosGuardados
      };

    } catch (error) {

      // En caso de error, mantener los productos en el buffer para reintentar
      return {
        success: false,
        error: error.message,
        productosPerdidos: [...this.batchBuffer]
      };
    }
  }

  // Guardar producto directamente sin batch (modo fallback)
  async guardarProductoDirecto(producto, rutaId) {
    try {

      // Simular guardado directo
      const productoGuardado = {
        ...producto,
        id: Date.now(),
        ruta_id: rutaId || this.rutaId,
        timestamp: new Date().toISOString()
      };

      return {
        success: true,
        producto: productoGuardado
      };

    } catch (error) {

      return {
        success: false,
        error: error.message
      };
    }
  }

  // Obtener estadísticas del servicio
  getStats() {
    return {
      enabled: this.enabled,
      bufferSize: this.batchBuffer.length,
      maxSize: this.MAX_BATCH_SIZE,
      lastFlushTime: new Date(this.lastFlushTime).toLocaleTimeString(),
      tiempoDesdeUltimoFlush: Math.floor((Date.now() - this.lastFlushTime) / 1000) + 's',
      rutaId: this.rutaId
    };
  }

  // Finalizar servicio (limpiar buffer y timeouts)
  async finalizar() {

    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
    }
    
    // Flushear cualquier producto restante
    if (this.batchBuffer.length > 0) {
      await this.flushBuffer();
    }
    
    this.batchBuffer = [];
    this.rutaId = null;

    return { success: true };
  }

  // Habilitar/deshabilitar el servicio
  setEnabled(enabled) {
    this.enabled = enabled;

    if (!enabled && this.batchBuffer.length > 0) {

      this.flushBuffer();
    }
    
    return this.enabled;
  }
}

// Exportar como singleton
const batchService = new BatchService();
export default batchService;