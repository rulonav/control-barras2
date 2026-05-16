// src/screens/ReporteScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, Share, BackHandler } from 'react-native';
import { Card, Title, FAB, Button } from 'react-native-paper';
import { useIsFocused } from '@react-navigation/native';
import databaseService from '../services/databaseService';
import { formatters } from '../utils/formatters';

const ReporteScreen = ({ route, navigation }) => {
  const { ruta, productos: productosIniciales, limitesEscaneo, fechaCreacion } = route.params || {};
  const isFocused = useIsFocused();
  const [productos, setProductos] = useState(Array.isArray(productosIniciales) ? productosIniciales : []);
  const [esDelDia, setEsDelDia] = useState(false);
  const [limiteInferior, setLimiteInferior] = useState(45000000000);
  const [limiteSuperior, setLimiteSuperior] = useState(47000000000);
  const [cargando, setCargando] = useState(false);

  const verificarSiEsDelDia = useCallback(() => {
    const fechaAComparar = fechaCreacion || ruta?.fecha;
    if (!fechaAComparar) { setEsDelDia(false); return; }
    try {
      const fechaRuta = new Date(fechaAComparar);
      if (isNaN(fechaRuta.getTime())) { setEsDelDia(false); return; }
      const ahora = new Date();
      const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
      const fechaRutaLocal = new Date(fechaRuta.getFullYear(), fechaRuta.getMonth(), fechaRuta.getDate());
      const esHoy = hoy.getTime() === fechaRutaLocal.getTime();
      setEsDelDia(esHoy);

    } catch (error) {

      setEsDelDia(false);
    }
  }, [fechaCreacion, ruta?.fecha]);

  // ✅ CARGAR PRODUCTOS ACTUALIZADOS DESDE BD
  const cargarProductosActualizados = useCallback(async () => {
    if (!ruta?.id) return;
    try {
      setCargando(true);
      const productosActualizados = await databaseService.obtenerProductosRuta(ruta.id);
      setProductos(productosActualizados);

    } catch (error) {

    } finally {
      setCargando(false);
    }
  }, [ruta?.id]);

  useEffect(() => {
    if (limitesEscaneo) {
      setLimiteInferior(parseInt(limitesEscaneo.inferior) * 1000000000);
      setLimiteSuperior(parseInt(limitesEscaneo.superior) * 1000000000);
    }
    verificarSiEsDelDia();
    cargarProductosActualizados();
  }, [limitesEscaneo, verificarSiEsDelDia, cargarProductosActualizados]);

  // ✅ RECARGAR AL VOLVER DE SCANNER (AGREGAR PAQUETES)
  useEffect(() => {
    if (isFocused) {
      cargarProductosActualizados();
    }
  }, [isFocused, cargarProductosActualizados]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.goBack();
      return true;
    });
    return () => backHandler.remove();
  }, [navigation]);

  const limpiarMellizo = async (id) => {
    try {
      await databaseService.actualizarProducto(id, { es_mellizo: 0 });
      await cargarProductosActualizados();
    } catch (error) { console.error('❌ Error al limpiar mellizo:', error); Alert.alert('Error', 'No se pudo limpiar el producto.'); }
  };

  const limpiarTodosMellizos = async () => {
    try {
      const mellizos = productos.filter(p => p.es_mellizo);
      for (const p of mellizos) await databaseService.actualizarProducto(p.id, { es_mellizo: 0 });
      await cargarProductosActualizados();
      Alert.alert('Éxito', `${mellizos.length} productos limpiados.`);
    } catch (error) { console.error('❌ Error al limpiar todos los mellizos:', error); Alert.alert('Error', 'No se pudieron limpiar los productos.'); }
  };

  // ✅ AGREGAR PAQUETES: Navegar a Scanner con rutaRecuperada
  const agregarPaquetes = () => {

    navigation.navigate('Scanner', {
      rutaRecuperada: { ...ruta, finalizada: false },
      limitesEscaneo: { inferior: limiteInferior/1000000000, superior: limiteSuperior/1000000000 },
      modoEdicion: true
    });
  };

  const agregarDefectuosos = () => {
    navigation.navigate('Scanner', {
      rutaRecuperada: { ...ruta, finalizada: false },
      modoDefectuoso: true,
      limitesEscaneo: { inferior: limiteInferior/1000000000, superior: limiteSuperior/1000000000 }
    });
  };

  const compartirReporte = async () => {
    try {
      const usuario = await databaseService.obtenerUsuarioActual();
      const reporteTexto = formatters.generarReporteTexto(ruta, usuario, productos, limiteInferior, limiteSuperior);
      const mensajeFormateado = reporteTexto.replace(/\\n/g, '\n').replace(/\n{3,}/g, '\n\n');
      await Share.share({ message: mensajeFormateado, title: `📋 Reporte Ruta ${String(ruta?.numero ?? 'Desconocida')}` });
    } catch (error) { console.error('❌ Error al compartir:', error); Alert.alert('Error', 'No se pudo compartir el reporte.'); }
  };

  const renderItem = ({ item }) => {
    if (!item || typeof item !== 'object') return null;
    const codigo = String(item.codigo ?? '');
    const codigoNum = parseInt(codigo.replace(/[^0-9]/g, ''), 10);
    if (codigoNum < limiteInferior || codigoNum > limiteSuperior) return null;
    const countMellizos = productos.filter(p => p.codigo === codigo).length;
    const esMellizo = countMellizos > 1;
    const esDefectuoso = Boolean(item.es_defectuoso);
    return (
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={styles.codigo}>{codigo}</Text>
          {esDefectuoso && <Text style={styles.badgeDefectuoso}>⚠️ DAÑADO</Text>}
          {esMellizo && <Text style={styles.badgeMellizo}>- Mellizo {countMellizos}</Text>}
        </View>
        {esMellizo && esDelDia && (<Button mode="text" textColor="#f44336" onPress={() => limpiarMellizo(item.id)}>Limpiar</Button>)}
      </View>
    );
  };

  const keyExtractor = (item, index) => String(item?.id || `fallback-${index}`);
  const productosFiltrados = productos.filter(p => {
    const codigoNum = parseInt(String(p.codigo ?? '').replace(/[^0-9]/g, ''), 10);
    return codigoNum >= limiteInferior && codigoNum <= limiteSuperior;
  });

  return (
    <View style={styles.container}>
      <Card style={styles.headerCard}>
        <Card.Content>
          <Title>{`Ruta: ${String(ruta?.numero ?? 'Desconocida')}`}</Title>
          <Text style={styles.totalText}>Total: {productosFiltrados.length} paquetes (dentro de rango)</Text>
          <Text style={styles.fechaText}>{formatters.formatFecha(ruta?.fecha, true)}</Text>
          <Text style={styles.rangoText}>Rango: {limiteInferior} - {limiteSuperior}</Text>
          {esDelDia && <Text style={styles.hoyBadge}>🟢 Ruta de HOY - Puede agregar paquetes</Text>}
        </Card.Content>
      </Card>
      <FlatList data={productosFiltrados} renderItem={renderItem} keyExtractor={keyExtractor}
        contentContainerStyle={[styles.list, productosFiltrados.length === 0 && styles.emptyList]}
        ListEmptyComponent={<Text style={styles.emptyText}>No hay productos en el rango seleccionado</Text>}
        onRefresh={cargarProductosActualizados} refreshing={cargando} />
      {esDelDia && (
        <>
          <FAB icon="package-variant" label="Agregar Paquetes" onPress={agregarPaquetes} style={[styles.fab, { bottom: 180 }]} color="#fff" />
          <FAB icon="alert" label="Agregar Defectuosos" onPress={agregarDefectuosos} style={[styles.fab, { bottom: 130 }]} color="#fff" />
          <FAB icon="delete" label="Limpiar Mellizos" onPress={limpiarTodosMellizos} style={[styles.fab, { bottom: 80 }]} color="#fff" />
        </>
      )}
      <FAB icon="share" label="Enviar Reporte" onPress={compartirReporte} style={styles.fab} color="#fff" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white', padding: 16 },
  headerCard: { marginBottom: 16 },
  totalText: { color: '#666', marginTop: 4 },
  fechaText: { color: '#666', marginTop: 4, fontWeight: 'bold' },
  rangoText: { color: '#2196F3', marginTop: 4, fontSize: 12 },
  hoyBadge: { color: '#4CAF50', marginTop: 8, fontWeight: 'bold', fontSize: 13 },
  list: { paddingBottom: 120 },
  emptyList: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#999', fontSize: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  info: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  codigo: { fontSize: 16, color: '#333', marginRight: 8 },
  badgeDefectuoso: { color: '#f44336', fontWeight: 'bold', fontSize: 12 },
  badgeMellizo: { color: '#ff9800', fontWeight: 'bold', fontSize: 12, marginLeft: 4 },
  fab: { position: 'absolute', margin: 16, right: 0, bottom: 16, backgroundColor: '#2196F3' },
});

export default ReporteScreen;