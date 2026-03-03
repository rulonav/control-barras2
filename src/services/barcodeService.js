// src/services/barcodeService.js
import { Alert } from 'react-native';

class BarcodeService {
  constructor() {
    this.procesados = new Map();
    this.tiempoLimite = 2000; // 2 segundos
    // ✅ CORREGIDO: Valores por defecto null - se actualizan por ruta
    this.limiteInferior = null;
    this.limiteSuperior = null;
    this.limitesConfigurados = false;
  }

  // Actualizar límites de escaneo (por ruta)
  actualizarLimites(inferior, superior) {
    // ✅ CORREGIDO: Convertir a número y validar
    const inf = typeof inferior === 'string' ? parseInt(inferior, 10) : inferior;
    const sup = typeof superior === 'string' ? parseInt(superior, 10) : superior;
    
    if (isNaN(inf) || isNaN(sup) || inf >= sup) {
      console.warn('⚠️ Límites inválidos:', { inferior, superior });
      return false;
    }
    
    // Si son valores pequeños (ej: 45, 47), convertir a formato completo
    const inferiorFinal = inf < 1000000000 ? inf * 1000000000 : inf;
    const superiorFinal = sup < 1000000000 ? sup * 1000000000 : sup;
    
    this.limiteInferior = inferiorFinal;
    this.limiteSuperior = superiorFinal;
    this.limitesConfigurados = true;
    console.log(`🔧 Límites actualizados: ${this.limiteInferior} - ${this.limiteSuperior}`);
    return true;
  }

  // Obtener límites actuales
  obtenerLimites() {
    return {
      inferior: this.limiteInferior,
      superior: this.limiteSuperior,
      inferiorFormateado: this.limiteInferior ? this.limiteInferior / 1000000000 : null,
      superiorFormateado: this.limiteSuperior ? this.limiteSuperior / 1000000000 : null,
      configurados: this.limitesConfigurados
    };
  }

  // Validación estricta con rango dinámico
  validarCodigo = (codigoLimpio) => {
    console.log('🔍 Validando código:', codigoLimpio);
    
    // Verificar que tenga exactamente 11 dígitos
    if (codigoLimpio.length !== 11) {
      console.log(`❌ Código inválido: debe tener 11 dígitos, tiene ${codigoLimpio.length}`);
      return {
        valido: false,
        mensaje: `❌ Código debe tener 11 dígitos (tiene ${codigoLimpio.length})`
      };
    }
    
    // Verificar que sea numérico
    if (!/^\d+$/.test(codigoLimpio)) {
      console.log('❌ Código inválido: contiene caracteres no numéricos');
      return {
        valido: false,
        mensaje: '❌ Código debe contener solo números'
      };
    }
    
    // ✅ CORREGIDO: Solo validar rango si los límites están configurados
    if (this.limitesConfigurados && this.limiteInferior && this.limiteSuperior) {
      const codigoNumero = parseInt(codigoLimpio, 10);
      if (codigoNumero < this.limiteInferior || codigoNumero > this.limiteSuperior) {
        console.log(`❌ Código fuera de rango: ${codigoNumero}`);
        return {
          valido: false,
          mensaje: `❌ Código fuera de rango (${this.limiteInferior/1000000000}-${this.limiteSuperior/1000000000})`
        };
      }
    } else {
      console.log('⚠️ Límites no configurados, omitiendo validación de rango');
    }
    
    console.log('✅ Código válido');
    return {
      valido: true,
      mensaje: '✅ Código válido'
    };
  };

  // Limpiar código con validación
  limpiarCodigo = (codigo) => {
    console.log('🔍 Limpiando código:', codigo);
    try {
      let codigoFinal = '';
      
      // Si es objeto JSON como {"id":"45682736556","t":"lm"}
      if (typeof codigo === 'object' && codigo.id) {
        console.log('✅ Es objeto JSON, extrayendo ID:', codigo.id);
        codigoFinal = codigo.id.toString();
      }
      // Si es string que parece JSON
      else if (typeof codigo === 'string') {
        try {
          const parsed = JSON.parse(codigo);
          if (parsed && parsed.id) {
            console.log('✅ Es string JSON, extrayendo ID:', parsed.id);
            codigoFinal = parsed.id.toString();
          } else {
            codigoFinal = codigo.replace(/^id/, '').replace(/[^0-9]/g, '');
          }
        } catch (e) {
          codigoFinal = codigo.replace(/^id/, '').replace(/[^0-9]/g, '');
        }
      }
      // Para otros tipos (number, etc.)
      else {
        codigoFinal = codigo.toString().replace(/^id/, '').replace(/[^0-9]/g, '');
      }
      
      console.log(`🔧 Código limpiado: ${codigo} → ${codigoFinal}`);
      
      // Validar el código limpio
      const validacion = this.validarCodigo(codigoFinal);
      if (!validacion.valido) {
        throw new Error(validacion.mensaje);
      }
      
      return codigoFinal;
    } catch (error) {
      console.error('❌ Error limpiando/validando código:', error);
      throw error;
    }
  };

  // Verificar si es código reciente
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

  // Registrar código procesado
  registrarCodigoProcesado = (codigo) => {
    if (!this.procesados) {
      this.procesados = new Map();
    }
    this.procesados.set(codigo, Date.now());
    console.log(`📝 Código registrado como procesado: ${codigo}`);
    this.limpiarProcesadosAntiguos();
  };

  // Limpiar códigos procesados antiguos
  limpiarProcesadosAntiguos = () => {
    if (!this.procesados) return;
    const ahora = Date.now();
    for (let [codigo, timestamp] of this.procesados.entries()) {
      if (ahora - timestamp > this.tiempoLimite) {
        this.procesados.delete(codigo);
      }
    }
  };

  // Limpiar todos los códigos procesados (para nueva ruta)
  limpiarProcesados = () => {
    if (this.procesados) {
      this.procesados.clear();
      console.log('🧹 Todos los códigos procesados limpiados');
    }
  };
}

export default new BarcodeService();