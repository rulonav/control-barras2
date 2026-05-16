// src/screens/ControlListScreen.js
import React, { useState } from 'react';
import { View, ScrollView, Alert } from 'react-native';
import {
  Card,
  Button,
  Title,
  Text,
  ActivityIndicator,
  Divider
} from 'react-native-paper';
import * as DocumentPicker from 'expo-document-picker';
import databaseService from '../services/databaseService';
import { styles } from '../styles/ControlListScreenStyles';

const ControlListScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
  const [procesoCompletado, setProcesoCompletado] = useState(false);
  const [resultadoControl, setResultadoControl] = useState(null);

  const seleccionarArchivo = async () => {
    try {
      setLoading(true);
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
        setArchivoSeleccionado({
          nombre: archivo.name,
          uri: archivo.uri,
          tamaño: archivo.size,
          tipo: archivo.mimeType,
        });
        setProcesoCompletado(false);
        setResultadoControl(null);
        
        Alert.alert(
          'Archivo Seleccionado',
          `¿Continuar con el archivo: ${archivo.name}?`,
          [
            { text: 'Cancelar', style: 'cancel' },
            { text: 'Continuar', onPress: () => iniciarProcesoControl() }
          ]
        );
      }
    } catch (error) {

      Alert.alert('Error', 'No se pudo seleccionar el archivo');
    } finally {
      setLoading(false);
    }
  };

  // ✅ MEJORADO: Manejo de errores mejorado con databaseService.compararConArchivo
  const iniciarProcesoControl = async () => {
    try {
      setLoading(true);
      
      if (archivoSeleccionado) {
        const resultado = await databaseService.compararConArchivo(archivoSeleccionado);

        setResultadoControl(resultado);
        setProcesoCompletado(true);
        
        Alert.alert(
          'Control Completado',
          `Proceso de control finalizado.\n${resultado.detalles}`,
          [
            { text: 'Ver Reporte', onPress: () => mostrarReporte(resultado) },
            { text: 'Aceptar', style: 'default' }
          ]
        );
      }
    } catch (error) {

      Alert.alert(
        'Error en Control',
        'No se pudo completar el proceso de control: ' + error.message,
        [{ text: 'Entendido' }]
      );
    } finally {
      setLoading(false);
    }
  };

  const mostrarReporte = (resultado) => {
    Alert.alert(
      'Reporte de Control',
      `📊 RESUMEN:\n\n` +
      `✅ Coincidencias: ${resultado.coincidencias}\n` +
      `⚠️ Diferencias: ${resultado.diferencias}\n` +
      `📦 Total en archivo: ${resultado.totalArchivo}\n` +
      `📦 Total escaneado: ${resultado.totalEscaneado}\n\n` +
      `${resultado.detalles}`,
      [{ text: 'Aceptar' }]
    );
  };

  const formatearTamaño = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.headerCard}>
        <Card.Content>
          <Title style={styles.title}>Controlar Listado</Title>
          <Text style={styles.subtitle}>
            Importe un archivo CSV o Excel para comparar con los escaneos realizados
          </Text>
        </Card.Content>
      </Card>

      <Card style={styles.instructionsCard}>
        <Card.Content>
          <Title style={styles.instructionsTitle}>Instrucciones</Title>
          <Text style={styles.instructionItem}>
            • Seleccione un archivo CSV o Excel{'\n'}
            • El archivo debe contener columnas: fecha, route_name, unit_id{'\n'}
            • Se comparará automáticamente con las rutas escaneadas{'\n'}
            • Se generará un reporte de coincidencias y diferencias
          </Text>
        </Card.Content>
      </Card>

      {archivoSeleccionado && (
        <Card style={styles.fileCard}>
          <Card.Content>
            <Title style={styles.fileTitle}>Archivo Seleccionado</Title>
            <Text style={styles.fileInfo}>📄 {archivoSeleccionado.nombre}</Text>
            <Text style={styles.fileInfo}>📊 {formatearTamaño(archivoSeleccionado.tamaño)}</Text>
            <Text style={styles.fileInfo}>🗂️ {archivoSeleccionado.tipo || 'Tipo desconocido'}</Text>
          </Card.Content>
        </Card>
      )}

      {procesoCompletado && resultadoControl && (
        <Card style={styles.resultCard}>
          <Card.Content>
            <Title style={styles.resultTitle}>✅ Control Completado</Title>
            <Text style={styles.resultText}>
              El proceso de control ha finalizado.
            </Text>
            <Divider style={{ marginVertical: 10 }} />
            <Text style={styles.resultDetail}>
              ✅ Coincidencias: {resultadoControl.coincidencias}{'\n'}
              ⚠️ Diferencias: {resultadoControl.diferencias}{'\n'}
              📦 Total archivo: {resultadoControl.totalArchivo}{'\n'}
              📦 Total escaneado: {resultadoControl.totalEscaneado}
            </Text>
          </Card.Content>
        </Card>
      )}

      <View style={styles.actionsContainer}>
        <Button
          mode="contained"
          onPress={seleccionarArchivo}
          style={styles.primaryButton}
          loading={loading}
          disabled={loading}
          icon="file-import"
        >
          {archivoSeleccionado ? 'Cambiar Archivo' : 'Seleccionar Archivo'}
        </Button>

        {archivoSeleccionado && !procesoCompletado && (
          <Button
            mode="outlined"
            onPress={iniciarProcesoControl}
            style={styles.secondaryButton}
            loading={loading}
            disabled={loading}
            icon="play"
          >
            Iniciar Control
          </Button>
        )}

        {procesoCompletado && (
          <Button
            mode="contained"
            onPress={() => mostrarReporte(resultadoControl)}
            style={styles.successButton}
            icon="chart-bar"
          >
            Ver Reporte Completo
          </Button>
        )}

        <Button
          mode="text"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          Volver al Menú
        </Button>
      </View>
    </ScrollView>
  );
};

export default ControlListScreen;