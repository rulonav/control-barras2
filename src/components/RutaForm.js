// src/components/RutaForm.js
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Alert, ScrollView } from 'react-native';
import { Card, Button, Title, HelperText } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../styles/FormRutaStyles';

// ✅ CLAVES PARA PERSISTENCIA DE PREFERENCIAS
const STORAGE_KEYS = {
  PREFIJO1: 'ruta_prefijo_central_default',
  TIPO_RUTA: 'ruta_tipo_default'
};

const RutaForm = ({ onCrearRuta, userData }) => {
  const [tipoRuta, setTipoRuta] = useState('numerica');
  const [nombreRuta, setNombreRuta] = useState('');
  // ✅ VALOR ÚNICO PARA RANGO ±1
  const [prefijo1, setPrefijo1] = useState('45');
  const [cargandoPreferencias, setCargandoPreferencias] = useState(true);

  // ✅ CARGAR PREFERENCIAS GUARDADAS AL MONTAR
  useEffect(() => {
    const cargarPreferencias = async () => {
      try {
        const [p1, tipo] = await AsyncStorage.multiGet([
          STORAGE_KEYS.PREFIJO1,
          STORAGE_KEYS.TIPO_RUTA
        ]);

        if (p1[1]) setPrefijo1(p1[1]);
        if (tipo[1]) setTipoRuta(tipo[1]);
      } catch (error) {

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
        [STORAGE_KEYS.TIPO_RUTA, tipoRuta]
      ]).catch(error => console.warn('⚠️ No se pudieron guardar preferencias:', error));
    }
  }, [prefijo1, tipoRuta, cargandoPreferencias]);

  const handleCrear = () => {
    // Validar prefijo (debe ser 2 dígitos numéricos)
    if (!/^\d{2}$/.test(prefijo1)) {
      Alert.alert('Error', 'El número central debe tener exactamente 2 dígitos numéricos (Ej: 45)');
      return;
    }
    // Validar que el prefijo esté entre 10 y 98 (para que n-1 >= 10 y n+1 <= 99)
    const prefijoCentral = parseInt(prefijo1);
    if (prefijoCentral < 10 || prefijoCentral > 98) {
      Alert.alert('Error', 'El número debe estar entre 10 y 98 para calcular el rango correctamente');
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
    
    // ✅ NUEVA LÓGICA DE RANGO: El usuario ingresa un número de 2 cifras y el rango es ±1
    // Ej: Si pone 45 → rango: 44000000000 a 46000000000
    // Ej: Si pone 48 → rango: 47000000000 a 49000000000
    const codigoInicial = `${prefijoInferior}${'0'.repeat(9)}`;  // ej: 44 + "000000000" = "44000000000"
    const codigoFinal = `${prefijoSuperior}${'0'.repeat(9)}`;    // ej: 46 + "000000000" = "46000000000"
    
    // ✅ PASAR LOS PREFIJOS Y CÓDIGOS CALCULADOS CORRECTAMENTE
    onCrearRuta(nombreFinal, tipoRuta, {
      prefijoCentral: prefijoCentral,        // ej: 45
      prefijoInferior: prefijoInferior,      // ej: 44
      prefijoSuperior: prefijoSuperior,      // ej: 46
      codigoInicial: parseInt(codigoInicial), // 44000000000
      codigoFinal: parseInt(codigoFinal)      // 46000000000
    });
  };

  // ✅ PREVIEW DEL RANGO CON NUEVA LÓGICA ±1
  const prefijoCentralPreview = parseInt(prefijo1) || 0;
  const prefijoInferiorPreview = prefijoCentralPreview - 1;
  const prefijoSuperiorPreview = prefijoCentralPreview + 1;
  const codigoInicialPreview = `${prefijoInferiorPreview}${'0'.repeat(9)}`;
  const codigoFinalPreview = `${prefijoSuperiorPreview}${'0'.repeat(9)}`;

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
          
          {/* ✅ SECCIÓN DE RANGO - CON NUEVA LÓGICA ±1 */}
          <View style={styles.rangoSection}>
            <Title style={styles.rangoTitle}>🔢 Rango de Códigos a Escanear</Title>
            <HelperText type="info">
              Ingresa un número de 2 cifras. El sistema validará códigos desde (n-1)000000000 hasta (n+1)000000000
            </HelperText>
            
            <View style={styles.rangoInputs}>
              {/* PREFIJO CENTRAL - ÚNICO INPUT */}
              <View style={styles.rangoInputWrapper}>
                <Text style={styles.rangoLabel}>Número Central (Ej: 45)</Text>
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
                  Rango: {prefijoInferiorPreview}000000000 → {prefijoSuperiorPreview}000000000
                </Text>
              </View>
            </View>
            
            {/* PREVIEW DEL RANGO COMPLETO - NUEVA LÓGICA */}
            {prefijo1.length === 2 && (
              <View style={styles.rangoPreviewContainer}>
                <Text style={styles.rangoPreviewText}>
                  📊 Rango válido: {codigoInicialPreview} - {codigoFinalPreview}
                </Text>
                <Text style={styles.rangoPreviewSubtext}>
                  (Si ingresas {prefijo1}: desde {prefijoInferiorPreview}000000000 hasta {prefijoSuperiorPreview}000000000)
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
            disabled={!nombreRuta.trim() || prefijo1.length < 2}
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