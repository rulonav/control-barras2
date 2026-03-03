// src/screens/MainMenuScreen.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Alert,
  BackHandler,
} from 'react-native';
import { Card, Title, Button, Paragraph, Divider } from 'react-native-paper';
import databaseService from '../services/databaseService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { styles } from '../styles/MainMenuScreenStyles';

const MainMenuScreen = ({ navigation }) => {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarUsuarioYVerificarRuta();
    const backAction = () => {
      Alert.alert(
        'Salir de la App',
        '¿Estás seguro que deseas salir?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Salir', style: 'destructive', onPress: () => BackHandler.exitApp() }
        ]
      );
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  const cargarUsuarioYVerificarRuta = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      if (!userData) {
        console.log('⚠️ No hay usuario en AsyncStorage, volviendo a Login');
        navigation.replace('Login');
        return;
      }
      const usuarioParseado = JSON.parse(userData);
      setUsuario(usuarioParseado);
      if (!usuarioParseado.id) {
        console.log('⚠️ Usuario sin ID válido, volviendo a Login');
        navigation.replace('Login');
        return;
      }
      console.log('✅ Usuario cargado con ID:', usuarioParseado.id);
      try {
        const rutasActivas = await databaseService.obtenerRutasUsuario(usuarioParseado.id);
        const rutaActiva = rutasActivas?.find(r => !r.finalizada);
        if (rutaActiva) {
          console.log('🔄 Ruta activa encontrada:', rutaActiva.numero);
          Alert.alert(
            'Ruta Incompleta',
            `Hay una ruta activa: ${rutaActiva.numero}. ¿Deseas continuar?`,
            [
              {
                text: 'Nueva Ruta',
                style: 'cancel',
                onPress: () => setLoading(false)
              },
              {
                text: 'Continuar',
                onPress: () => {
                  navigation.navigate('Scanner', {
                    rutaRecuperada: rutaActiva,
                    tieneBuffer: true
                  });
                }
              }
            ]
          );
        }
      } catch (error) {
        console.error('❌ Error al verificar ruta activa:', error);
      }
    } catch (error) {
      console.error('❌ Error cargando usuario:', error);
      navigation.replace('Login');
    } finally {
      setLoading(false);
    }
  };

  const handleNuevaRuta = () => {
    // ✅ Navega directamente a ScannerScreen donde está FormRuta
    navigation.navigate('Scanner');
  };

  const handleHistorial = () => navigation.navigate('Historial');
  const handleControlListado = () => navigation.navigate('ControlList');

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem('userData');
            navigation.replace('Login');
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando menú...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header con información del usuario */}
      {usuario && (
        <Card style={styles.userCard}>
          <Card.Content>
            <View style={styles.userInfo}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {usuario.nombre?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
              </View>
              <View style={styles.userDetails}>
                <Text style={styles.userName}>
                  {usuario.nombre} {usuario.apellido}
                </Text>
                <Text style={styles.userStation}>
                  🏢 {usuario.estacion}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      )}

      <Title style={styles.screenTitle}>Opciones Principales</Title>

      {/* Card: Escanear Nueva Ruta - SIN MODAL, va directo a FormRuta */}
      <Card style={styles.menuCard}>
        <Card.Content style={styles.cardContentRow}>
          <View style={styles.cardIconContainer}>
            <Text style={styles.cardIcon}>📦</Text>
          </View>
          <View style={styles.cardTextContainer}>
            <Title style={styles.cardTitle}>Escanear Nueva Ruta</Title>
            <Paragraph style={styles.cardDescription}>
              Configurar rango y comenzar nuevo control de ruta
            </Paragraph>
          </View>
        </Card.Content>
        <Card.Actions style={styles.cardActions}>
          <Button
            mode="contained"
            onPress={handleNuevaRuta}
            style={styles.actionButton}
            icon="cog"
          >
            ⚙️ Ir a Configurar
          </Button>
        </Card.Actions>
      </Card>

      {/* Card: Historial */}
      <Card style={styles.menuCard}>
        <Card.Content style={styles.cardContentRow}>
          <View style={styles.cardIconContainer}>
            <Text style={styles.cardIcon}>📋</Text>
          </View>
          <View style={styles.cardTextContainer}>
            <Title style={styles.cardTitle}>Historial de Rutas</Title>
            <Paragraph style={styles.cardDescription}>
              Ver rutas completadas, compartir reportes o eliminar registros
            </Paragraph>
          </View>
        </Card.Content>
        <Card.Actions style={styles.cardActions}>
          <Button
            mode="outlined"
            onPress={handleHistorial}
            style={styles.actionButton}
            icon="history"
          >
            Ver Historial
          </Button>
        </Card.Actions>
      </Card>

      {/* Card: Controlar Listado */}
      <Card style={styles.menuCard}>
        <Card.Content style={styles.cardContentRow}>
          <View style={styles.cardIconContainer}>
            <Text style={styles.cardIcon}>📊</Text>
          </View>
          <View style={styles.cardTextContainer}>
            <Title style={styles.cardTitle}>Controlar Listado</Title>
            <Paragraph style={styles.cardDescription}>
              Comparar escaneos con archivos CSV/XLSX de ruteo primario
            </Paragraph>
          </View>
        </Card.Content>
        <Card.Actions style={styles.cardActions}>
          <Button
            mode="outlined"
            onPress={handleControlListado}
            style={styles.actionButton}
            icon="file-compare"
          >
            Controlar
          </Button>
        </Card.Actions>
      </Card>

      {/* Botón de Cerrar Sesión */}
      <Button
        mode="outlined"
        onPress={handleLogout}
        style={styles.logoutButton}
        textColor="#f44336"
        icon="logout"
      >
        🚪 Cerrar Sesión
      </Button>
    </View>
  );
};

export default MainMenuScreen;