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
  ScrollView,
  Platform,
  PermissionsAndroid,
  Button
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

console.log('🔍 [ScannerInterface] Iniciando módulo...');

const TEMP_KEY_PREFIX = 'temp_scan_buffer_';

// ✅ Componentes internos definidos aquí mismo
const FeedbackOverlay = ({ resultado, mensajeError }) => {
  console.log('📟 [FeedbackOverlay] Renderizando:', resultado ? 'ÉXITO' : 'ERROR', mensajeError);
  if (!resultado && !mensajeError) return null;
  return (
    <View style={[styles.feedbackOverlay, resultado ? styles.feedbackSuccess : styles.feedbackError]}>
      <Text style={styles.feedbackText}>{resultado ? '✅ Escaneo exitoso' : `❌ ${mensajeError || 'Error'}`}</Text>
    </View>
  );
};

const ScannerHeader = ({ ruta, modoDefectuoso, flash, getFlashIcon, toggleModoDefectuoso, toggleFlash, handleMarcarDefectuoso, handleSalir }) => {
  console.log('📟 [ScannerHeader] Renderizando header para ruta:', ruta?.nombre);
  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Text style={styles.rutaTitle}>Ruta: {ruta.nombre || 'Sin nombre'}</Text>
        <TouchableOpacity onPress={handleSalir} style={styles.exitButton}>
          <Text style={styles.exitButtonText}>🚪 Salir</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.controls}>
        <TouchableOpacity onPress={toggleFlash} style={styles.controlButton}>
          <Text style={styles.controlIcon}>{getFlashIcon()}</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={toggleModoDefectuoso} 
          style={[styles.controlButton, modoDefectuoso && styles.controlButtonActive]}
        >
          <Text style={styles.controlText}>{modoDefectuoso ? '🔴 Defectuoso ON' : '⚪ Defectuoso OFF'}</Text>
        </TouchableOpacity>
        {!modoDefectuoso && (
          <TouchableOpacity onPress={handleMarcarDefectuoso} style={styles.controlButtonSecondary}>
            <Text style={styles.controlText}>📦 Marcar Existente</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const ExitConfirmationModal = ({ visible, onConfirmar, onCancelar }) => {
  console.log('📟 [ExitConfirmationModal] Visible:', visible);
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>¿Confirmar salida?</Text>
          <Text style={styles.modalMessage}>Los productos escaneados se guardarán automáticamente.</Text>
          <View style={styles.modalButtons}>
            <Button title="Cancelar" onPress={onCancelar} color="#666" />
            <Button title="Salir" onPress={onConfirmar} color="#d32f2f" />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const ManualInputModal = ({ visible, onClose, onConfirmar }) => {
  const [codigo, setCodigo] = useState('');
  
  useEffect(() => {
    if (visible) {
      setCodigo('');
      console.log('📟 [ManualInputModal] Abierto, input reseteado');
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Ingreso Manual</Text>
          <TextInput
            style={styles.input}
            placeholder="Código de barras"
            value={codigo}
            onChangeText={setCodigo}
            autoFocus
            onSubmitEditing={() => {
              console.log('📟 [ManualInputModal] Código ingresado:', codigo);
              onConfirmar(codigo);
            }}
          />
          <View style={styles.modalButtons}>
            <Button title="Cancelar" onPress={onClose} color="#666" />
            <Button title="Aceptar" onPress={() => { onConfirmar(codigo); onClose(); }} color="#2196F3" />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const ModalDefectuosos = ({ visible, productos, onClose, onConfirmar }) => {
  const [seleccionados, setSeleccionados] = useState([]);
  console.log('📟 [ModalDefectuosos] Visible:', visible, 'Productos:', productos?.length);

  const toggleSeleccion = (id) => {
    console.log('📟 [ModalDefectuosos] Toggle producto ID:', id);
    setSeleccionados(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const confirmar = () => {
    console.log('📟 [ModalDefectuosos] Confirmando seleccionados:', seleccionados.length);
    if (seleccionados.length === 0) {
      Alert.alert('ℹ️ Info', 'Seleccione al menos un producto');
      return;
    }
    onConfirmar(seleccionados);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContentLarge}>
          <Text style={styles.modalTitle}>Marcar como Defectuosos</Text>
          <ScrollView style={styles.productList}>
            {productos.map(prod => (
              <TouchableOpacity
                key={prod.id}
                style={[styles.productItem, seleccionados.includes(prod.id) && styles.productItemSelected]}
                onPress={() => toggleSeleccion(prod.id)}
              >
                <Text style={styles.productCode}>{prod.codigo}</Text>
                <Text style={styles.productDate}>{new Date(prod.fecha_escaneo).toLocaleString()}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.modalButtons}>
            <Button title="Cancelar" onPress={onClose} color="#666" />
            <Button title={`Confirmar (${seleccionados.length})`} onPress={confirmar} color="#d32f2f" />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const ScannerInterface = ({ ruta, userData, navigation, modoDefectuoso = false, rangoEscaneo = null }) => {
  console.log('📱 [ScannerInterface] Montando componente para ruta:', ruta?.nombre || ruta?.id);
  
  // Estados principales
  const [flash, setFlash] = useState(Camera.Constants.FlashMode.off);
  const [totalGuardados, setTotalGuardados] = useState(0);
  const [ultimoResultado, setUltimoResultado] = useState(null);
  const [mensajeError, setMensajeError] = useState('');
  const [mostrarModalManual, setMostrarModalManual] = useState(false);
  const [mostrarModalSalida, setMostrarModalSalida] = useState(false);
  const [mostrarModalDefectuosos, setMostrarModalDefectuosos] = useState(false);
  const [productosParaDefectuosos, setProductosParaDefectuosos] = useState([]);
  const [modoDefectuosoLocal, setModoDefectuosoLocal] = useState(modoDefectuoso);
  const [salidaPendiente, setSalidaPendiente] = useState(false);
  const [hasPermission, setHasPermission] = useState(null);
  const [permissionError, setPermissionError] = useState(null);
  const [codigoManual, setCodigoManual] = useState('');
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(true);
  
  // Refs
  const cameraRef = useRef(null);
  const scanBuffer = useRef([]);
  const lastThreeCodes = useRef([]);
  const scanning = useRef(false);
  const feedbackAnim = useRef(new Animated.Value(0)).current;
  const modoDefectuosoRef = useRef(modoDefectuosoLocal);
  const rutaIdRef = useRef(ruta.id);
  
  // Constantes de Camera
  const CameraType = Camera.Constants.Type;
  const BarcodeType = Camera.Constants.BarCodeTypes;
  const FlashMode = Camera.Constants.FlashMode;

  console.log('🔧 [ScannerInterface] Estados inicializados');
  console.log('🔧 [ScannerInterface] CameraType:', CameraType ? 'OK' : 'UNDEFINED');
  console.log('🔧 [ScannerInterface] BarcodeType:', BarcodeType ? 'OK' : 'UNDEFINED');

  useEffect(() => { 
    console.log('🔄 [ScannerInterface] Actualizando modoDefectuosoRef:', modoDefectuosoLocal);
    modoDefectuosoRef.current = modoDefectuosoLocal; 
  }, [modoDefectuosoLocal]);
  
  useEffect(() => { 
    console.log('🔄 [ScannerInterface] Actualizando rutaIdRef:', ruta.id);
    rutaIdRef.current = ruta.id; 
  }, [ruta.id]);

  // Actualizar límites de rango
  useEffect(() => {
    if (rangoEscaneo && rangoEscaneo.inicial && rangoEscaneo.final) {
      console.log('📊 [ScannerInterface] Configurando rango:', rangoEscaneo.inicial, '-', rangoEscaneo.final);
      const inferior = parseInt(rangoEscaneo.inicial);
      const superior = parseInt(rangoEscaneo.final);
      barcodeService.actualizarLimites(inferior, superior);
    }
  }, [rangoEscaneo]);

  // Mantener pantalla encendida
  useEffect(() => {
    console.log('⏰ [ScannerInterface] Activando keep-awake');
    activateKeepAwakeAsync();
    return () => {
      console.log('⏰ [ScannerInterface] Desactivando keep-awake');
      deactivateKeepAwake();
    };
  }, []);

  // Protección de salida Android
  useEffect(() => {
    console.log('🔙 [ScannerInterface] Registrando handler de botón atrás');
    const handleBack = () => {
      console.log('🔙 [ScannerInterface] Botón atrás presionado');
      setSalidaPendiente(true);
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => {
      console.log('🔙 [ScannerInterface] Removiendo handler de botón atrás');
      backHandler.remove();
    };
  }, []);

  // ✅ SOLICITAR PERMISOS DE CÁMARA - SIN TIMEOUT AGRESIVO
  useEffect(() => {
    let isMounted = true;

    const requestCameraPermission = async () => {
      console.log('📷 [ScannerInterface] Solicitando permisos de cámara...');
      try {

        // ✅ ANDROID: Solicitar permiso nativo primero si es necesario
        if (Platform.OS === 'android') {
          try {
            console.log('📷 [ScannerInterface] Solicitando permiso Android nativo...');
            const granted = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.CAMERA,
              {
                title: 'Permiso de Cámara',
                message: 'Control de Barras necesita acceso a la cámara para escanear códigos',
                buttonNeutral: 'Preguntar después',
                buttonNegative: 'Cancelar',
                buttonPositive: 'OK',
              }
            );
            console.log('📷 [ScannerInterface] Resultado permiso Android:', granted);
            if (granted !== PermissionsAndroid.RESULTS.GRANTED && granted !== 'granted') {

              if (isMounted) {
                setHasPermission(false);
                setPermissionError('Permiso denegado en configuración');
              }
              return;
            }
          } catch (permError) {
            console.error('❌ [ScannerInterface] Error solicitando permiso Android:', permError);
          }
        }

        // ✅ Expo Camera permission - SIN TIMEOUT
        console.log('📷 [ScannerInterface] Solicitando permiso Expo Camera...');
        const { status } = await Camera.requestCameraPermissionsAsync();
        
        if (isMounted) {

          console.log('📷 [ScannerInterface] Estado permiso Expo:', status);
          setHasPermission(status === 'granted');
          if (status !== 'granted') {
            setPermissionError('Permiso no concedido');
          }
        }
      } catch (error) {
        console.error('❌ [ScannerInterface] Error general en permisos:', error);
        if (isMounted) {
          setHasPermission(false);
          setPermissionError(error.message || 'Error desconocido');
        }
      }
    };

    requestCameraPermission();

    return () => { isMounted = false; };
  }, []);

  // ✅ CARGAR BUFFER Y PRODUCTOS
  useEffect(() => {
    const load = async () => {
      console.log('💾 [ScannerInterface] Cargando buffer y productos...');
      try {
        await recoveryService.inicializarRecuperacion(ruta);
        const saved = await AsyncStorage.getItem(`${TEMP_KEY_PREFIX}${ruta.id}`);
        if (saved) {
          scanBuffer.current = JSON.parse(saved);
          console.log('💾 [ScannerInterface] Buffer cargado:', scanBuffer.current.length, 'items');
        }
        const recuperacion = await recoveryService.recuperarProductos();
        if (recuperacion.productos?.length > 0) console.log('🔄 Productos recuperados:', recuperacion.productos.length);
        const productos = await databaseService.obtenerProductosRuta(ruta.id);
        setTotalGuardados(productos.length);
        setProductosParaDefectuosos(productos);
        console.log('💾 [ScannerInterface] Total productos cargados:', productos.length);
      } catch (err) { console.warn('⚠️ Error cargando buffer:', err); }
    };
    load();
  }, [ruta.id]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (scanBuffer.current.length > 0) {
        console.log('⏰ [ScannerInterface] Flush automático, buffer:', scanBuffer.current.length);
        flushBuffer();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Función flushBuffer con logs
  const flushBuffer = async () => {
    if (scanBuffer.current.length === 0) {
      console.log('💾 [ScannerInterface] flushBuffer: buffer vacío, saltando');
      return;
    }
    console.log('💾 [ScannerInterface] flushBuffer: procesando', scanBuffer.current.length, 'items');
    const currentBuffer = [...scanBuffer.current];
    const currentRutaId = rutaIdRef.current;
    try {
      const items = currentBuffer.map(item => {
        const codigo = typeof item === 'object' ? item.codigo : item;
        const es_defectuoso = typeof item === 'object' ? item.es_defectuoso : (modoDefectuosoRef.current ? 1 : 0);
        return { codigo, ruta_id: currentRutaId, es_defectuoso, timestamp: new Date().toISOString() };
      });
      console.log('💾 [ScannerInterface] flushBuffer: insertando', items.length, 'productos en DB');
      await databaseService.bulkInsertProductos(items);
      scanBuffer.current = [];
      await AsyncStorage.removeItem(`${TEMP_KEY_PREFIX}${currentRutaId}`);
      const productos = await databaseService.obtenerProductosRuta(currentRutaId);
      setTotalGuardados(productos.length);
      setProductosParaDefectuosos(productos);
      for (const item of items) await recoveryService.guardarProducto(item);
      console.log('✅ [ScannerInterface] flushBuffer: completado, total guardados:', productos.length);

      return true;
    } catch (err) {
      console.error('❌ [ScannerInterface] flushBuffer: error:', err);
      return false;
    }
  };

  // ✅ FUNCIONES FALTANTES - AGREGADAS CON LOGS
  const requestPermissions = async () => {
    console.log('📷 [ScannerInterface] requestPermissions: solicitando permisos manualmente...');
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CAMERA,
          {
            title: 'Permiso de Cámara',
            message: 'Control de Barras necesita acceso a la cámara',
            buttonNegative: 'Cancelar',
            buttonPositive: 'OK',
          }
        );
        console.log('📷 [ScannerInterface] Resultado permiso Android:', granted);
      }
      const { status } = await Camera.requestCameraPermissionsAsync();
      console.log('📷 [ScannerInterface] Resultado permiso Expo:', status);
      setHasPermission(status === 'granted');
    } catch (error) {
      console.error('❌ [ScannerInterface] Error en requestPermissions:', error);
    }
  };

  const confirmarProductosDefectuosos = useCallback(async (ids) => {
    console.log('🔴 [ScannerInterface] confirmarProductosDefectuosos:', ids.length, 'productos');
    try {
      for (const id of ids) {
        await databaseService.marcarProductoComoDefectuoso(id);
      }
      Alert.alert('✅ Éxito', `${ids.length} producto(s) marcado(s) como defectuoso(s)`);
      const productos = await databaseService.obtenerProductosRuta(ruta.id);
      setTotalGuardados(productos.length);
      setProductosParaDefectuosos(productos);
    } catch (error) {
      console.error('❌ [ScannerInterface] Error marcando defectuosos:', error);
      Alert.alert('Error', 'No se pudieron marcar los productos: ' + error.message);
    }
  }, [ruta.id]);

  const handleSalir = useCallback(() => {
    console.log('🚪 [ScannerInterface] handleSalir: usuario quiere salir');
    setMostrarModalSalida(true);
  }, []);

  const confirmarSalida = useCallback(async () => {
    console.log('🚪 [ScannerInterface] confirmarSalida: confirmando salida...');
    try {
      if (scanBuffer.current.length > 0) {
        console.log('💾 [ScannerInterface] flushBuffer antes de salir:', scanBuffer.current.length, 'items');
        const guardado = await flushBuffer();
        if (!guardado) Alert.alert('⚠️ Advertencia', 'No se pudieron guardar todos los productos');
      }
      const productos = await databaseService.obtenerProductosRuta(ruta.id);
      if (productos.length === 0) {
        console.log('🗑️ [ScannerInterface] Eliminando ruta vacía');
        await databaseService.eliminarRuta(ruta.id);
      } else {
        console.log('✅ [ScannerInterface] Finalizando ruta con', productos.length, 'productos');
        await databaseService.finalizarRuta(ruta.id);
      }
      await recoveryService.limpiarRecuperacion();
      deactivateKeepAwake();
      if (navigation?.goBack) {
        console.log('🔙 [ScannerInterface] Navegando atrás');
        navigation.goBack();
      }
    } catch (error) {
      console.error('❌ [ScannerInterface] Error en confirmarSalida:', error);
      Alert.alert('Error', 'No se pudo completar la salida: ' + error.message);
    } finally {
      setMostrarModalSalida(false);
    }
  }, [ruta, navigation]);

  const showFeedback = useCallback((success) => {
    setFeedbackSuccess(success);
    setFeedbackVisible(true);
    feedbackAnim.setValue(0);
    Animated.sequence([
      Animated.timing(feedbackAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(600),
      Animated.timing(feedbackAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setFeedbackVisible(false));
  }, [feedbackAnim]);

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
      scanBuffer.current.push({ codigo: cleanCode, es_defectuoso: modoDefectuosoRef.current ? 1 : 0 });
      lastThreeCodes.current = [...lastThreeCodes.current.slice(-2), cleanCode];
      barcodeService.registrarCodigoProcesado(cleanCode);
      await audioService.playSuccessSound();
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      showFeedback(true);
      if (scanBuffer.current.length >= 10) await flushBuffer();
    } catch (error) {

      await audioService.playErrorSound();
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      showFeedback(false);
    }
  }, [showFeedback, flushBuffer]);

  const handleBarCodeScanned = useCallback(async ({ data }) => {
    if (scanning.current || !data) return;
    scanning.current = true;
    await processCode(data);
    setTimeout(() => { scanning.current = false; }, 800);
  }, [processCode]);

  // ✅ INGRESO MANUAL CON VALIDACIÓN DE RANGO
  const handleIngresoManual = useCallback(() => { setManualInputVisible(true); setCodigoManual(''); }, []);
  const confirmarCodigoManual = useCallback(() => {
    if (!codigoManual.trim()) return;
    
    // Validar que el código esté dentro del rango si existe
    if (rangoEscaneo && rangoEscaneo.inicial && rangoEscaneo.final) {
      const codigoNumerico = parseInt(codigoManual.replace(/\D/g, ''));
      if (codigoNumerico < rangoEscaneo.inicial || codigoNumerico > rangoEscaneo.final) {
        Alert.alert(
          '⚠️ Código Fuera de Rango',
          `El código ${codigoManual} no está dentro del rango válido (${rangoEscaneo.inicial} - ${rangoEscaneo.final})`,
          [{ text: 'Aceptar', style: 'cancel' }]
        );
        return;
      }
    }
    
    processCode(codigoManual);
    setManualInputVisible(false);
    setCodigoManual('');
  }, [codigoManual, processCode, rangoEscaneo]);
  const toggleFlash = useCallback(() => {
    setFlash(prev => prev === Camera.Constants.FlashMode.torch ? Camera.Constants.FlashMode.off : Camera.Constants.FlashMode.torch);
  }, []);
  const getFlashIcon = useCallback(() => flash === Camera.Constants.FlashMode.torch ? '🔦' : '💡', [flash]);
  const toggleModoDefectuoso = useCallback(() => {
    setModoDefectuosoLocal(prev => {
      const nuevoEstado = !prev;
      if (nuevoEstado) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); audioService.playSuccessSound(); }
      else { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }
      return nuevoEstado;
    });
  }, []);

  const handleMarcarDefectuoso = async () => {
    try {
      const productos = await databaseService.obtenerProductosRuta(ruta.id);
      const productosNoDefectuosos = productos.filter(p => !p.es_defectuoso);
      if (productosNoDefectuosos.length === 0) { Alert.alert('ℹ️ Info', 'No hay productos para marcar como defectuosos'); return; }
      setProductosParaDefectuosos(productosNoDefectuosos);
      setMostrarModalDefectuosos(true);
    } catch (error) {
      console.error('❌ Error obteniendo productos:', error);
      Alert.alert('Error', 'No se pudieron cargar los productos para marcar como defectuosos');
    }
  };

  return (
    <View style={styles.container}>
      {!hasPermission ? (
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>📷 Permiso de cámara requerido</Text>
          <Button title="Abrir configuración" onPress={requestPermissions} />
        </View>
      ) : (
        <>
          <Camera
            ref={cameraRef}
            style={styles.camera}
            type={CameraType.back}
            flashMode={flash}
            onBarCodeScanned={modoDefectuosoLocal ? null : handleBarCodeScanned}
            barcodeScannerSettings={{
              barcodeTypes: [
                BarcodeType.barcode128,
                BarcodeType.barcode39,
                BarcodeType.barcode93,
                BarcodeType.code25,
                BarcodeType.code39,
                BarcodeType.code93,
                BarcodeType.codabar,
                BarcodeType.ean13,
                BarcodeType.ean8,
                BarcodeType.upc_a,
                BarcodeType.upc_e,
                BarcodeType.itf14,
                BarcodeType.pdf417,
                BarcodeType.qr,
                BarcodeType.aztec,
                BarcodeType.datamatrix,
              ],
            }}
          />
          
          {/* Overlay de feedback visual */}
          {ultimoResultado && (
            <FeedbackOverlay
              resultado={ultimoResultado}
              mensajeError={mensajeError}
            />
          )}

          {/* Header con controles */}
          <ScannerHeader
            ruta={ruta}
            modoDefectuoso={modoDefectuosoLocal}
            flash={flash}
            getFlashIcon={getFlashIcon}
            toggleModoDefectuoso={toggleModoDefectuoso}
            toggleFlash={toggleFlash}
            handleMarcarDefectuoso={handleMarcarDefectuoso}
            handleSalir={handleSalir}
          />

          {/* Modal de productos defectuosos */}
          {mostrarModalDefectuosos && (
            <ModalDefectuosos
              visible={mostrarModalDefectuosos}
              productos={productosParaDefectuosos}
              onClose={() => setMostrarModalDefectuosos(false)}
              onConfirmar={confirmarProductosDefectuosos}
            />
          )}

          {/* Modal de salida */}
          {mostrarModalSalida && (
            <ExitConfirmationModal
              visible={mostrarModalSalida}
              onConfirmar={confirmarSalida}
              onCancelar={() => setMostrarModalSalida(false)}
            />
          )}

          {/* Modal de ingreso manual */}
          {mostrarModalManual && (
            <ManualInputModal
              visible={mostrarModalManual}
              onClose={() => setMostrarModalManual(false)}
              onConfirmar={confirmarCodigoManual}
            />
          )}
        </>
      )}
    </View>
  );
};

export default ScannerInterface;
