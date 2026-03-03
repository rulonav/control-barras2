import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { validators } from './validators';

export const fileHandlers = {
  // Seleccionar archivo CSV o Excel
  seleccionarArchivo: async () => {
    try {
      const resultado = await DocumentPicker.getDocumentAsync({
        type: [
          'text/csv',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ],
        copyToCacheDirectory: true,
      });

      if (resultado.assets && resultado.assets.length > 0) {
        const archivo = resultado.assets[0];
        return {
          success: true,
          archivo: {
            nombre: archivo.name,
            uri: archivo.uri,
            tamaño: archivo.size,
            tipo: archivo.mimeType,
          }
        };
      } else {
        return {
          success: false,
          error: 'No se seleccionó ningún archivo'
        };
      }
    } catch (error) {
      console.error('Error seleccionando archivo:', error);
      return {
        success: false,
        error: 'Error al seleccionar el archivo: ' + error.message
      };
    }
  },

  // Leer y parsear archivo CSV
  leerArchivoCSV: async (uri) => {
    try {
      const contenido = await FileSystem.readAsStringAsync(uri);
      const lineas = contenido.split('\n').filter(linea => linea.trim() !== '');
      
      if (lineas.length === 0) {
        throw new Error('El archivo está vacío');
      }

      // Obtener headers (primera línea)
      const headers = lineas[0].split(',').map(header => 
        header.trim().replace(/"/g, '').toLowerCase()
      );

      // Verificar columnas requeridas
      const columnasRequeridas = ['fecha', 'route_name', 'unit_id'];
      const columnasFaltantes = columnasRequeridas.filter(col => 
        !headers.includes(col)
      );

      if (columnasFaltantes.length > 0) {
        throw new Error(`Faltan columnas requeridas: ${columnasFaltantes.join(', ')}`);
      }

      // Parsear datos
      const datos = [];
      for (let i = 1; i < lineas.length; i++) {
        const valores = lineas[i].split(',').map(val => val.trim().replace(/"/g, ''));
        const registro = {};
        
        headers.forEach((header, index) => {
          registro[header] = valores[index] || '';
        });

        // Solo procesar registros con unit_id válido
        if (registro.unit_id && validators.isValidBarcode(registro.unit_id)) {
          datos.push({
            fecha: registro.fecha,
            route_name: registro.route_name,
            unit_id: registro.unit_id,
            numero_ruta: validators.extractRouteNumber(registro.route_name)
          });
        }
      }

      return {
        success: true,
        datos: datos,
        totalRegistros: datos.length,
        headers: headers
      };

    } catch (error) {
      console.error('Error leyendo archivo CSV:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Procesar control contra lista escaneada
  procesarControl: (datosArchivo, productosEscaneados, rutaNumero) => {
    try {
      const fechaActual = new Date().toISOString().split('T')[0];
      
      // Filtrar datos del archivo por fecha actual y ruta
      const datosFiltrados = datosArchivo.filter(registro => {
        const fechaRegistro = registro.fecha.split(' ')[0]; // Solo la fecha
        return fechaRegistro === fechaActual && registro.numero_ruta === rutaNumero;
      });

      const resultados = {
        coincidencias: [],
        faltantesEnArchivo: [],
        faltantesEnEscaneo: [],
        errores: []
      };

      // Buscar coincidencias
      productosEscaneados.forEach(producto => {
        const encontrado = datosFiltrados.find(registro => 
          registro.unit_id === producto.codigo
        );

        if (encontrado) {
          resultados.coincidencias.push({
            ...producto,
            registro: encontrado
          });
        } else {
          resultados.faltantesEnArchivo.push({
            ...producto,
            detalle: 'No está en el Ruteo Primario'
          });
        }
      });

      // Buscar productos en archivo que no fueron escaneados
      datosFiltrados.forEach(registro => {
        const escaneado = productosEscaneados.find(producto => 
          producto.codigo === registro.unit_id
        );

        if (!escaneado) {
          resultados.faltantesEnEscaneo.push({
            codigo: registro.unit_id,
            route_name: registro.route_name,
            detalle: `Paquete de ruta ${registro.numero_ruta}`
          });
        }
      });

      return {
        success: true,
        resultados: resultados,
        resumen: {
          totalEscaneados: productosEscaneados.length,
          totalEnArchivo: datosFiltrados.length,
          coincidencias: resultados.coincidencias.length,
          faltantesEnArchivo: resultados.faltantesEnArchivo.length,
          faltantesEnEscaneo: resultados.faltantesEnEscaneo.length
        }
      };

    } catch (error) {
      console.error('Error procesando control:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Generar reporte de control
  generarReporteControl: (resultados, usuario, ruta) => {
    const { resumen, coincidencias, faltantesEnArchivo, faltantesEnEscaneo } = resultados;
    
    let reporte = `📊 REPORTE DE CONTROL COMPARATIVO\n\n`;
    reporte += `👤 ${usuario.nombre} ${usuario.apellido}\n`;
    reporte += `🏢 Estación: ${usuario.estacion}\n`;
    reporte += `🛣️ Ruta: ${ruta.numero}\n`;
    reporte += `📅 ${new Date().toLocaleDateString('es-ES')}\n\n`;

    reporte += `📈 RESUMEN ESTADÍSTICO:\n`;
    reporte += `• Total escaneados: ${resumen.totalEscaneados}\n`;
    reporte += `• Total en archivo: ${resumen.totalEnArchivo}\n`;
    reporte += `• Coincidencias: ${resumen.coincidencias}\n`;
    reporte += `• Faltantes en archivo: ${resumen.faltantesEnArchivo}\n`;
    reporte += `• Faltantes en escaneo: ${resumen.faltantesEnEscaneo}\n\n`;

    if (faltantesEnArchivo.length > 0) {
      reporte += `❌ FALTANTES EN ARCHIVO (${faltantesEnArchivo.length}):\n`;
      faltantesEnArchivo.forEach(item => {
        reporte += `${item.codigo} - ${item.detalle}\n`;
      });
      reporte += `\n`;
    }

    if (faltantesEnEscaneo.length > 0) {
      reporte += `⚠️ FALTANTES EN ESCANEO (${faltantesEnEscaneo.length}):\n`;
      faltantesEnEscaneo.forEach(item => {
        reporte += `${item.codigo} - ${item.detalle}\n`;
      });
    }

    return reporte;
  }
};