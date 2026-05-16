// src/screens/MainMenuScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, Alert, BackHandler } from 'react-native';
import { Card, Title, Button, Paragraph } from 'react-native-paper';
import databaseService from '../services/databaseService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../styles/MainMenuScreenStyles';

const MainMenuScreen = ({ navigation }) => {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarUsuarioYVerificarRuta();
    const backAction = () => {
      Alert.alert('Salir de la App', '¿Estás seguro que deseas salir?', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Salir', style: 'destructive', onPress: () => BackHandler.exitApp() }
      ]);
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  const cargarUsuarioYVerificarRuta = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (!userData) { console.log('⚠️ No hay usuario en AsyncStorage, volviendo a Login'); navigation.replace('Login'); return; }
      const usuarioParseado = JSON.parse(userData);
      setUsuario(usuarioParseado);
      if (!usuarioParseado.id) { console.log('⚠️ Usuario sin ID válido, volviendo a Login'); navigation.replace('Login'); return; }

      try {
        const rutasActivas = await databaseService.obtenerRutasUsuario(usuarioParseado.id);
        const rutaActiva = rutasActivas?.find(r => !r.finalizada);
        
        if (rutaActiva) {

          // ✅ VERIFICAR SI LA RUTA TIENE PRODUCTOS
          const productos = await databaseService.obtenerProductosRuta(rutaActiva.id);

          if (productos.length === 0) {
            // ✅ RUTA VACÍA: ELIMINAR AUTOMÁTICAMENTE

            await databaseService.eliminarRuta(rutaActiva.id);
            setLoading(false);
            return;
          } else {
            // ✅ RUTA CON DATOS: PREGUNTAR AL USUARIO
            Alert.alert(
              '🔄 Ruta Incompleta',
              `Se encontró una ruta activa: ${rutaActiva.numero}\n📦 Productos guardados: ${productos.length}\n\n¿Qué deseas hacer?`,
              [
                {
                  text: '🗑️ Eliminar y Nueva',
                  style: 'destructive',
                  onPress: async () => {
                    await databaseService.eliminarRuta(rutaActiva.id);
                    setLoading(false);
                  }
                },
                {
                  text: '🏁 Cerrar y Guardar',
                  style: 'default',
                  onPress: async () => {
                    try {
                      await databaseService.finalizarRuta(rutaActiva.id);
                      navigation.navigate('Reporte', { ruta: rutaActiva, productos });
                    } catch (error) {

                      Alert.alert('Error', 'No se pudo finalizar la ruta');
                      setLoading(false);
                    }
                  }
                },
                {
                  text: '▶️ Continuar Escaneando',
                  style: 'cancel',
                  onPress: () => {
                    navigation.navigate('Scanner', { rutaRecuperada: rutaActiva, tieneBuffer: true });
                  }
                }
              ],
              { cancelable: false }
            );
          }
        }
      } catch (error) {

      }
    } catch (error) {

      navigation.replace('Login');
    } finally {
      setLoading(false);
    }
  };

  const handleNuevaRuta = () => { navigation.navigate('Scanner'); };
  const handleHistorial = () => navigation.navigate('Historial');
  const handleControlListado = () => navigation.navigate('ControlList');

  const handleLogout = async () => {
    Alert.alert('Cerrar Sesión', '¿Estás seguro que deseas cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: async () => { await AsyncStorage.removeItem('userData'); navigation.replace('Login'); } }
    ]);
  };

  if (loading) {
    return (<View style={styles.loadingContainer}><Text style={styles.loadingText}>Cargando menú...</Text></View>);
  }

  return (
    <View style={styles.container}>
      {usuario && (
        <Card style={styles.userCard}>
          <Card.Content>
            <View style={styles.userInfo}>
              <View style={styles.avatar}><Text style={styles.avatarText}>{usuario.nombre?.charAt(0)?.toUpperCase() || 'U'}</Text></View>
              <View style={styles.userDetails}>
                <Text style={styles.userName}>{usuario.nombre} {usuario.apellido}</Text>
                <Text style={styles.userStation}>🏢 {usuario.estacion}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      )}
      <Title style={styles.screenTitle}>Opciones Principales</Title>
      <Card style={styles.menuCard}>
        <Card.Content style={styles.cardContentRow}>
          <View style={styles.cardIconContainer}><Text style={styles.cardIcon}>📦</Text></View>
          <View style={styles.cardTextContainer}>
            <Title style={styles.cardTitle}>Escanear Nueva Ruta</Title>
            <Paragraph style={styles.cardDescription}>Configurar rango y comenzar nuevo control de ruta</Paragraph>
          </View>
        </Card.Content>
        <Card.Actions style={styles.cardActions}>
          <Button mode="contained" onPress={handleNuevaRuta} style={styles.actionButton} icon="cog">⚙️ Configurar y Escanear</Button>
        </Card.Actions>
      </Card>
      <Card style={styles.menuCard}>
        <Card.Content style={styles.cardContentRow}>
          <View style={styles.cardIconContainer}><Text style={styles.cardIcon}>📋</Text></View>
          <View style={styles.cardTextContainer}>
            <Title style={styles.cardTitle}>Historial de Rutas</Title>
            <Paragraph style={styles.cardDescription}>Ver rutas completadas, compartir reportes o eliminar registros</Paragraph>
          </View>
        </Card.Content>
        <Card.Actions style={styles.cardActions}>
          <Button mode="outlined" onPress={handleHistorial} style={styles.actionButton} icon="history">Ver Historial</Button>
        </Card.Actions>
      </Card>
      <Card style={styles.menuCard}>
        <Card.Content style={styles.cardContentRow}>
          <View style={styles.cardIconContainer}><Text style={styles.cardIcon}>📊</Text></View>
          <View style={styles.cardTextContainer}>
            <Title style={styles.cardTitle}>Controlar Listado</Title>
            <Paragraph style={styles.cardDescription}>Comparar escaneos con archivos CSV/XLSX de ruteo primario</Paragraph>
          </View>
        </Card.Content>
        <Card.Actions style={styles.cardActions}>
          <Button mode="outlined" onPress={handleControlListado} style={styles.actionButton} icon="file-compare">Controlar</Button>
        </Card.Actions>
      </Card>
      <Button mode="outlined" onPress={handleLogout} style={styles.logoutButton} textColor="#f44336" icon="logout">🚪 Cerrar Sesión</Button>
    </View>
  );
};

export default MainMenuScreen;