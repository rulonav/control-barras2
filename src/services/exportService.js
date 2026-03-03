// src/services/exportService.js
import * as FileSystem from 'expo-file-system';
import { Share } from 'react-native';
import { formatters } from '../utils/formatters';

class ExportService {
  constructor() {
    this.directorio = FileSystem.documentDirectory + 'exports/';
  }

  // ✅ COMPARTIR REPORTE COMO TEXTO EN EL MENSAJE
  exportarReporteTexto = async (ruta, usuario, productos) => {
    try {
      console.log('📤 Compartiendo reporte como texto...', {
        ruta: ruta?.numero,
        usuario: usuario?.nombre,
        productos: productos?.length
      });

      // Generar contenido del reporte como texto
      const contenido = formatters.generarReporteTexto(ruta, usuario, productos);

      // ✅ CORREGIDO: Asegurar que los saltos de línea sean interpretados correctamente
      const mensajeFormateado = contenido
        .replace(/\\n/g, '\n')  // Convertir \n literales a saltos reales
        .replace(/\n{3,}/g, '\n\n'); // Limitar saltos múltiples

      // Compartir directamente como texto en el mensaje
      const resultado = await Share.share({
        message: mensajeFormateado,
        title: `📋 Reporte Ruta ${ruta.numero} - ${usuario.estacion}`
      });

      console.log('✅ Reporte compartido exitosamente');
      return {
        success: true,
        mensaje: 'Reporte compartido como texto en el mensaje',
        resultadoShare: resultado
      };
    } catch (error) {
      console.error('❌ Error exportando reporte:', error);
      return {
        success: false,
        error: error.message,
        mensaje: 'Error al compartir el reporte'
      };
    }
  };

  // ✅ COMPARTIR CSV COMO TEXTO EN EL MENSAJE
  exportarReporteCSV = async (ruta, usuario, productos) => {
    try {
      console.log('📤 Compartiendo CSV como texto...');
      
      // ✅ CORREGIDO: Usar saltos de línea explícitos con \n real
      let csvContent = 'Código,Fecha Escaneo,Detalle,Es Mellizo,Es Dañado\n';
      
      productos.forEach(producto => {
        const fecha = formatters.formatFecha(producto.timestamp, true);
        const detalle = (producto.detalle || '').replace(/"/g, '""'); // Escape comillas
        const esMellizo = producto.es_mellizo ? 'Sí' : 'No';
        const esDanado = producto.es_danado ? 'Sí' : 'No';
        // ✅ CORREGIDO: Saltos de línea explícitos reales
        csvContent += `"${producto.codigo}","${fecha}","${detalle}","${esMellizo}","${esDanado}"\n`;
      });

      // Compartir CSV como texto en el mensaje
      const resultado = await Share.share({
        message: csvContent,
        title: `📊 CSV Ruta ${ruta.numero} - ${usuario.estacion}`
      });

      console.log('✅ CSV compartido exitosamente');
      return {
        success: true,
        mensaje: 'CSV compartido como texto en el mensaje',
        resultadoShare: resultado
      };
    } catch (error) {
      console.error('❌ Error exportando CSV:', error);
      return {
        success: false,
        error: error.message
      };
    }
  };

  // ✅ COMPARTIR AMBOS FORMATOS COMO TEXTO
  exportarAmbosFormatos = async (ruta, usuario, productos) => {
    try {
      console.log('📤 Compartiendo ambos formatos como texto...');
      
      // Generar reporte de texto
      const reporteTexto = formatters.generarReporteTexto(ruta, usuario, productos);
      
      // Generar CSV con saltos explícitos reales
      let csvContent = 'Código,Fecha Escaneo,Detalle,Es Mellizo,Es Dañado\n';
      productos.forEach(producto => {
        const fecha = formatters.formatFecha(producto.timestamp, true);
        const detalle = (producto.detalle || '').replace(/"/g, '""');
        const esMellizo = producto.es_mellizo ? 'Sí' : 'No';
        const esDanado = producto.es_danado ? 'Sí' : 'No';
        csvContent += `"${producto.codigo}","${fecha}","${detalle}","${esMellizo}","${esDanado}"\n`;
      });

      // ✅ CORREGIDO: Combinar con saltos de línea explícitos reales
      const mensajeCompleto = 
        `📋 REPORTE DE RUTA ${ruta.numero}\n` +
        `👤 Operador: ${usuario.nombre} ${usuario.apellido}\n` +
        `🏢 Estación: ${usuario.estacion}\n` +
        `📅 Fecha: ${new Date().toLocaleDateString()}\n\n` +
        `📝 RESUMEN:\n${reporteTexto}\n\n` +
        `📊 DATOS EN FORMATO CSV:\n${csvContent}`;

      const resultado = await Share.share({
        message: mensajeCompleto,
        title: `📋 Reporte Completo Ruta ${ruta.numero}`
      });

      console.log('✅ Ambos formatos compartidos exitosamente');
      return {
        success: true,
        mensaje: 'Ambos formatos compartidos como texto en el mensaje',
        resultadoShare: resultado
      };
    } catch (error) {
      console.error('❌ Error exportando ambos formatos:', error);
      return {
        success: false,
        error: error.message
      };
    }
  };

  // Funciones de utilidad (sin cambios)
  crearDirectorioExport = async () => {
    const info = await FileSystem.getInfoAsync(this.directorio);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(this.directorio, { intermediates: true });
    }
  };

  limpiarArchivosAntiguos = async (dias = 7) => {
    try {
      await this.crearDirectorioExport();
      const archivos = await FileSystem.readDirectoryAsync(this.directorio);
      const ahora = new Date().getTime();
      const milisegundosPorDia = 24 * 60 * 60 * 1000;
      
      for (const archivo of archivos) {
        const rutaArchivo = this.directorio + archivo;
        const info = await FileSystem.getInfoAsync(rutaArchivo);
        if (info.exists && info.modificationTime) {
          const diferenciaTiempo = ahora - info.modificationTime;
          if (diferenciaTiempo > dias * milisegundosPorDia) {
            await FileSystem.deleteAsync(rutaArchivo);
          }
        }
      }
    } catch (error) {
      console.error('Error limpiando archivos antiguos:', error);
    }
  };
}

export default new ExportService();