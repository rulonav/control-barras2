// src/components/ScannerInterface.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  TextInput,
  Modal,
  BackHandler,
  ScrollView
} from 'react-native';
import { Camera } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import databaseService from '../services/databaseService';
import barcodeService from '../services/barcodeService';
import audioService from '../services/audioService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import recoveryService from '../services/RecoveryService';
import { styles } from '../styles/ScannerInterfaceStyles';

const TEMP_KEY_PREFIX = 'temp_scan_buffer_';

const ScannerInterface = ({ ruta, userData, navigation, modoDanado = false, rangoEscaneo = null }) => {
  const [flash, setFlash] = useState(Camera.Constants.FlashMode.off);
  const [totalGuardados, setTotalGuardados] = useState(0);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(true);
  const [manualInputVisible, setManualInputVisible] = useState(false);
  const [codigoManual, setCodigoManual] = useState('');
  const [hasPermission, setHasPermission] = useState(null);
  const [mostrarModalDanados, setMostrarModalDanados] = useState(false);
  const [productosParaDanar, setProductosParaDanar] = useState([]);
  const [modoDanadoLocal, setModoDanadoLocal] = useState(modoDanado);
  
  const scanBuffer = useRef([]);
  const lastThreeCodes = useRef([]);
  const scanning = useRef(false);
  const feedbackAnim = useRef(new Animated.Value(0)).current;
  const modoDanadoRef = useRef(modoDanadoLocal);
  const rutaIdRef = useRef(ruta.id);

  // ✅ ACTUALIZAR REFS CUANDO CAMBIAN LAS PROPS
  useEffect(() => {
    modoDanadoRef.current = modoDanadoLocal;
  }, [modoDanadoLocal]);

  useEffect(() => {
    rutaIdRef.current = ruta.id;
  }, [ruta.id]);

  // ✅ CONFIGURAR LÍMITES DE ESCANEO SI VIENEN EN rangoEscaneo
  useEffect(() => {
    if (rangoEscaneo && rangoEscaneo.inicial && rangoEscaneo.final) {
      const inferior = parseInt(rangoEscaneo.inicial) * 1000000000;
      const superior = parseInt(rangoEscaneo.final) * 1000000000;
      barcodeService.actualizarLimites(inferior, superior);
      console.log('📊 Límites de escaneo configurados:', inferior, '-', superior);
    }
  }, [rangoEscaneo]);

  // ✅ MANTENER PANTALLA ENCENDIDA
  useEffect(() => {
    activateKeepAwakeAsync();
    console.log('🔆 Pantalla mantendida encendida');
    return () => {
      deactivateKeepAwake();
      console.log('🌙 Keep-awake desactivado');
    };
  }, []);

  // ✅ MANEJAR BOTÓN FÍSICO DE RETROCESO
  useEffect(() => {
    const onBackPress = () => {
      Alert.alert(
        '⚠️ Confirmar Salida',
        `¿Estás seguro que deseas salir?
📦 Productos escaneados: ${totalGuardados + scanBuffer.current.length}
⚠️ Los productos en buffer se guardarán automáticamente.`,
        [
          {
            text: '❌ Cancelar',
            style: 'cancel',
            onPress: () => console.log('Salida cancelada')
          },
          {
            text: '✅ Salir',
            style: 'destructive',
            onPress: async () => {
              try {
                await flushBuffer();
                deactivateKeepAwake();
                if (navigation?.goBack) {
                  navigation.goBack();
                }
              } catch (error) {
                console.error('❌ Error al salir:', error);
                Alert.alert('Error', 'No se pudo guardar el buffer');
              }
            }
          }
        ],
        { cancelable: false }
      );
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => {
      backHandler.remove();
    };
  }, [totalGuardados, navigation]);

  // ✅ SOLICITAR PERMISOS DE CÁMARA
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Camera.requestCameraPermissionsAsync();
        setHasPermission(status === 'granted');
      } catch (error) {
        console.error('❌ Error solicitando permisos:', error);
        setHasPermission(false);
      }
    })();
  }, []);

  // ✅ PRE-CARGAR SONIDOS
  useEffect(() => {
    audioService.preloadAllSounds();
  }, []);

  // ✅ CARGAR BUFFER Y PRODUCTOS EXISTENTES + INICIALIZAR RECUPERACIÓN
  useEffect(() => {
    const load = async () => {
      try {
        await recoveryService.inicializarRecuperacion(ruta);
        const saved = await AsyncStorage.getItem(`${TEMP_KEY_PREFIX}${ruta.id}`);
        if (saved) {
          scanBuffer.current = JSON.parse(saved);
        }
        const recuperacion = await recoveryService.recuperarProductos();
        if (recuperacion.productos && recuperacion.productos.length > 0) {
          console.log('🔄 Productos recuperados:', recuperacion.productos.length);
        }
        const productos = await databaseService.obtenerProductosRuta(ruta.id);
        setTotalGuardados(productos.length);
        setProductosParaDanar(productos);
      } catch (err) {
        console.warn('⚠️ Error cargando buffer:', err);
      }
    };
    load();
  }, [ruta.id]);

  // ✅ GUARDADO AUTOMÁTICO CADA 10 SEGUNDOS
  useEffect(() => {
    const interval = setInterval(() => {
      if (scanBuffer.current.length > 0) {
        flushBuffer();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // ✅ LIMPIAR RUTA VACÍA AL SALIR
  useEffect(() => {
    return () => {
      const cleanup = async () => {
        try {
          const productos = await databaseService.obtenerProductosRuta(ruta.id);
          if (productos.length === 0 && scanBuffer.current.length === 0) {
            await databaseService.eliminarRuta(ruta.id);
            console.log('🗑️ Ruta vacía eliminada');
          } else {
            await flushBuffer();
            console.log('📦 Buffer final guardado');
          }
          await recoveryService.limpiarRecuperacion();
        } catch (err) {
          console.warn('⚠️ Error en limpieza:', err);
        }
      };
      cleanup();
    };
  }, [ruta.id]);

  // ✅ GUARDAR BUFFER EN BASE DE DATOS
  const flushBuffer = async () => {
    if (scanBuffer.current.length === 0) return;
    const currentBuffer = [...scanBuffer.current];
    const currentRutaId = rutaIdRef.current;
    try {
      const items = currentBuffer.map(item => {
        const codigo = typeof item === 'object' ? item.codigo : item;
        const es_danado = typeof item === 'object' ? item.es_danado : (modoDanadoRef.current ? 1 : 0);
        return {
          codigo,
          ruta_id: currentRutaId,
          es_danado,
          timestamp: new Date().toISOString(),
        };
      });
      await databaseService.bulkInsertProductos(items);
      scanBuffer.current = [];
      await AsyncStorage.removeItem(`${TEMP_KEY_PREFIX}${currentRutaId}`);
      const productos = await databaseService.obtenerProductosRuta(currentRutaId);
      setTotalGuardados(productos.length);
      setProductosParaDanar(productos);
      for (const item of items) {
        await recoveryService.guardarProducto(item);
      }
      console.log(`✅ Buffer guardado: ${items.length} productos`);
    } catch (err) {
      console.error('❌ Error al guardar buffer:', err);
    }
  };

  // ✅ MOSTRAR FEEDBACK VISUAL - SIN FADE, APARICIÓN INMEDIATA MÁS ARRIBA
  const showFeedback = useCallback((success) => {
    setFeedbackSuccess(success);
    setFeedbackVisible(true);
    // ✅ Resetear animación y mostrar inmediatamente sin fade
    feedbackAnim.setValue(1);
    // ✅ Ocultar después de 400ms sin animación de fade-out
    setTimeout(() => {
      setFeedbackVisible(false);
      feedbackAnim.setValue(0);
    }, 400);
  }, [feedbackAnim]);

  // ✅ PROCESAR CÓDIGO ESCANEADO
  const processCode = useCallback(async (rawCode) => {
    if (!rawCode) return;
    try {
      const cleanCode = barcodeService.limpiarCodigo(rawCode);
      if (!cleanCode) {
        await audioService.playErrorSound();
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showFeedback(false);
        return;
      }
      if (barcodeService.esCodigoReciente(cleanCode)) {
        await audioService.playErrorSound();
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        showFeedback(false);
        return;
      }
      // Agregar al buffer con estado defectuoso si corresponde
      scanBuffer.current.push({
        codigo: cleanCode,
        es_danado: modoDanadoRef.current ? 1 : 0
      });
      lastThreeCodes.current = [...lastThreeCodes.current.slice(-2), cleanCode];
      barcodeService.registrarCodigoProcesado(cleanCode);
      // Feedback de éxito
      await audioService.playSuccessSound();
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      showFeedback(true);
      // Flush automático si hay 10 productos
      if (scanBuffer.current.length >= 10) {
        await flushBuffer();
      }
    } catch (error) {
      console.error('❌ Error procesando código:', error);
      await audioService.playErrorSound();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showFeedback(false);
    }
  }, [showFeedback, flushBuffer]);

  // ✅ MANEJAR ESCANEO DE CÁMARA
  const handleBarCodeScanned = useCallback(async ({ data }) => {
    if (scanning.current || !data) return;
    scanning.current = true;
    await processCode(data);
    setTimeout(() => {
      scanning.current = false;
    }, 800);
  }, [processCode]);

  // ✅ INGRESO MANUAL
  const handleIngresoManual = useCallback(() => {
    setManualInputVisible(true);
    setCodigoManual('');
  }, []);

  const confirmarCodigoManual = useCallback(() => {
    if (codigoManual.trim()) {
      processCode(codigoManual);
      setManualInputVisible(false);
      setCodigoManual('');
    }
  }, [codigoManual, processCode]);

  // ✅ LINTERNA
  const toggleFlash = useCallback(() => {
    setFlash(prev =>
      prev === Camera.Constants.FlashMode.torch
        ? Camera.Constants.FlashMode.off
        : Camera.Constants.FlashMode.torch
    );
  }, []);

  const getFlashIcon = useCallback(() => {
    return flash === Camera.Constants.FlashMode.torch ? '🔦' : '💡';
  }, [flash]);

  // ✅ TOGGLE MODO DEFECTUOSO
  const toggleModoDanado = useCallback(() => {
    setModoDanadoLocal(prev => {
      const nuevoEstado = !prev;
      if (nuevoEstado) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        audioService.playSuccessSound();
      } else {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      return nuevoEstado;
    });
  }, []);

  // ✅ MARCAR PRODUCTO COMO DAÑADO (vía modal, no botón directo)
  const handleMarcarDanado = async () => {
    try {
      const productos = await databaseService.obtenerProductosRuta(ruta.id);
      const productosNoDanados = productos.filter(p => !p.es_danado);
      if (productosNoDanados.length === 0) {
        Alert.alert('ℹ️ Info', 'No hay productos para marcar como dañados');
        return;
      }
      setProductosParaDanar(productosNoDanados);
      setMostrarModalDanados(true);
    } catch (error) {
      console.error('❌ Error obteniendo productos:', error);
      Alert.alert('Error', 'No se pudieron cargar los productos');
    }
  };

  const confirmarMarcarDanado = async (producto) => {
    try {
      await databaseService.actualizarProducto(producto.id, {
        es_danado: 1,
        detalle: 'DAÑADO'
      });
      Alert.alert('✅ Éxito', 'Producto marcado como dañado');
      setMostrarModalDanados(false);
      const productos = await databaseService.obtenerProductosRuta(ruta.id);
      setTotalGuardados(productos.length);
      setProductosParaDanar(productos);
    } catch (error) {
      console.error('❌ Error marcando como dañado:', error);
      Alert.alert('Error', 'No se pudo marcar el producto');
    }
  };

  // ✅ FINALIZAR RUTA CON DETECCIÓN DE MELLIZOS
  const handleFinalizar = useCallback(async () => {
    Alert.alert(
      '🏁 Finalizar Ruta',
      `¿Estás seguro que deseas FINALIZAR la ruta ${ruta.numero}?
📦 Productos escaneados: ${totalGuardados + scanBuffer.current.length}
✅ Esto guardará todos los productos y detectará mellizos.`,
      [
        {
          text: '❌ Cancelar',
          style: 'cancel',
          onPress: () => console.log('❌ Cancelado')
        },
        {
          text: '✅ Finalizar y Salir',
          style: 'default',
          onPress: async () => {
            try {
              await flushBuffer();
              const productos = await databaseService.obtenerProductosRuta(ruta.id);
              // Detectar y marcar mellizos
              const conteo = {};
              productos.forEach(p => {
                conteo[p.codigo] = (conteo[p.codigo] || 0) + 1;
              });
              for (const p of productos) {
                if (conteo[p.codigo] > 1) {
                  await databaseService.actualizarProducto(p.id, { es_mellizo: 1 });
                }
              }
              await databaseService.finalizarRuta(ruta.id);
              await recoveryService.limpiarRecuperacion();
              deactivateKeepAwake();
              if (navigation?.navigate) {
                navigation.navigate('Reporte', { ruta, productos });
              } else {
                navigation.goBack();
              }
            } catch (error) {
              console.error('💥 Error al finalizar:', error);
              Alert.alert('Error', 'No se finalizó la ruta.');
            }
          }
        }
      ],
      { cancelable: false }
    );
  }, [ruta, totalGuardados, flushBuffer, navigation]);

  // ✅ VERIFICAR PERMISOS
  if (hasPermission === null) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>Solicitando permisos de cámara...</Text>
      </View>
    );
  }
  if (hasPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>❌ Permiso de cámara denegado</Text>
        <Text style={styles.permissionSubtext}>Ve a Configuración → Aplicaciones → Control de Barras → Permisos</Text>
        <TouchableOpacity
          style={[styles.button, { marginTop: 20, backgroundColor: '#2196F3' }]}
          onPress={() => {
            Camera.requestCameraPermissionsAsync().then(({ status }) => {
              setHasPermission(status === 'granted');
            });
          }}
        >
          <Text style={styles.buttonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.headerText}>🛣️ {ruta.numero}</Text>
        <Text style={styles.headerText}>📦 {totalGuardados + scanBuffer.current.length}</Text>
      </View>

      {/* BANNER MODO DEFECTUOSO */}
      {modoDanadoLocal && (
        <View style={styles.defectBannerActive}>
          <Text style={styles.defectText}>⚠️ MODO DEFECTUOSO ACTIVO</Text>
          <Text style={styles.defectSubtext}>Los próximos escaneos se marcarán como dañados</Text>
        </View>
      )}

      {/* CÁMARA */}
      <Camera
        style={StyleSheet.absoluteFill}
        type={Camera.Constants.Type.back}
        onBarCodeScanned={handleBarCodeScanned}
        flashMode={flash}
        barCodeScannerSettings={{
          barcodeTypes: ['qr', 'ean13', 'code128', 'code39', 'upc_e']
        }}
      >
        <View style={styles.overlay}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>
          <View style={styles.scanLine} />
        </View>
      </Camera>

      {/* ✅ CÍRCULO DE FEEDBACK - SIN FADE, POSICIÓN MÁS ARRIBA */}
      {feedbackVisible && (
        <Animated.View
          style={[
            styles.feedbackCircle,
            {
              // ✅ Posición más arriba: top 35% en lugar de 45%
              top: '35%',
              // ✅ Sin animación de fade: opacity siempre 1, scale siempre 1
              opacity: 1,
              transform: [{ scale: 1 }],
              backgroundColor: feedbackSuccess
                ? (modoDanadoLocal ? '#ff9800' : '#4CAF50')
                : '#F44336',
            },
          ]}
        />
      )}

      {/* BOTONES - ✅ BOTÓN DAÑADO ELIMINADO */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, flash === Camera.Constants.FlashMode.torch ? styles.activeButton : null]}
          onPress={toggleFlash}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>{getFlashIcon()}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.button,
            modoDanadoLocal ? styles.defectButtonActive : styles.defectButton
          ]}
          onPress={toggleModoDanado}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>
            {modoDanadoLocal ? '🔧 Normal' : '⚠️ Defectuoso'}
          </Text>
        </TouchableOpacity>
        
        {/* ✅ BOTÓN DAÑADO ELIMINADO - SOLO ACCESO VÍA MODAL */}
        
        <TouchableOpacity
          style={[styles.button, styles.finalizarButton]}
          onPress={handleFinalizar}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>🏁</Text>
        </TouchableOpacity>
      </View>

      {/* LABELS - ✅ LABEL DAÑADO ELIMINADO */}
      <View style={styles.labelContainer}>
        <Text style={styles.buttonLabel}>Linterna</Text>
        <Text style={[styles.buttonLabel, modoDanadoLocal && styles.defectLabel]}>
          {modoDanadoLocal ? '🔧 Normal' : '⚠️ Defectuoso'}
        </Text>
        <Text style={styles.buttonLabel}>Finalizar</Text>
      </View>

      {/* MODAL INGRESO MANUAL */}
      <Modal
        visible={manualInputVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setManualInputVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🔢 Ingresar Código Manual</Text>
            <Text style={styles.modalHint}>Ej: 45684857329 (11 dígitos)</Text>
            <TextInput
              style={styles.input}
              value={codigoManual}
              onChangeText={setCodigoManual}
              placeholder="Ingrese el código..."
              keyboardType="numeric"
              maxLength={20}
              autoFocus
              onSubmitEditing={confirmarCodigoManual}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, { flex: 1, backgroundColor: '#6c757d', marginRight: 5 }]}
                onPress={() => {
                  setManualInputVisible(false);
                  setCodigoManual('');
                }}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, { flex: 1, backgroundColor: '#4CAF50', marginLeft: 5 }]}
                onPress={confirmarCodigoManual}
                disabled={!codigoManual.trim()}
              >
                <Text style={styles.buttonText}>Aceptar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL PRODUCTO DAÑADO */}
      <Modal
        visible={mostrarModalDanados}
        transparent
        animationType="slide"
        onRequestClose={() => setMostrarModalDanados(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⚠️ Seleccionar Producto Dañado</Text>
            <Text style={styles.modalHint}>
              {productosParaDanar.length} productos disponibles
            </Text>
            <ScrollView style={styles.modalList}>
              {productosParaDanar.map((producto, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.productoItem}
                  onPress={() => confirmarMarcarDanado(producto)}
                >
                  <Text style={styles.productoItemText}>{producto.codigo}</Text>
                  <Text style={styles.productoItemDetail}>
                    {producto.detalle || 'Normal'} - {new Date(producto.timestamp).toLocaleTimeString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, { flex: 1, backgroundColor: '#f44336' }]}
                onPress={() => setMostrarModalDanados(false)}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ScannerInterface;