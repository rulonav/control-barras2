import { Alert } from 'react-native';
import databaseService from '../services/databaseService';
import { verificarFechaExpiracion } from '../utils/dateUtils';

export const useRutaOperations = () => {
  // La creación de ruta ahora solo devuelve la ruta creada
  const crearRuta = async (rutaData) => {

    try {
      if (verificarFechaExpiracion()) {

        Alert.alert('Actualización requerida', 'Esta versión ya no es válida. Por favor, actualice la app.');
        return null;
      }

      if (!rutaData) {
        throw new Error('Datos de ruta no proporcionados');
      }

      const { numero, usuario_id } = rutaData;

      if (!numero || !usuario_id) {
        throw new Error('Número de ruta y usuario_id son obligatorios');
      }

      const usuarioId = parseInt(usuario_id, 10);
      if (isNaN(usuarioId) || usuarioId <= 0) {

        throw new Error('ID de usuario inválido');
      }

      const nuevaRuta = await databaseService.crearRuta({
        numero: String(numero).trim(), // Asegurar que sea string
        usuario_id: usuarioId
      });

      if (!nuevaRuta || !nuevaRuta.id) {

        throw new Error('No se pudo crear la ruta en la base de datos');
      }

      return nuevaRuta; // Devolver la ruta creada

    } catch (error) {

      throw error; // Propagar el error para que ScannerScreen lo maneje
    }
  };

  const finalizarRuta = async (rutaId) => {

    try {
      if (!rutaId) throw new Error('ID de ruta no proporcionado');
      await databaseService.finalizarRuta(rutaId);

    } catch (error) {

      throw error;
    }
  };

  return {
    crearRuta,
    finalizarRuta
  };
};