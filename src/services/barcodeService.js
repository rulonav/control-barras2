// src/services/barcodeService.js
import { Alert } from 'react-native';

class BarcodeService {
  constructor() {
    this.procesados = new Map();
    this.tiempoLimite = 2000; // 2 segundos para evitar duplicados inmediatos
    
    // ✅ CORREGIDO: Valores por defecto null - se configuran desde RutaForm
    // Los límites se establecen con actualizarLimites() al crear cada ruta
    this.limiteInferior = null;
    this.limiteSuperior = null;
    this.limitesConfigurados = false;
  }

  /**
   * ✅ ACTUALIZAR LÍMITES DE ESCANEO (llamado desde ScannerScreen al recibir rangoEscaneo)
   * @param {number} inferior - Código inicial completo (ej: 45000000000)
   * @param {number} superior - Código final completo (ej: 47999999999)
   */
  actualizarLimites(inferior, superior) {
    // ✅ CORREGIDO: Convertir a número entero y validar
    const inf = typeof inferior === 'string' ? parseInt(inferior, 10) : inferior;
    const sup = typeof superior === 'string' ? parseInt(superior, 10) : superior;
    
    // Validar que sean números válidos y que inferior < superior
    if (isNaN(inf) || isNaN(sup) || inf >= sup) {
      console.warn('⚠️ Límites inválidos recibidos:', { inferior, superior });
      return false;
    }
    
    // ✅ CORREGIDO: Los valores YA vienen como números completos de 11 dígitos
    // NO concatenar prefijos, usar directamente los valores recibidos
    this.limiteInferior = inf;
    this.limiteSuperior = sup;
    this.limitesConfigurados = true;
    
    console.log(`🔧 Límites de escaneo configurados: ${this.limiteInferior} - ${this.limiteSuperior}`);
    console.log(`📊 Rango legible: ${this.limiteInferior/1000000000} - ${this.limiteSuperior/1000000000}`);
    return true;
  }

  /**
   * Obtener límites actuales para debugging o UI
   */
  obtenerLimites() {
    return {
      inferior: this.limiteInferior,
      superior: this.limiteSuperior,
      inferiorFormateado: this.limiteInferior ? this.limiteInferior / 1000000000 : null,
      superiorFormateado: this.limiteSuperior ? this.limiteSuperior / 1000000000 : null,
      configurados: this.limitesConfigurados
    };
  }

  /**
   * ✅ VALIDACIÓN DE CÓDIGO CON RANGO DINÁMICO
   * @param {string} codigoLimpio - Código de 11 dígitos ya limpio
   * @returns {object} { valido: boolean, mensaje: string }
   */
  validarCodigo = (codigoLimpio) => {
    console.log('🔍 Validando código:', codigoLimpio);
    
    // 1. Verificar longitud exacta de 11 dígitos
    if (codigoLimpio.length !== 11) {
      console.log(`❌ Código inválido: debe tener 11 dígitos, tiene ${codigoLimpio.length}`);
      return {
        valido: false,
        mensaje: `❌ Código debe tener 11 dígitos (tiene ${codigoLimpio.length})`
      };
    }
    
    // 2. Verificar que sea completamente numérico
    if (!/^\d+$/.test(codigoLimpio)) {
      console.log('❌ Código inválido: contiene caracteres no numéricos');
      return {
        valido: false,
        mensaje: '❌ Código debe contener solo números'
      };
    }
    
    // 3. ✅ CORREGIDO: Solo validar rango si los límites están configurados
    if (this.limitesConfigurados && this.limiteInferior !== null && this.limiteSuperior !== null) {
      const codigoNumero = parseInt(codigoLimpio, 10);
      
      if (codigoNumero < this.limiteInferior || codigoNumero > this.limiteSuperior) {
        console.log(`❌ Código fuera de rango: ${codigoNumero}`);
        console.log(`📊 Rango válido: ${this.limiteInferior} - ${this.limiteSuperior}`);
        return {
          valido: false,
          mensaje: `❌ Código fuera de rango (${this.limiteInferior/1000000000}-${this.limiteSuperior/1000000000})`
        };
      }
    } else {
      // ⚠️ Advertencia solo en desarrollo - en producción podría ser silencioso
      console.log('⚠️ Límites no configurados, omitiendo validación de rango');
    }
    
    console.log('✅ Código válido');
    return {
      valido: true,
      mensaje: '✅ Código válido'
    };
  };

