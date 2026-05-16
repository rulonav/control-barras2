// src/components/RutaForm.js
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Alert, ScrollView } from 'react-native';
import { Card, Button, Title, HelperText } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../styles/FormRutaStyles';

// ✅ CLAVES PARA PERSISTENCIA DE PREFERENCIAS
const STORAGE_KEYS = {
  PREFIJO1: 'ruta_prefijo1_default',
  PREFIJO2: 'ruta_prefijo2_default',
  TIPO_RUTA: 'ruta_tipo_default'
};

const RutaForm = ({ onCrearRuta, userData }) => {
  const [tipoRuta, setTipoRuta] = useState('numerica');
  const [nombreRuta, setNombreRuta] = useState('');
  // ✅ VALORES POR DEFECTO CORREGIDOS
  const [prefijo1, setPrefijo1] = useState('45');
  const [prefijo2, setPrefijo2] = useState('47');
  const [cargandoPreferencias, setCargandoPreferencias] = useState(true);

  // ✅ CARGAR PREFERENCIAS GUARDADAS AL MONTAR
  useEffect(() => {
    const cargarPreferencias = async () => {
      try {
        const [p1, p2, tipo] = await AsyncStorage.multiGet([
          STORAGE_KEYS.PREFIJO1,
          STORAGE_KEYS.PREFIJO2,
          STORAGE_KEYS.TIPO_RUTA
        ]);

        if (p1[1]) setPrefijo1(p1[1]);
        if (p2[1]) setPrefijo2(p2[1]);
        if (tipo[1]) setTipoRuta(tipo[1]);
      } catch (error) {
        console.warn('⚠️ No se pudieron cargar preferencias:', error);
      } finally {
        setCargandoPreferencias(false);
      }
    };
    cargarPreferencias();
  }, []);

  // ✅ GUARDAR PREFERENCIAS CUANDO CAMBIAN
  useEffect(() => {
    if (!cargandoPreferencias) {
      AsyncStorage.multiSet([
        [STORAGE_KEYS.PREFIJO1, prefijo1],
        [STORAGE_KEYS.PREFIJO2, prefijo2],
        [STORAGE_KEYS.TIPO_RUTA, tipoRuta]
      ]).catch(error => console.warn('⚠️ No se pudieron guardar preferencias:', error));
    }
  }, [prefijo1, prefijo2, tipoRuta, cargandoPreferencias]);

  const handleCrear = () => {
    // Validar prefijos (deben ser 2 dígitos numéricos)
    if (!/^\d{2}$/.test(prefijo1)) {
      Alert.alert('Error', 'El primer prefijo debe tener exactamente 2 dígitos numéricos (Ej: 45)');
      return;
    }
    if (!/^\d{2}$/.test(prefijo2)) {
      Alert.alert('Error', 'El segundo prefijo debe tener exactamente 2 dígitos numéricos (Ej: 47)');
      return;
    }
    // Validar que prefijo1 sea menor que prefijo2
    if (parseInt(prefijo1) >= parseInt(prefijo2)) {
      Alert.alert('Error', 'El primer prefijo debe ser menor que el segundo prefijo');
      return;
    }
    // Validar nombre de ruta
    if (!nombreRuta.trim()) {
      Alert.alert('Error', 'El nombre/número de ruta no puede estar vacío');
      return;
    }
    // Construir nombre final de la ruta
    let nombreFinal = nombreRuta.trim();
    if (tipoRuta === 'numerica') {
      const soloNumeros = nombreRuta.replace(/\D/g, '');
      if (!soloNumeros || soloNumeros.length === 0 || soloNumeros.length > 7) {
        Alert.alert('Error', 'El número de ruta debe tener entre 1 y 7 dígitos');
        return;
      }
      nombreFinal = `AM1__${soloNumeros}`;
    }
    
    // ✅ CORREGIDO: CÁLCULO DEL RANGO
    // prefijo1 define el inicio: 45 -> 45000000000
    // prefijo2 define el fin: 47 -> 47999999999
    const codigoInicial = `${prefijo1}${'0'.repeat(9)}`;  // "45" + "000000000" = "45000000000"
    const codigoFinal = `${prefijo2}${'9'.repeat(9)}`;    // "47" + "999999999" = "47999999999"
    
    // ✅ PASAR LOS PREFIJOS Y CÓDIGOS CALCULADOS CORRECTAMENTE
    onCrearRuta(nombreFinal, tipoRuta, {
      prefijo1: parseInt(prefijo1),
      prefijo2: parseInt(prefijo2),
      codigoInicial: parseInt(codigoInicial),  // 45000000000
      codigoFinal: parseInt(codigoFinal)       // 47999999999
    });
  };

  // ✅ PREVIEW DEL RANGO CORREGIDO
  const codigoInicialPreview = `${prefijo1}${'0'.repeat(9)}`;
  const codigoFinalPreview = `${prefijo2}${'9'.repeat(9)}`;

  if (cargandoPreferencias) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center', marginTop: 20 }}>Cargando preferencias...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>📋 Crear Nueva Ruta</Title>
          
          {/* ✅ SECCIÓN DE RANGO - CON CÁLCULO CORREGIDO */}
          <View style={styles.rangoSection}>
            <Title style={styles.rangoTitle}>🔢 Rango de Códigos a Escanear</Title>
            <HelperText type="info">
              Los códigos escaneados deberán estar dentro de este rango
            </HelperText>
            
            <View style={styles.rangoInputs}>
              {/* PRIMER PREFIJO - INICIO DEL RANGO */}
              <View style={styles.rangoInputWrapper}>
                <Text style={styles.rangoLabel}>Desde (Ej: 45)</Text>
                <TextInput
                  style={[styles.rangoInput, styles.inputVisibleBorder]}
                  value={prefijo1}
                  onChangeText={(text) => {
                    const soloNumeros = text.replace(/\D/g, '').slice(0, 2);
                    setPrefijo1(soloNumeros);
                  }}
                  placeholder="45"
                  keyboardType="numeric"
                  maxLength={2}
                  textAlign="center"
                  placeholderTextColor="#999"
                />
                <Text style={styles.rangoPreview}>
                  = {prefijo1 || '??'}000000000
                </Text>
              </View>
              
              <Text style={styles.rangoSeparator}>→</Text>
              
              {/* SEGUNDO PREFIJO - FIN DEL RANGO */}
              <View style={styles.rangoInputWrapper}>
                <Text style={styles.rangoLabel}>Hasta (Ej: 47)</Text>
                <TextInput
                  style={[styles.rangoInput, styles.inputVisibleBorder]}
                  value={prefijo2}
                  onChangeText={(text) => {
                    const soloNumeros = text.replace(/\D/g, '').slice(0, 2);
                    setPrefijo2(soloNumeros);
                  }}
                  placeholder="47"
                  keyboardType="numeric"
                  maxLength={2}
                  textAlign="center"
                  placeholderTextColor="#999"
                />
                <Text style={styles.rangoPreview}>
                  = {prefijo2 || '??'}999999999
                </Text>
              </View>
            </View>
            
            {/* PREVIEW DEL RANGO COMPLETO - CORREGIDO */}
            {prefijo1.length === 2 && prefijo2.length === 2 && (
              <View style={styles.rangoPreviewContainer}>
                <Text style={styles.rangoPreviewText}>
                  📊 Rango válido: {codigoInicialPreview} - {codigoFinalPreview}
                </Text>
                <Text style={styles.rangoPreviewSubtext}>
                  ({parseInt(prefijo1)}000000000 → {parseInt(prefijo2)}999999999)
                </Text>
              </View>
            )}
          </View>

          {/* SEPARADOR */}
          <View style={styles.divider} />

          {/* TIPO DE RUTA */}
          <Text style={styles.label}>Tipo de Ruta</Text>
          <View style={styles.tipoSelector}>
            <Button
              mode={tipoRuta === 'destinada' ? 'contained' : 'outlined'}
              onPress={() => setTipoRuta('destinada')}
              style={[styles.tipoButton, tipoRuta === 'destinada' && styles.tipoButtonActive]}
            >
              Destinada
            </Button>
            <Button
              mode={tipoRuta === 'numerica' ? 'contained' : 'outlined'}
              onPress={() => setTipoRuta('numerica')}
              style={[styles.tipoButton, tipoRuta === 'numerica' && styles.tipoButtonActive]}
            >
              Número
            </Button>
            <Button
              mode={tipoRuta === 'precinto' ? 'contained' : 'outlined'}
              onPress={() => setTipoRuta('precinto')}
              style={[styles.tipoButton, tipoRuta === 'precinto' && styles.tipoButtonActive]}
            >
              Precinto
            </Button>
          </View>

          {/* NOMBRE/NÚMERO DE RUTA */}
          <Text style={styles.label}>
            {tipoRuta === 'numerica'
              ? 'Número de Ruta (se agregará AM1__)'
              : tipoRuta === 'destinada'
              ? 'Código de Ruta (Ej: KD1, A321)'
              : 'Número de Precinto'}
          </Text>
          <TextInput
            style={[styles.input, styles.inputVisibleBorder]}
            value={nombreRuta}
            onChangeText={setNombreRuta}
            placeholder={
              tipoRuta === 'destinada'
                ? 'Ej: KD1, A321, L9'
                : tipoRuta === 'numerica'
                ? 'Ej: 12 (se guardará como AM1__12)'
                : 'Hasta 9 dígitos'
            }
            autoCapitalize={tipoRuta === 'destinada' ? 'characters' : 'none'}
            keyboardType={tipoRuta === 'destinada' ? 'default' : 'numeric'}
            placeholderTextColor="#999"
          />

          {/* PREVIEW DEL NOMBRE FINAL */}
          {tipoRuta === 'numerica' && nombreRuta.length > 0 && (
            <View style={styles.previewContainer}>
              <Text style={styles.previewText}>
                📋 Se guardará como: <Text style={styles.previewValue}>AM1__{nombreRuta.replace(/\D/g, '')}</Text>
              </Text>
            </View>
          )}

          {/* BOTÓN CREAR RUTA */}
          <Button
            mode="contained"
            onPress={handleCrear}
            style={styles.button}
            disabled={!nombreRuta.trim() || prefijo1.length < 2 || prefijo2.length < 2}
            icon="plus"
          >
            Crear Ruta
          </Button>
          
          {/* HELP TEXT - PERSISTENCIA */}
          <Text style={styles.helpText}>
            💡 Tus preferencias de prefijos se guardarán automáticamente para la próxima vez
          </Text>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

export default RutaForm;