// src/services/scanValidationService.js
// Servicio especializado en validación y control de escaneos duplicados

class ScanValidationService {
  constructor() {
    this.ultimosCodigos = [];
    this.maxUltimos = 3;
    this.processingLocks = new Map();
    this.scanHistory = new Map(); // Historial temporal de escaneos
  }

  // ✅ VALIDAR SI UN CÓDIGO PUEDE SER PROCESADO
  puedeProcesarCodigo = (codigo, velocidadEscaneo = 1000) => {
    const ahora = Date.now();
    const codigoLimpio = this.limpiarCodigo(codigo);

    // ✅ 1. Validar formato básico
    if (!this.esFormatoValido(codigoLimpio)) {
      return {
        puedeProcesar: false,
        razon: 'formato_invalido',
        mensaje: 'Formato de código inválido'
      };
    }

    // ✅ 2. Verificar si está siendo procesado
    if (this.processingLocks.has(codigoLimpio)) {
      return {
        puedeProcesar: false,
        razon: 'en_proceso',
        mensaje: 'Código ya siendo procesado'
      };
    }

    // ✅ 3. Verificar duplicado inmediato (últimos códigos)
    if (this.ultimosCodigos.includes(codigoLimpio)) {
      return {
        puedeProcesar: false,
        razon: 'duplicado_inmediato',
        mensaje: 'Código escaneado recientemente'
      };
    }

    // ✅ 4. Verificar velocidad de escaneo
    const historialCodigo = this.scanHistory.get(codigoLimpio);
    if (historialCodigo && (ahora - historialCodigo.ultimoEscaneo) < velocidadEscaneo) {
      return {
        puedeProcesar: false,
        razon: 'demasiado_rapido',
        mensaje: 'Escaneo demasiado rápido'
      };
    }

    return { puedeProcesar: true, codigoLimpio };
  };

  // ✅ AGREGAR CÓDIGO A PROCESAMIENTO
  agregarProcesamiento = (codigo) => {
    const codigoLimpio = this.limpiarCodigo(codigo);
    this.processingLocks.set(codigoLimpio, Date.now());
    // Limpiar locks antiguos (más de 10 segundos)
    this.limpiarLocksAntiguos();
  };

  // ✅ REMOVER CÓDIGO DE PROCESAMIENTO
  removerProcesamiento = (codigo) => {
    const codigoLimpio = this.limpiarCodigo(codigo);
    this.processingLocks.delete(codigoLimpio);
  };

  // ✅ AGREGAR A ÚLTIMOS CÓDIGOS ESCANEADOS
  agregarAUltimos = (codigo) => {
    const codigoLimpio = this.limpiarCodigo(codigo);
    // Agregar al inicio
    this.ultimosCodigos.unshift(codigoLimpio);
    // Mantener solo los últimos N códigos
    if (this.ultimosCodigos.length > this.maxUltimos) {
      this.ultimosCodigos.pop();
    }
    // Actualizar historial
    this.scanHistory.set(codigoLimpio, {
      ultimoEscaneo: Date.now(),
      vecesEscaneado: (this.scanHistory.get(codigoLimpio)?.vecesEscaneado || 0) + 1
    });
    console.log('📋 Últimos códigos:', this.ultimosCodigos);
  };

  // ✅ LIMPIAR CÓDIGO QR/JSON
  limpiarCodigo = (data) => {
    if (!data) return '';
    // Si es JSON, extraer el ID
    if (data.startsWith('{') && data.includes('"id"')) {
      try {
        const parsed = JSON.parse(data);
        return parsed.id || data;
      } catch (error) {
        return data;
      }
    }
    return data.toString().trim();
  };

  // ✅ VALIDAR FORMATO DE CÓDIGO DE BARRAS
  esFormatoValido = (codigo) => {
    if (!codigo || codigo.length < 10) return false;
    // Debe ser numérico y tener al menos 10 dígitos
    const esNumerico = /^\d+$/.test(codigo);
    const longitudValida = codigo.length >= 10;
    return esNumerico && longitudValida;
  };

  // ✅ LIMPIAR LOCKS ANTIGUOS
  limpiarLocksAntiguos = () => {
    const ahora = Date.now();
    const maxTiempoLock = 10000; // 10 segundos
    for (const [codigo, timestamp] of this.processingLocks.entries()) {
      if (ahora - timestamp > maxTiempoLock) {
        this.processingLocks.delete(codigo);
      }
    }
  };

  // ✅ LIMPIAR TODO
  limpiarTodo = () => {
    this.ultimosCodigos = [];
    this.processingLocks.clear();
    console.log('🧹 Estado de validación limpiado');
  };

  // ✅ OBTENER ESTADÍSTICAS
  obtenerEstadisticas = () => {
    return {
      ultimosCodigos: this.ultimosCodigos.length,
      locksActivos: this.processingLocks.size,
      historialSize: this.scanHistory.size
    };
  };
}

export default new ScanValidationService();