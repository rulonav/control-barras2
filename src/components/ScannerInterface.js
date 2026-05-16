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
  PermissionsAndroid
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
  const [permissionError, setPermissionError] = useState(null);
  const [mostrarModalDanados, setMostrarModalDanados] = useState(false);
  const [productosParaDanar, setProductosParaDanar] = useState([]);
  const [modoDanadoLocal, setModoDanadoLocal] = useState(modoDanado);
  const [salidaPendiente, setSalidaPendiente] = useState(false);
  
  const scanBuffer = useRef([]);
  const lastThreeCodes = useRef([]);
  const scanning = useRef(false);
  const feedbackAnim = useRef(new Animated.Value(0)).current;
  const modoDanadoRef = useRef(modoDanadoLocal);
  const rutaIdRef = useRef(ruta.id);

  useEffect(() => { modoDanadoRef.current = modoDanadoLocal; }, [modoDanadoLocal]);
  useEffect(() => { rutaIdRef.current = ruta.id; }, [ruta.id]);

  useEffect(() => {
    if (rangoEscaneo && rangoEscaneo.inicial && rangoEscaneo.final) {
      const inferior = parseInt(rangoEscaneo.inicial) * 1000000000;
      const superior = parseInt(rangoEscaneo.final) * 1000000000;
      barcodeService.actualizarLimites(inferior, superior);
      console.log('📊 Límites de escaneo configurados:', inferior, '-', superior);
    }
  }, [rangoEscaneo]);

  useEffect(() => {
    activateKeepAwakeAsync();
    return () => deactivateKeepAwake();
  }, []);

  // ✅ PROTECCIÓN DE SALIDA: Android back button
  useEffect(() => {
    const handleBack = () => {
      setSalidaPendiente(true);
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBack);
    return () => backHandler.remove();
  }, []);

  // ✅ SOLICITAR PERMISOS DE CÁMARA - SIN TIMEOUT AGRESIVO
  useEffect(() => {
    let isMounted = true;

    const requestCameraPermission = async () => {
      try {
        console.log('📷 Solicitando permisos de cámara...');
        
        // ✅ ANDROID: Solicitar permiso nativo primero si es necesario
        if (Platform.OS === 'android') {
          try {
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
            if (granted !== PermissionsAndroid.RESULTS.GRANTED && granted !== 'granted') {
              console.warn('⚠️ Permiso de cámara denegado en Android');
              if (isMounted) {
                setHasPermission(false);
                setPermissionError('Permiso denegado en configuración');
              }
              return;
            }
          } catch (permError) {
            console.warn('⚠️ Error solicitando permiso Android:', permError);
          }
        }

        // ✅ Expo Camera permission - SIN TIMEOUT
        const { status } = await Camera.requestCameraPermissionsAsync();
        
        if (isMounted) {
          console.log('📷 Estado del permiso:', status);
          setHasPermission(status === 'granted');
          if (status !== 'granted') {
            setPermissionError('Permiso no concedido');
          }
        }
      } catch (error) {
        console.error('❌ Error solicitando permisos:', error);
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
      try {
        await recoveryService.inicializarRecuperacion(ruta);
        const saved = await AsyncStorage.getItem(`${TEMP_KEY_PREFIX}${ruta.id}`);
        if (saved) scanBuffer.current = JSON.parse(saved);
        const recuperacion = await recoveryService.recuperarProductos();
        if (recuperacion.productos?.length > 0) console.log('🔄 Productos recuperados:', recuperacion.productos.length);
        const productos = await databaseService.obtenerProductosRuta(ruta.id);
        setTotalGuardados(productos.length);
        setProductosParaDanar(productos);
      } catch (err) { console.warn('⚠️ Error cargando buffer:', err); }
    };
    load();
  }, [ruta.id]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (scanBuffer.current.length > 0) flushBuffer();
    }, 10000);
    return () => clearInterval(interval);
  }, []);

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
        } catch (err) { console.warn('⚠️ Error en limpieza:', err); }
      };
      cleanup();
    };
  }, [ruta.id]);

  const flushBuffer = async () => {
    if (scanBuffer.current.length === 0) return;
    const currentBuffer = [...scanBuffer.current];
    const currentRutaId = rutaIdRef.current;
    try {
      const items = currentBuffer.map(item => {
        const codigo = typeof item === 'object' ? item.codigo : item;
        const es_danado = typeof item === 'object' ? item.es_danado : (modoDanadoRef.current ? 1 : 0);
        return { codigo, ruta_id: currentRutaId, es_danado, timestamp: new Date().toISOString() };
      });
      await databaseService.bulkInsertProductos(items);
      scanBuffer.current = [];
      await AsyncStorage.removeItem(`${TEMP_KEY_PREFIX}${currentRutaId}`);
      const productos = await databaseService.obtenerProductosRuta(currentRutaId);
      setTotalGuardados(productos.length);
      setProductosParaDanar(productos);
      for (const item of items) await recoveryService.guardarProducto(item);
      console.log(`✅ Buffer guardado: ${items.length} productos`);
      return true;
    } catch (err) {
      console.error('❌ Error al guardar buffer:', err);
      return false;
    }
  };

  // ✅ CONFIRMAR SALIDA CON MODAL PERSONALIZADO
  const confirmarYSalir = useCallback(async () => {
    try {
      console.log('✅ Confirmando salida para ruta:', ruta.numero);
      if (scanBuffer.current.length > 0) {
        const guardado = await flushBuffer();
        if (!guardado) Alert.alert('⚠️ Advertencia', 'No se pudieron guardar todos los productos');
      }
      const productos = await databaseService.obtenerProductosRuta(ruta.id);
      if (productos.length === 0) {
        await databaseService.eliminarRuta(ruta.id);
        console.log('🗑️ Ruta vacía eliminada');
      } else {
        await databaseService.finalizarRuta(ruta.id);
        console.log('✅ Ruta marcada como finalizada');
      }
      await recoveryService.limpiarRecuperacion();
      deactivateKeepAwake();
      if (navigation?.goBack) navigation.goBack();
    } catch (error) {
      console.error('❌ Error al confirmar salida:', error);
      Alert.alert('Error', 'No se pudo completar la salida: ' + error.message);
    } finally {
      setSalidaPendiente(false);
    }
  }, [ruta, navigation]);

  const cancelarSalida = useCallback(() => {
    setSalidaPendiente(false);
    console.log('❌ Salida cancelada por usuario');
  }, []);

  const handleOverlayPress = useCallback((e) => {
    if (e.target === e.currentTarget) cancelarSalida();
  }, [cancelarSalida]);

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
      scanBuffer.current.push({ codigo: cleanCode, es_danado: modoDanadoRef.current ? 1 : 0 });
      lastThreeCodes.current = [...lastThreeCodes.current.slice(-2), cleanCode];
      barcodeService.registrarCodigoProcesado(cleanCode);
      await audioService.playSuccessSound();
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      showFeedback(true);
      if (scanBuffer.current.length >= 10) await flushBuffer();
    } catch (error) {
      console.error('❌ Error procesando código:', error);
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

  const handleIngresoManual = useCallback(() => { setManualInputVisible(true); setCodigoManual(''); }, []);
  const confirmarCodigoManual = useCallback(() => {
    if (codigoManual.trim()) { processCode(codigoManual); setManualInputVisible(false); setCodigoManual(''); }
  }, [codigoManual, processCode]);
  const toggleFlash = useCallback(() => {
    setFlash(prev => prev === Camera.Constants.FlashMode.torch ? Camera.Constants.FlashMode.off : Camera.Constants.FlashMode.torch);
  }, []);
  const getFlashIcon = useCallback(() => flash === Camera.Constants.FlashMode.torch ? '🔦' : '💡', [flash]);
  const toggleModoDanado = useCallback(() => {
    setModoDanadoLocal(prev => {
      const nuevoEstado = !prev;
      if (nuevoEstado) { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); audioService.playSuccessSound(); }
      else { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }
      return nuevoEstado;
    });
  }, []);

  const handleMarcarDanado = async () => {
    try {
      const productos = await databaseService.obtenerProductosRuta(ruta.id);
      const productosNoDanados = productos.filter(p => !p.es_danado);
      if (productosNoDanados.length === 0) { Alert.alert('ℹ️ Info', 'No hay productos para marcar como dañados'); return; }
      setProductosParaDanar(productosNoDanados);
      setMostrarModalDanados(true);
    } catch (error) { console.error('❌ Error obteniendo productos:', error); Alert.alert('Error', 'No se pudieron cargar los productos'); }
  };

  const confirmarMarcarDanado = async (producto) => {
    try {
      await databaseService.actualizarProducto(producto.id, { es_danado: 1, detalle: 'DAÑADO' });
      Alert.alert('✅ Éxito', 'Producto marcado como dañado');
      setMostrarModalDanados(false);
      const productos = await databaseService.obtenerProductosRuta(ruta.id);
      setTotalGuardados(productos.length);
      setProductosParaDanar(productos);
    } catch (error) { console.error('❌ Error marcando como dañado:', error); Alert.alert('Error', 'No se pudo marcar el producto'); }
  };

  const handleFinalizar = useCallback(async () => {
    Alert.alert('🏁 Finalizar Ruta', `¿Estás seguro que deseas FINALIZAR la ruta ${ruta.numero}?\n📦 Productos escaneados: ${totalGuardados + scanBuffer.current.length}\n✅ Esto guardará todos los productos y detectará mellizos.`, [
      { text: '❌ Cancelar', style: 'cancel', onPress: () => console.log('❌ Cancelado') },
      {
        text: '✅ Finalizar y Salir',
        style: 'default',
        onPress: async () => {
          try {
            await flushBuffer();
            const productos = await databaseService.obtenerProductosRuta(ruta.id);
            const conteo = {};
            productos.forEach(p => { conteo[p.codigo] = (conteo[p.codigo] || 0) + 1; });
            for (const p of productos) { if (conteo[p.codigo] > 1) await databaseService.actualizarProducto(p.id, { es_mellizo: 1 }); }
            await databaseService.finalizarRuta(ruta.id);
            await recoveryService.limpiarRecuperacion();
            deactivateKeepAwake();
            if (navigation?.navigate) navigation.navigate('Reporte', { ruta, productos, fechaCreacion: new Date().toISOString() });
            else if (navigation?.goBack) navigation.goBack();
          } catch (error) { console.error('💥 Error al finalizar:', error); Alert.alert('Error', 'No se finalizó la ruta.'); }
        }
      }
    ], { cancelable: false });
  }, [ruta, totalGuardados, flushBuffer, navigation]);

  // ✅ ABRIR CONFIGURACIÓN DE LA APP PARA PERMISOS
  const abrirConfiguracionPermisos = async () => {
    try {
      if (Platform.OS === 'android') {
        const Intent = await import('react-native').then(m => m.IntentAndroid);
        if (Intent) {
          Intent.openSettings();
        } else {
          const Linking = await import('react-native').then(m => m.Linking);
          Linking.openSettings();
        }
      }
    } catch (e) {
      console.warn('⚠️ No se pudo abrir configuración:', e);
    }
  };

  // ✅ RENDERIZAR ESTADO DE PERMISOS
  if (hasPermission === null && !permissionError) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>📷 Solicitando permisos de cámara...</Text>
        <Text style={styles.permissionSubtext}>Por favor, acepta el permiso en la ventana emergente</Text>
      </View>
    );
  }

  if (hasPermission === false || permissionError) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>❌ Permiso de cámara no disponible</Text>
        <Text style={styles.permissionSubtext}>{permissionError || 'El permiso fue denegado'}</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
          <TouchableOpacity style={[styles.button, { flex: 1, backgroundColor: '#2196F3' }]} onPress={abrirConfiguracionPermisos}><Text style={styles.buttonText}>⚙️ Configuración</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.button, { flex: 1, backgroundColor: '#6c757d' }]} onPress={() => { setHasPermission(null); setPermissionError(null); }}><Text style={styles.buttonText}>🔄 Reintentar</Text></TouchableOpacity>
        </View>
        <TouchableOpacity style={[styles.button, { marginTop: 15, backgroundColor: '#f44336' }]} onPress={() => navigation.goBack()}><Text style={styles.buttonText}>↩️ Volver</Text></TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}><Text style={styles.headerText}>🛣️ {ruta.numero}</Text><Text style={styles.headerText}>📦 {totalGuardados + scanBuffer.current.length}</Text></View>
      {modoDanadoLocal && (<View style={styles.defectBannerActive}><Text style={styles.defectText}>⚠️ MODO DEFECTUOSO ACTIVO</Text><Text style={styles.defectSubtext}>Los próximos escaneos se marcarán como dañados</Text></View>)}
      <Camera style={StyleSheet.absoluteFill} type={Camera.Constants.Type.back} onBarCodeScanned={handleBarCodeScanned} flashMode={flash} barCodeScannerSettings={{ barcodeTypes: ['qr', 'ean13', 'code128', 'code39', 'upc_e'] }}>
        <View style={styles.overlay}><View style={styles.scanFrame}><View style={[styles.corner, styles.cornerTopLeft]} /><View style={[styles.corner, styles.cornerTopRight]} /><View style={[styles.corner, styles.cornerBottomLeft]} /><View style={[styles.corner, styles.cornerBottomRight]} /></View><View style={styles.scanLine} /></View>
      </Camera>
      {feedbackVisible && (<Animated.View style={[styles.feedbackCircle, { transform: [{ scale: feedbackAnim }], backgroundColor: feedbackSuccess ? (modoDanadoLocal ? '#ff9800' : '#4CAF50') : '#F44336' }]} />)}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.button, flash === Camera.Constants.FlashMode.torch ? styles.activeButton : null]} onPress={toggleFlash} activeOpacity={0.7}><Text style={styles.buttonText}>{getFlashIcon()}</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.button, modoDanadoLocal ? styles.defectButtonActive : styles.defectButton]} onPress={toggleModoDanado} activeOpacity={0.7}><Text style={styles.buttonText}>{modoDanadoLocal ? '🔧 Normal' : '⚠️ Defectuoso'}</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.danadoButton]} onPress={handleMarcarDanado} activeOpacity={0.7}><Text style={styles.buttonText}>📦 Dañado</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.finalizarButton]} onPress={handleFinalizar} activeOpacity={0.7}><Text style={styles.buttonText}>🏁</Text></TouchableOpacity>
      </View>
      <View style={styles.labelContainer}>
        <Text style={styles.buttonLabel}>Linterna</Text>
        <Text style={[styles.buttonLabel, modoDanadoLocal && styles.defectLabel]}>{modoDanadoLocal ? '🔧 Normal' : '⚠️ Defectuoso'}</Text>
        <Text style={styles.buttonLabel}>Dañado</Text>
        <Text style={styles.buttonLabel}>Finalizar</Text>
      </View>

      {/* MODAL DE CONFIRMACIÓN DE SALIDA */}
      {salidaPendiente && (
        <Modal visible={true} transparent={true} animationType="fade" onRequestClose={cancelarSalida}>
          <TouchableOpacity style={styles.modalOverlay} onPress={handleOverlayPress} activeOpacity={1}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>⚠️ Confirmar Salida</Text>
              <Text style={styles.modalMessage}>¿Estás seguro que deseas salir de la ruta {ruta.numero}?</Text>
              <View style={styles.modalStats}>
                <Text style={styles.statItem}>📦 Guardados: <Text style={styles.statValue}>{totalGuardados}</Text></Text>
                <Text style={styles.statItem}>📋 Pendientes: <Text style={styles.statValue}>{scanBuffer.current.length}</Text></Text>
                {totalGuardados === 0 && scanBuffer.current.length === 0 && (<Text style={styles.warningText}>⚠️ La ruta será eliminada al no tener productos</Text>)}
              </View>
              <Text style={styles.modalNote}>✅ Los productos pendientes se guardarán automáticamente</Text>
              <View style={styles.modalButtons}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={cancelarSalida}><Text style={styles.cancelButtonText}>❌ Cancelar</Text></TouchableOpacity>
                <TouchableOpacity style={[styles.modalButton, styles.confirmButton]} onPress={confirmarYSalir}><Text style={styles.confirmButtonText}>✅ Salir y Guardar</Text></TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* MODAL INGRESO MANUAL */}
      <Modal visible={manualInputVisible} transparent animationType="slide" onRequestClose={() => setManualInputVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🔢 Ingresar Código Manual</Text>
            <Text style={styles.modalHint}>Ej: 45684857329 (11 dígitos)</Text>
            <TextInput style={styles.input} value={codigoManual} onChangeText={setCodigoManual} placeholder="Ingrese el código..." keyboardType="numeric" maxLength={20} autoFocus onSubmitEditing={confirmarCodigoManual} />
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.button, { flex: 1, backgroundColor: '#6c757d', marginRight: 5 }]} onPress={() => { setManualInputVisible(false); setCodigoManual(''); }}><Text style={styles.buttonText}>Cancelar</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.button, { flex: 1, backgroundColor: '#4CAF50', marginLeft: 5 }]} onPress={confirmarCodigoManual} disabled={!codigoManual.trim()}><Text style={styles.buttonText}>Aceptar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL PRODUCTO DAÑADO */}
      <Modal visible={mostrarModalDanados} transparent animationType="slide" onRequestClose={() => setMostrarModalDanados(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>⚠️ Seleccionar Producto Dañado</Text>
            <Text style={styles.modalHint}>{productosParaDanar.length} productos disponibles</Text>
            <ScrollView style={styles.modalList}>
              {productosParaDanar.map((producto, index) => (
                <TouchableOpacity key={index} style={styles.productoItem} onPress={() => confirmarMarcarDanado(producto)}>
                  <Text style={styles.productoItemText}>{producto.codigo}</Text>
                  <Text style={styles.productoItemDetail}>{producto.detalle || 'Normal'} - {new Date(producto.timestamp).toLocaleTimeString()}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={[styles.button, { flex: 1, backgroundColor: '#f44336' }]} onPress={() => setMostrarModalDanados(false)}><Text style={styles.buttonText}>Cancelar</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ScannerInterface;