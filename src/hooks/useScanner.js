// src/hooks/useScanner.js
import { useState, useRef, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useProductOperations } from '../hooks/useProductOperations';
import { useMellizoOperations } from '../hooks/useMellizoOperations';
import audioService from '../services/audioService';
import barcodeService from '../services/barcodeService';

export const useScanner = ({
  ruta,
  productos,
  setProductos,
  setUltimoResultado,
  setLoading
}) => {

  const [scannerActive, setScannerActive] = useState(false);
  const [revisandoMellizos, setRevisandoMellizos] = useState(false);
  const [mellizoActual, setMellizoActual] = useState(null);
  const [modoDefectuoso, setModoDefectuoso] = useState(false);
  const [showModalDefectuosos, setShowModalDefectuosos] = useState(false);
  const [ultimoResultadoLocal, setUltimoResultadoLocal] = useState(null);
  const [ultimoCodigo, setUltimoCodigo] = useState('');
  const [ultimoTimestamp, setUltimoTimestamp] = useState(0);
  const [velocidadEscaneo, setVelocidadEscaneo] = useState(0);
  const [flashColor, setFlashColor] = useState('#00ff00');
  const [flashCount, setFlashCount] = useState(0);
  
  // ✅ REFS PARA ACCESO INMEDIATO EN CALLBACKS
  const scannerActiveRef = useRef(scannerActive);
  const ultimoCodigoRef = useRef(ultimoCodigo);
  const ultimoTimestampRef = useRef(ultimoTimestamp);
  const modoDefectuosoRef = useRef(modoDefectuoso);
  const showModalDefectuososRef = useRef(showModalDefectuosos);

  useEffect(() => { scannerActiveRef.current = scannerActive; }, [scannerActive]);
  useEffect(() => { ultimoCodigoRef.current = ultimoCodigo; }, [ultimoCodigo]);
  useEffect(() => { ultimoTimestampRef.current = ultimoTimestamp; }, [ultimoTimestamp]);
  useEffect(() => { modoDefectuosoRef.current = modoDefectuoso; }, [modoDefectuoso]);
  useEffect(() => { showModalDefectuososRef.current = showModalDefectuosos; }, [showModalDefectuosos]);

  const { procesarEscaneo, marcarProductoComoDefectuoso, marcarProductoComoMellizo } = useProductOperations({
    ruta,
    productos,
    setProductos,
    setUltimoResultado: setUltimoResultadoLocal,
    setLoading
  });

  const { procesarMellizosConAccion } = useMellizoOperations();

  // ✅ MANEJO DE ESCANEO PRINCIPAL
  const handleScan = useCallback(async (codigo) => {

    if (!codigo) {

      return;
    }

    const timestampActual = Date.now();
    const tiempoTranscurrido = timestampActual - ultimoTimestampRef.current;
    
    // ✅ EVITAR ESCANEOS DEMASIADO RÁPIDOS (<100ms)
    if (tiempoTranscurrido < 100) {

      await audioService.playErrorSound();
      return;
    }

    setUltimoTimestamp(timestampActual);
    setUltimoCodigo(codigo);
    setVelocidadEscaneo(tiempoTranscurrido);

    try {
      const resultado = await procesarEscaneo(codigo, modoDefectuosoRef.current);
      setUltimoResultadoLocal(resultado);
      
      if (setUltimoResultado) {
        setUltimoResultado(resultado);
      }

      if (resultado.success) {
        await audioService.playSuccessSound();
        setFlashColor('#00ff00');
        setFlashCount(prev => prev + 1);
        setTimeout(() => setFlashColor('#000000'), 100);
      } else {
        await audioService.playErrorSound();
        setFlashColor('#ff0000');
        setFlashCount(prev => prev + 1);
        setTimeout(() => setFlashColor('#000000'), 100);
      }
    } catch (error) {

      const resultadoError = {
        success: false,
        mensaje: error.message || 'Error desconocido',
        tipo: 'error'
      };
      setUltimoResultadoLocal(resultadoError);
      if (setUltimoResultado) {
        setUltimoResultado(resultadoError);
      }
      await audioService.playErrorSound();
    }
  }, [procesarEscaneo, setUltimoResultado]);

  // ✅ MANEJO DE ACCIONES DE MELLIZOS
  const manejarAccionMellizos = useCallback(async (accion) => {

    if (!mellizoActual) {

      return;
    }

    try {
      const { completado, mensaje, error } = await procesarMellizosConAccion(accion, mellizoActual);
      
      if (completado) {
        await audioService.playSuccessSound();
        setRevisandoMellizos(false);
        setMellizoActual(null);
        Alert.alert('✅ Éxito', mensaje);
      } else {
        Alert.alert('❌ Error', error || mensaje);
      }
    } catch (error) {

      Alert.alert('❌ Error', error.message);
    }
  }, [mellizoActual, procesarMellizosConAccion]);

  // ✅ SALTAR REVISIÓN DE MELLIZOS
  const saltarRevisionMellizos = useCallback(() => {

    setRevisandoMellizos(false);
    setMellizoActual(null);
  }, []);

  // ✅ MODAL DE PRODUCTOS DAÑADOS
  const abrirModalProductosDefectuosos = useCallback(() => {

    setShowModalDefectuosos(true);
  }, []);

  const cerrarModalProductosDefectuosos = useCallback(() => {
    setShowModalDefectuosos(false);
  }, []);

  // ✅ TOGGLE MODO DEFECTUOSO
  const toggleModoDefectuoso = useCallback(() => {
    setModoDefectuoso(prev => !prev);
  }, []);

  return {
    scannerActive,
    setScannerActive,
    revisandoMellizos,
    setRevisandoMellizos,
    mellizoActual,
    setMellizoActual,
    modoDefectuoso,
    setModoDefectuoso,
    showModalDefectuosos,
    setShowModalDefectuosos,
    ultimoResultado: ultimoResultadoLocal,
    ultimoCodigo,
    ultimoTimestamp,
    velocidadEscaneo,
    flashColor,
    flashCount,
    handleScan,
    manejarAccionMellizos,
    saltarRevisionMellizos,
    abrirModalProductosDefectuosos,
    cerrarModalProductosDefectuosos,
    toggleModoDefectuoso,
    marcarProductoComoDefectuoso,
    marcarProductoComoMellizo,
  };
};