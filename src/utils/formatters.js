// src/utils/formatters.js
export const formatters = {
  formatFecha: (fecha, incluirHora = true) => {
    if (fecha == null) return incluirHora ? 'Fecha no disponible' : 'Fecha no disp.';
    let fechaObj;
    if (typeof fecha === 'string') {
      if (fecha.trim() === '') return incluirHora ? 'Fecha vacía' : 'F. vacía';
      if (fecha.includes('T')) {
        fechaObj = new Date(fecha);
      } else {
        const match = fecha.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
        if (match) {
          fechaObj = new Date(Date.UTC(
            parseInt(match[1], 10),
            parseInt(match[2], 10) - 1,
            parseInt(match[3], 10),
            parseInt(match[4], 10),
            parseInt(match[5], 10),
            parseInt(match[6], 10)
          ));
        } else {
          fechaObj = new Date(fecha);
        }
      }
    } else if (fecha instanceof Date) {
      fechaObj = fecha;
    } else {
      return incluirHora ? 'Fecha inválida' : 'F. inválida';
    }
    if (!fechaObj || isNaN(fechaObj.getTime())) return incluirHora ? 'Fecha inválida' : 'F. inválida';
    const day = String(fechaObj.getDate()).padStart(2, '0');
    const month = String(fechaObj.getMonth() + 1).padStart(2, '0');
    const year = fechaObj.getFullYear();
    const hours = String(fechaObj.getHours()).padStart(2, '0');
    const minutes = String(fechaObj.getMinutes()).padStart(2, '0');
    if (incluirHora) return `${day}/${month}/${year} ${hours}:${minutes}`;
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

  // ✅ DAÑADOS SEPARADOS DE MELLIZOS
  generarReporteTexto: (ruta, usuario, productos, limiteInferior = null, limiteSuperior = null) => {
    if (!Array.isArray(productos)) productos = [];
    let productosFiltrados = productos;
    if (limiteInferior && limiteSuperior) {
      productosFiltrados = productos.filter(p => {
        const codigoNum = parseInt(String(p.codigo ?? '').replace(/[^0-9]/g, ''), 10);
        return codigoNum >= limiteInferior && codigoNum <= limiteSuperior;
      });
    }
    const estadisticas = productosFiltrados.reduce((acc, producto) => {
      acc.total++;
      if (producto.es_defectuoso) acc.defectuosos++;
      if (producto.es_mellizo) acc.mellizos++;
      return acc;
    }, { total: 0, defectuosos: 0, mellizos: 0 });

    let reporte = `📋 REPORTE DE CONTROL\n`;
    reporte += `👤 ${usuario?.nombre || 'N/A'} ${usuario?.apellido || ''}\n`;
    reporte += `🏢 Estación: ${usuario?.estacion || 'N/A'}\n`;
    reporte += `🛣️ Ruta: ${ruta?.numero || 'N/A'}\n`;
    reporte += `📅 ${formatters.formatFecha(ruta?.fecha, true)}\n`;
    reporte += `\n📦 PAQUETES ESCANEADOS (${estadisticas.total}):\n`;

    const codigosUnicos = {};
    productosFiltrados.forEach(p => {
      const codigoLimpio = formatters.limpiarCodigoReporte(p.codigo);
      if (!codigosUnicos[codigoLimpio]) {
        codigosUnicos[codigoLimpio] = { count: 0, defectuoso: false, mellizo: false };
      }
      codigosUnicos[codigoLimpio].count++;
      if (p.es_defectuoso) codigosUnicos[codigoLimpio].defectuoso = true;
      if (p.es_mellizo) codigosUnicos[codigoLimpio].mellizo = true;
    });

    Object.keys(codigosUnicos).forEach(codigo => {
      if (!codigo) return;
      reporte += `${codigo}\n`;
    });

    // ✅ SECCIÓN MELLIZOS
    const mellizos = Object.entries(codigosUnicos)
      .filter(([_, info]) => info.count > 1)
      .sort((a, b) => a[0].localeCompare(b[0]));

    if (mellizos.length > 0) {
      reporte += `\n////////////////////////\n`;
      reporte += `📌 DETALLES:\n`;
      mellizos.forEach(([codigo, info]) => {
        reporte += `• ${codigo}: Mellizo ${info.count}\n`;
      });
    }

    // ✅ SECCIÓN DAÑADOS (SEPARADA)
    const defectuosos = Object.entries(codigosUnicos)
      .filter(([_, info]) => info.defectuoso)
      .sort((a, b) => a[0].localeCompare(b[0]));

    if (defectuosos.length > 0) {
      if (mellizos.length > 0) {
        reporte += `////////////////////////\n`;
      } else {
        reporte += `\n////////////////////////\n`;
        reporte += `📌 DETALLES:\n`;
      }
      defectuosos.forEach(([codigo, _]) => {
        reporte += `*${codigo} ⚠️ DAÑADO\n`;
      });
    }

    return reporte.replace(/\\n/g, '\n');
  }
};