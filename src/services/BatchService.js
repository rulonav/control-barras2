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
    console.log('✅ BatchService - Inicializado para ruta:', rutaId);
  }

  // Configurar autoflush
  setupAutoFlush() {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
    }
    
    this.flushTimeout = setTimeout(() => {
      if (this.batchBuffer.length > 0) {
        console.log('⏰ BatchService - Autoflush por timeout:', this.batchBuffer.length, 'productos');
        this.flushBuffer();
      }
    }, this.BATCH_TIMEOUT_MS);

    return this.flushTimeout;
  }

  // Agregar producto al batch
  async agregarProducto(producto, rutaId = null) {
    if (!this.enabled) {
      console.warn('⚠️ BatchService - Deshabilitado, guardando directamente');
      return await this.guardarProductoDirecto(producto, rutaId);
    }

    try {
      // Si se proporciona rutaId, actualizar
      if (rutaId) {
        this.rutaId = rutaId;
      }

      // Agregar producto al buffer
      this.batchBuffer.push(producto);
      console.log(`📦 BatchService - Producto agregado al batch (${this.batchBuffer.length}/${this.MAX_BATCH_SIZE})`);

      // Verificar si se alcanzó el tamaño máximo
      if (this.batchBuffer.length >= this.MAX_BATCH_SIZE) {
        console.log('📊 BatchService - Tamaño máximo alcanzado, flusheando...');
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
      console.error('❌ BatchService - Error agregando producto:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Forzar guardado de todos los productos en el buffer
  async flushBuffer() {
    if (this.batchBuffer.length === 0) {
      console.log('ℹ️ BatchService - Buffer vacío, nada que flushear');
      return { success: true, total: 0, productos: [] };
    }

    try {
      if (!this.rutaId) {
        throw new Error('No hay ruta ID definida para guardar productos');
      }

      console.log('🔄 BatchService - Flusheando batch de', this.batchBuffer.length, 'productos...');
      
      // Simular guardado en base de datos
      const productosGuardados = [...this.batchBuffer];
      
      // Limpiar buffer
      this.batchBuffer = [];
      this.lastFlushTime = Date.now();

      console.log('✅ BatchService - Batch flusheado exitosamente:', productosGuardados.length, 'productos');
      
      return {
        success: true,
        total: productosGuardados.length,
        productos: productosGuardados
      };

    } catch (error) {
      console.error('❌ BatchService - Error flusheando batch:', error);
      
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
      console.log('🔄 BatchService - Guardando producto directamente (modo fallback)');
      
      // Simular guardado directo
      const productoGuardado = {
        ...producto,
        id: Date.now(),
        ruta_id: rutaId || this.rutaId,
        timestamp: new Date().toISOString()
      };
      
      console.log('✅ BatchService - Producto guardado directamente:', productoGuardado.id);
      
      return {
        success: true,
        producto: productoGuardado
      };

    } catch (error) {
      console.error('❌ BatchService - Error guardando directamente:', error);
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
    console.log('🧹 BatchService - Finalizando servicio...');
    
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
    }
    
    // Flushear cualquier producto restante
    if (this.batchBuffer.length > 0) {
      await this.flushBuffer();
    }
    
    this.batchBuffer = [];
    this.rutaId = null;
    
    console.log('✅ BatchService - Servicio finalizado correctamente');
    return { success: true };
  }

  // Habilitar/deshabilitar el servicio
  setEnabled(enabled) {
    this.enabled = enabled;
    console.log(enabled ? '✅ BatchService - Habilitado' : '⚠️ BatchService - Deshabilitado');
    
    if (!enabled && this.batchBuffer.length > 0) {
      console.log('🔄 BatchService - Deshabilitando, flusheando buffer restante...');
      this.flushBuffer();
    }
    
    return this.enabled;
  }
}

// Exportar como singleton
const batchService = new BatchService();
export default batchService;