  /**
   * ✅ LIMPIAR Y VALIDAR CÓDIGO (entrada principal desde ScannerInterface)
   * @param {string|object} codigo - Código crudo del scanner (puede ser JSON)
   * @returns {string} Código limpio de 11 dígitos
   * @throws {Error} Si el código no es válido
   */
  limpiarCodigo = (codigo) => {
    console.log('🔍 Limpiando código:', codigo);
    
    try {
      let codigoFinal = '';
      
      // Caso A: Objeto JSON como {"id":"45682736556","t":"lm"}
      if (typeof codigo === 'object' && codigo !== null && codigo.id) {
        console.log('✅ Es objeto JSON, extrayendo ID:', codigo.id);
        codigoFinal = codigo.id.toString();
      }
      // Caso B: String que podría ser JSON
      else if (typeof codigo === 'string') {
        try {
          const parsed = JSON.parse(codigo);
          if (parsed && parsed.id) {
            console.log('✅ Es string JSON, extrayendo ID:', parsed.id);
            codigoFinal = parsed.id.toString();
          } else {
            // No es JSON, limpiar caracteres no numéricos
            codigoFinal = codigo.replace(/^id/, '').replace(/[^0-9]/g, '');
          }
        } catch (e) {
          // No es JSON válido, limpiar como string normal
          codigoFinal = codigo.replace(/^id/, '').replace(/[^0-9]/g, '');
        }
      }
      // Caso C: Número u otro tipo
      else {
        codigoFinal = codigo.toString().replace(/^id/, '').replace(/[^0-9]/g, '');
      }
      
      console.log(`🔧 Código limpiado: "${codigo}" → "${codigoFinal}"`);
      
      // ✅ Validar el código limpio (esto lanza error si no es válido)
      const validacion = this.validarCodigo(codigoFinal);
      if (!validacion.valido) {
        throw new Error(validacion.mensaje);
      }
      
      return codigoFinal;
      
    } catch (error) {
      console.error('❌ Error limpiando/validando código:', error);
      // Re-lanzar para que ScannerInterface maneje el error con audio/feedback
      throw error;
    }
  };

  /**
   * Verificar si un código fue procesado recientemente (anti-duplicado)
   * @param {string} codigo - Código limpio de 11 dígitos
   * @returns {boolean} True si fue procesado en los últimos `tiempoLimite` ms
   */
  esCodigoReciente = (codigo) => {
    if (!this.procesados) {
      this.procesados = new Map();
      return false;
    }
    
    const ahora = Date.now();
    const timestamp = this.procesados.get(codigo);
    
    if (timestamp && (ahora - timestamp) < this.tiempoLimite) {
      console.log(`🔄 Código reciente: ${codigo} (hace ${ahora - timestamp}ms)`);
      return true;
    }
    return false;
  };

  /**
   * Registrar que un código fue procesado (para anti-duplicado)
   * @param {string} codigo - Código limpio de 11 dígitos
   */
  registrarCodigoProcesado = (codigo) => {
    if (!this.procesados) {
      this.procesados = new Map();
    }
    this.procesados.set(codigo, Date.now());
    console.log(`📝 Código registrado como procesado: ${codigo}`);
    this.limpiarProcesadosAntiguos();
  };

  /**
   * Limpiar códigos procesados antiguos del mapa de anti-duplicado
   */
  limpiarProcesadosAntiguos = () => {
    if (!this.procesados) return;
    const ahora = Date.now();
    for (let [codigo, timestamp] of this.procesados.entries()) {
      if (ahora - timestamp > this.tiempoLimite) {
        this.procesados.delete(codigo);
      }
    }
  };

  /**
   * Limpiar TODOS los códigos procesados (al iniciar nueva ruta)
   */
  limpiarProcesados = () => {
    if (this.procesados) {
      this.procesados.clear();
      console.log('🧹 Todos los códigos procesados limpiados para nueva ruta');
    }
  };

  /**
   * Resetear límites para nueva configuración (opcional, al cambiar de ruta)
   */
  resetearLimites = () => {
    this.limiteInferior = null;
    this.limiteSuperior = null;
    this.limitesConfigurados = false;
    console.log('🔄 Límites de escaneo reseteados');
  };
}

// ✅ Exportar como singleton (una sola instancia en toda la app)
const barcodeService = new BarcodeService();
export default barcodeService;