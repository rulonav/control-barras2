// src/utils/formatters.js
/**
 * Convierte una fecha a formato Argentina (DD/MM/YYYY HH:mm)
 * Maneja null, undefined, strings SQL y objetos Date
 * Siempre devuelve un string válido
 * ✅ CORREGIDO: Parsea fechas SQLite como UTC para conversión automática a hora local
 */
export const formatters = {
  formatFecha: (fecha, incluirHora = true) => {
    // Caso 1: No hay fecha
    if (fecha == null) {
      return incluirHora ? 'Fecha no disponible' : 'Fecha no disp.';
    }

    let fechaObj;

    // Caso 2: Es un string (típico de SQLite: "2026-01-02 10:08:31")
    if (typeof fecha === 'string') {
      if (fecha.trim() === '') {
        return incluirHora ? 'Fecha vacía' : 'F. vacía';
      }
      // Intentar parsear como ISO si tiene "T"
      if (fecha.includes('T')) {
        fechaObj = new Date(fecha);
      } else {
        // ✅ CORREGIDO: Formato SQLite - PARSEAR COMO UTC para conversión automática
        const match = fecha.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
        if (match) {
          // Crear fecha en UTC: JavaScript convertirá automáticamente a hora local al usar getHours()
          fechaObj = new Date(Date.UTC(
            parseInt(match[1], 10),           // año
            parseInt(match[2], 10) - 1,       // mes (0-indexed)
            parseInt(match[3], 10),           // día
            parseInt(match[4], 10),           // hora
            parseInt(match[5], 10),           // minutos
            parseInt(match[6], 10)            // segundos
          ));
        } else {
          // Último intento
          fechaObj = new Date(fecha);
        }
      }
    }
    // Caso 3: Ya es un Date
    else if (fecha instanceof Date) {
      fechaObj = fecha;
    }
    // Caso 4: Otro tipo (número, boolean, etc.)
    else {
      return incluirHora ? 'Fecha inválida' : 'F. inválida';
    }

    // Validar fecha
    if (!fechaObj || isNaN(fechaObj.getTime())) {
      return incluirHora ? 'Fecha inválida' : 'F. inválida';
    }

    // ✅ Formatear usando métodos que devuelven hora LOCAL (automáticamente convertida desde UTC)
    const day = String(fechaObj.getDate()).padStart(2, '0');
    const month = String(fechaObj.getMonth() + 1).padStart(2, '0');
    const year = fechaObj.getFullYear();
    const hours = String(fechaObj.getHours()).padStart(2, '0');
    const minutes = String(fechaObj.getMinutes()).padStart(2, '0');

    // ✅ Siempre devolver string
    if (incluirHora) {
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    }
    return `${day}/${month}/${year}`;
  },

  formatNumero: (numero) => {
    if (numero == null) return '0';
    return String(numero).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  },

  limpiarCodigoReporte: (codigo) => {
    if (!codigo) return '';
    const codigoStr = String(codigo);
    const soloNumeros = codigoStr.replace(/[^0-9]/g, '');
    return soloNumeros;
  },

  // ✅ CORREGIDO: Dañados separados de mellizos, incluso si es ambos
  generarReporteTexto: (ruta, usuario, productos, limiteInferior = null, limiteSuperior = null) => {
    if (!Array.isArray(productos)) productos = [];

    // Filtrar por rango si se proporcionan límites
    let productosFiltrados = productos;
    if (limiteInferior && limiteSuperior) {
      productosFiltrados = productos.filter(p => {
        const codigoNum = parseInt(String(p.codigo ?? '').replace(/[^0-9]/g, ''), 10);
        return codigoNum >= limiteInferior && codigoNum <= limiteSuperior;
      });
    }

    const estadisticas = productosFiltrados.reduce((acc, producto) => {
      acc.total++;
      if (producto.es_danado) acc.danados++;
      if (producto.es_mellizo) acc.mellizos++;
      return acc;
    }, { total: 0, danados: 0, mellizos: 0 });

    // ✅ ENCABEZADO DEL REPORTE
    let reporte = `📋 REPORTE DE CONTROL\n`;
    reporte += `👤 ${usuario?.nombre || 'N/A'} ${usuario?.apellido || ''}\n`;
    reporte += `🏢 Estación: ${usuario?.estacion || 'N/A'}\n`;
    reporte += `🛣️ Ruta: ${ruta?.numero || 'N/A'}\n`;
    reporte += `📅 ${formatters.formatFecha(ruta?.fecha, true)}\n`;
    reporte += `\n📦 PAQUETES ESCANEADOS (${estadisticas.total}):\n`;

    // ✅ 1. LISTA LIMPIA DE CÓDIGOS (sin repeticiones, sin detalles)
    const codigosUnicos = {};
    productosFiltrados.forEach(p => {
      const codigoLimpio = formatters.limpiarCodigoReporte(p.codigo);
      if (!codigosUnicos[codigoLimpio]) {
        codigosUnicos[codigoLimpio] = { count: 0, danado: false, mellizo: false };
      }
      codigosUnicos[codigoLimpio].count++;
      if (p.es_danado) codigosUnicos[codigoLimpio].danado = true;
      if (p.es_mellizo) codigosUnicos[codigoLimpio].mellizo = true;
    });

    // Imprimir solo los códigos únicos, uno por línea
    Object.keys(codigosUnicos).forEach(codigo => {
      if (!codigo) return;
      reporte += `${codigo}\n`;
    });

    // ✅ 2. SECCIÓN MELLIZOS (solo los que tienen count > 1)
    const mellizos = Object.entries(codigosUnicos)
      .filter(([_, info]) => info.count > 1)
      .sort((a, b) => a[0].localeCompare(b[0])); // Ordenar por código

    if (mellizos.length > 0) {
      reporte += `\n////////////////////////\n`;
      reporte += `📌 DETALLES:\n`;
      
      mellizos.forEach(([codigo, info]) => {
        reporte += `• ${codigo}: Mellizo ${info.count}\n`;
      });
    }

    // ✅ 3. SECCIÓN DAÑADOS (separada, incluso si ya aparece en mellizos)
    const danados = Object.entries(codigosUnicos)
      .filter(([_, info]) => info.danado)
      .sort((a, b) => a[0].localeCompare(b[0])); // Ordenar por código

    if (danados.length > 0) {
      // Solo agregar separador si ya hubo sección de mellizos
      if (mellizos.length > 0) {
        reporte += `////////////////////////\n`;
      } else {
        reporte += `\n////////////////////////\n`;
        reporte += `📌 DETALLES:\n`;
      }
      
      danados.forEach(([codigo, _]) => {
        // ✅ Formato con asterisco para dañados
        reporte += `*${codigo} ⚠️ DAÑADO\n`;
      });
    }

    // ✅ CORREGIDO: Asegurar que los saltos sean interpretados correctamente
    return reporte.replace(/\\n/g, '\n');
  }
};