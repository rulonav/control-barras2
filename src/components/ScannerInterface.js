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

const ScannerInterface = ({ ruta, userData, navigation, modoDefectuoso = false, rangoEscaneo = null }) => {
  const [flash, setFlash] = useState(Camera.Constants.FlashMode.off);
  const [totalGuardados, setTotalGuardados] = useState(0);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(true);
  const [manualInputVisible, setManualInputVisible] = useState(false);
  const [codigoManual, setCodigoManual] = useState('');
  const [hasPermission, setHasPermission] = useState(null);
  const [permissionError, setPermissionError] = useState(null);
  const [mostrarModalDefectuosos, setMostrarModalDefectuosos] = useState(false);
  const [productosParaDanar, setProductosParaDefectuosos] = useState([]);
  const [modoDefectuosoLocal, setModoDefectuosoLocal] = useState(modoDefectuoso);
  const [salidaPendiente, setSalidaPendiente] = useState(false);
  
  const scanBuffer = useRef([]);
  const lastThreeCodes = useRef([]);
  const scanning = useRef(false);
  const feedbackAnim = useRef(new Animated.Value(0)).current;
  const modoDefectuosoRef = useRef(modoDefectuosoLocal);
  const rutaIdRef = useRef(ruta.id);

  useEffect(() => { modoDefectuosoRef.current = modoDefectuosoLocal; }, [modoDefectuosoLocal]);
  useEffect(() => { rutaIdRef.current = ruta.id; }, [ruta.id]);

  useEffect(() => {
    if (rangoEscaneo && rangoEscaneo.inicial && rangoEscaneo.final) {
      // ✅ Los valores YA vienen completos desde ScannerScreen (ej: 45000000000)
      const inferior = parseInt(rangoEscaneo.inicial);
      const superior = parseInt(rangoEscaneo.final);
      barcodeService.actualizarLimites(inferior, superior);

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

              if (isMounted) {
                setHasPermission(false);
                setPermissionError('Permiso denegado en configuración');
              }
              return;
            }
          } catch (permError) {

          }
        }

        // ✅ Expo Camera permission - SIN TIMEOUT
        const { status } = await Camera.requestCameraPermissionsAsync();
        
        if (isMounted) {

          setHasPermission(status === 'granted');
          if (status !== 'granted') {
            setPermissionError('Permiso no concedido');
          }
        }
      } catch (error) {

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
        setProductosParaDefectuosos(productos);
      } catch (err) { console.warn('⚠️ Error cargando buffer:', err); }
    };
    load();
  }, [ruta.id]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (scanBuffer.current.length > 0) flushBuffer();
    }, 10000);
    return () => clearInterval(interval);
  }, [flushBuffer]);

  useEffect(() => {
    return () => {
      const cleanup = async () => {
        try {
          const productos = await databaseService.obtenerProductosRuta(ruta.id);
          if (productos.length === 0 && scanBuffer.current.length === 0) {
            await databaseService.eliminarRuta(ruta.id);

          } else {
            await flushBuffer();

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
        const es_defectuoso = typeof item === 'object' ? item.es_defectuoso : (modoDefectuosoRef.current ? 1 : 0);
        return { codigo, ruta_id: currentRutaId, es_defectuoso, timestamp: new Date().toISOString() };
      });
      await databaseService.bulkInsertProductos(items);
      scanBuffer.current = [];
      await AsyncStorage.removeItem(`${TEMP_KEY_PREFIX}${currentRutaId}`);
      const productos = await databaseService.obtenerProductosRuta(currentRutaId);
      setTotalGuardados(productos.length);
      setProductosParaDefectuosos(productos);
      for (const item of items) await recoveryService.guardarProducto(item);

      return true;
    } catch (err) {

      return false;
    }
  };

  // ✅ CONFIRMAR SALIDA CON MODAL PERSONALIZADO
  const confirmarYSalir = useCallback(async () => {
    try {

      if (scanBuffer.current.length > 0) {
        const guardado = await flushBuffer();
        if (!guardado) Alert.alert('⚠️ Advertencia', 'No se pudieron guardar todos los productos');
      }
      const productos = await databaseService.obtenerProductosRuta(ruta.id);
      if (productos.length === 0) {
        await databaseService.eliminarRuta(ruta.id);

      } else {
        await databaseService.finalizarRuta(ruta.id);

      }
      await recoveryService.limpiarRecuperacion();
      deactivateKeepAwake();
      if (navigation?.goBack) navigation.goBack();
    } catch (error) {

      Alert.alert('Error', 'No se pudo completar la salida: ' + error.message);
    } finally {
      setSalidaPendiente(false);
    }
  }, [ruta, navigation]);

  const cancelarSalida = useCallback(() => {
    setSalidaPendiente(false);

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
    } catch (error) { console.error('❌ Error obteniendo productos:', error); Alert.alert('Error', 