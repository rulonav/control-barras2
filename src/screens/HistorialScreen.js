// src/screens/HistorialScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, Alert, BackHandler } from 'react-native';
import { Card, Button, Title, Divider } from 'react-native-paper';
import { useIsFocused, useFocusEffect } from '@react-navigation/native';
import databaseService from '../services/databaseService';
import { formatters } from '../utils/formatters';
import { styles } from '../styles/HistorialScreenStyles';

const HistorialScreen = ({ navigation }) => {
  const isFocused = useIsFocused();
  const [rutas, setRutas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const cargarRutas = useCallback(async () => {
    try {
      setLoading(true);
      const usuario = await databaseService.obtenerUsuarioActual();
      if (!usuario) { Alert.alert('Error', 'Usuario no encontrado.'); return; }
      const rutasUsuario = await databaseService.obtenerRutasUsuario(usuario.id);
      const rutasConConteo = await Promise.all(rutasUsuario.map(async (ruta) => {
        const productos = await databaseService.obtenerProductosRuta(ruta.id);
        return { ...ruta, total_productos: productos.length };
      }));
      setRutas(rutasConConteo);
    } catch (error) {
      console.error('❌ Error cargando rutas:', error);
      Alert.alert('Error', 'No se pudieron cargar las rutas.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ✅ useFocusEffect para recargar al volver a esta pantalla
  useFocusEffect(useCallback(() => {
    cargarRutas();
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      navigation.goBack();
      return true;
    });
    return () => backHandler.remove();
  }, [cargarRutas, navigation]));

  const handleVerProductos = async (ruta) => {
    try {
      const productos = await databaseService.obtenerProductosRuta(ruta.id);
      navigation.navigate('Reporte', {
        ruta,
        productos,
        limitesEscaneo: { inferior: 45, superior: 47 },
        fechaCreacion: ruta.fecha
      });
    } catch (error) {
      console.error('❌ Error al cargar productos:', error);
      Alert.alert('Error', 'No se pudieron cargar los productos.');
    }
  };

  const handleCompartir = async (ruta) => {
    try {
      const productos = await databaseService.obtenerProductosRuta(ruta.id);
      const usuario = await databaseService.obtenerUsuarioActual();
      if (!usuario) { Alert.alert('Error', 'Usuario no disponible para el reporte.'); return; }
      const reporteTexto = formatters.generarReporteTexto(ruta, usuario, productos, 45000000000, 47000000000);
      const mensajeFormateado = reporteTexto.replace(/\\n/g, '\n').replace(/\n{3,}/g, '\n\n');
      Alert.alert('Compartir Reporte', '¿Deseas compartir este reporte por WhatsApp?', [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Compartir',
          onPress: async () => {
            const Share = await import('react-native').then(m => m.Share);
            if (Share) { await Share.share({ message: mensajeFormateado, title: `📋 Reporte Ruta ${ruta.numero}` }); }
          }
        }
      ]);
    } catch (error) {
      console.error('❌ Error al generar reporte:', error);
      Alert.alert('Error', 'No se pudo generar el reporte.');
    }
  };

  const handleLimpiarMellizos = async (ruta) => {
    Alert.alert('🔄 Limpiar Mellizos', `¿Desea eliminar la marca de "mellizo" de todos los productos de la ruta ${ruta.numero}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Limpiar', style: 'default',
        onPress: async () => {
          try {
            const productos = await databaseService.obtenerProductosRuta(ruta.id);
            const mellizos = productos.filter(p => p.es_mellizo);
            if (mellizos.length === 0) { Alert.alert('ℹ️ Info', 'No hay mellizos para limpiar en esta ruta'); return; }
            for (const p of mellizos) await databaseService.actualizarProducto(p.id, { es_mellizo: 0 });
            Alert.alert('✅ Éxito', `${mellizos.length} mellizos limpiados`);
            cargarRutas();
          } catch (error) { console.error('❌ Error limpiando mellizos:', error); Alert.alert('Error', 'No se pudieron limpiar los mellizos'); }
        }
      }
    ]);
  };

  const handleEliminar = useCallback((ruta) => {
    Alert.alert('🗑️ Confirmar eliminación', `¿Eliminar la ruta ${ruta.numero} y todos sus productos?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          try { await databaseService.eliminarRuta(ruta.id); cargarRutas(); }
          catch (error) { console.error('❌ Error al eliminar ruta:', error); Alert.alert('Error', 'No se pudo eliminar la ruta.'); }
        }
      }
    ]);
  }, [cargarRutas]);

  const renderItem = useCallback(({ item }) => (
    <Card style={styles.rutaCard}>
      <Card.Content>
        <View style={styles.rutaHeader}>
          <Title style={styles.rutaNumero}>Ruta #{item.numero}</Title>
          <Text style={styles.rutaFecha}>{formatters.formatFecha(item.fecha, true)}</Text>
        </View>
        <Divider style={styles.divider} />
        <View style={styles.rutaStats}>
          <Text style={styles.statsText}><Text style={styles.statsCount}>{item.total_productos}</Text> paquetes</Text>
          <Text style={[styles.estadoBadge, item.finalizada ? styles.finalizada : styles.activa]}>{item.finalizada ? '✅ Finalizada' : '🟡 Activa'}</Text>
        </View>
      </Card.Content>
      <Card.Actions style={styles.cardActions}>
        <Button mode="outlined" onPress={() => handleVerProductos(item)} style={styles.actionButton} icon="eye">Ver</Button>
        <Button mode="outlined" onPress={() => handleCompartir(item)} style={styles.actionButton} icon="share-variant">Compartir</Button>
        <Button mode="outlined" textColor="#ff9800" onPress={() => handleLimpiarMellizos(item)} style={styles.actionButton} icon="refresh">Mellizos</Button>
        <Button mode="outlined" textColor="#f44336" onPress={() => handleEliminar(item)} style={styles.actionButton} icon="delete">Eliminar</Button>
      </Card.Actions>
    </Card>
  ), [handleVerProductos, handleCompartir, handleLimpiarMellizos, handleEliminar]);

  const onRefresh = useCallback(() => { setRefreshing(true); cargarRutas(); }, [cargarRutas]);

  if (loading && rutas.length === 0) return (<View style={styles.container}><Title style={styles.screenTitle}>Historial de Rutas</Title><Text style={styles.loadingText}>Cargando rutas...</Text></View>);

  return (
    <View style={styles.container}>
      <Title style={styles.screenTitle}>📋 Historial de Rutas</Title>
      {rutas.length === 0 ? (<Text style={styles.emptyText}>No hay rutas registradas.</Text>) : (
        <FlatList data={rutas} renderItem={renderItem} keyExtractor={(item) => item.id.toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2196F3']} />}
          contentContainerStyle={styles.listContainer} showsVerticalScrollIndicator={true} />
      )}
    </View>
  );
};

export default HistorialScreen;