// App.js - Entry Point de la Aplicación
import React, { useEffect, useState, useRef } from 'react';
import { View, ActivityIndicator, Text, StyleSheet, LogBox } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { Provider as PaperProvider } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AppNavigator from './src/navigation/AppNavigator';
import theme from './src/theme';
import databaseService from './src/services/databaseService';
import audioService from './src/services/audioService';
import { verificarFechaExpiracion } from './src/utils/dateUtils';

// Ignorar warnings específicos de Expo que no afectan funcionalidad
LogBox.ignoreLogs([
  'Require cycle:',
  'Setting a timer for a long period of time',
]);

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [initError, setInitError] = useState(null);
  // ✅ CORREGIDO: Agregar estado isExpired que faltaba
  const [isExpired, setIsExpired] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    initializeApp();
    return () => {
      isMounted.current = false;
    };
  }, []);

  const initializeApp = async () => {
    try {
      console.log('🚀 Iniciando aplicación...');
      
      // 1. Inicializar base de datos con retry
      let dbRetries = 0;
      const maxRetries = 3;
      while (dbRetries < maxRetries) {
        try {
          await databaseService.initialize();
          console.log('✅ Base de datos inicializada');
          break;
        } catch (dbError) {
          dbRetries++;
          console.warn(`⚠️ Reintento BD (${dbRetries}/${maxRetries}):`, dbError.message);
          if (dbRetries === maxRetries) throw dbError;
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // 2. Pre-cargar sonidos (no bloqueante si falla)
      audioService.preloadAllSounds()
        .then(() => console.log('✅ Sonidos pre-cargados'))
        .catch(err => console.warn('⚠️ Sonidos no cargados:', err.message));

      // 3. Verificar fecha de expiración
      const expired = verificarFechaExpiracion();
      if (isMounted.current) {
        setIsExpired(expired);
      }
      console.log('📅 Verificación de expiración:', expired ? 'EXPIRADA' : 'VÁLIDA');

      // 4. Limpiar sesiones antiguas
      await cleanupOldSessions();

    } catch (error) {
      console.error('❌ Error crítico inicializando app:', error);
      if (isMounted.current) {
        setInitError(error.message);
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  };

  const cleanupOldSessions = async () => {
    try {
      const keys = [
        'puntoRecuperacion',
        'RECUPERACION_SESSION',
        'temp_scan_buffer_'
      ];
      
      for (const keyPrefix of keys) {
        const allKeys = await AsyncStorage.getAllKeys();
        const matchingKeys = allKeys.filter(k => k.startsWith(keyPrefix));
        
        if (matchingKeys.length > 0) {
          if (keyPrefix === 'puntoRecuperacion') {
            const data = await AsyncStorage.getItem('puntoRecuperacion');
            if (data) {
              const parsed = JSON.parse(data);
              const ahora = Date.now();
              const diferencia = ahora - parsed.timestamp;
              const MAX_TIEMPO = 30 * 60 * 1000;
              
              if (diferencia > MAX_TIEMPO) {
                await AsyncStorage.multiRemove(matchingKeys);
                console.log('🧹 Sesiones expiradas limpiadas:', matchingKeys.length);
              }
            }
          } else {
            await AsyncStorage.multiRemove(matchingKeys);
            console.log('🧹 Buffers temporales limpiados:', matchingKeys.length);
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Error limpiando sesiones:', error);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Cargando Control de Barras...</Text>
        <Text style={styles.loadingSubtext}>v1.0.0</Text>
      </View>
    );
  }

  if (initError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>❌ Error de Inicio</Text>
        <Text style={styles.errorMessage}>{initError}</Text>
        <Text style={styles.errorHint}>Reinicia la aplicación o contacta al desarrollador.</Text>
      </View>
    );
  }

  return (
    <PaperProvider theme={theme}>
      <NavigationContainer independent={true}>
        <AppNavigator />
      </NavigationContainer>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 12,
    color: '#999',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff5f5',
    padding: 20,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 12,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorHint: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});