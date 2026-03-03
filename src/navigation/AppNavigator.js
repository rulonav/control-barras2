// src/navigation/AppNavigator.js
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/LoginScreen';
import MainMenuScreen from '../screens/MainMenuScreen';
import ScannerScreen from '../screens/ScannerScreen';
import HistorialScreen from '../screens/HistorialScreen';
import ControlListScreen from '../screens/ControlListScreen';
import UpdateRequiredScreen from '../screens/UpdateRequiredScreen';
import ReporteScreen from '../screens/ReporteScreen';
import { verificarFechaExpiracion } from '../utils/dateUtils';

const Stack = createNativeStackNavigator();

const necesitaActualizacion = () => {
  const FECHA_LIMITE = new Date('2026-07-01');
  const fechaActual = new Date();
  return fechaActual >= FECHA_LIMITE;
};

const AppNavigator = () => {
  const requiereActualizacion = verificarFechaExpiracion();
  
  console.log('🔍 [AppNavigator] Verificando expiración:', requiereActualizacion ? 'EXPIRADA' : 'VÁLIDA');

  return (
    <Stack.Navigator
      initialRouteName={requiereActualizacion ? "UpdateRequired" : "Login"}
      screenOptions={{
        headerStyle: { backgroundColor: '#2196F3' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen
        name="UpdateRequired"
        component={UpdateRequiredScreen}
        options={{ headerShown: false, gestureEnabled: false }}
      />
      
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      
      <Stack.Screen
        name="MainMenu"
        component={MainMenuScreen}
        options={{ title: 'Menú Principal' }}
      />
      
      <Stack.Screen
        name="Scanner"
        component={ScannerScreen}
        options={{ title: 'Escaneo de Ruta' }}
      />
      
      <Stack.Screen
        name="Historial"
        component={HistorialScreen}
        options={{ title: 'Historial de Rutas' }}
      />
      
      <Stack.Screen
        name="ControlList"
        component={ControlListScreen}
        options={{ title: 'Control de Listado' }}
      />
      
      <Stack.Screen
        name="Reporte"
        component={ReporteScreen}
        options={{ title: 'Reporte de Ruta' }}
      />
    </Stack.Navigator>
  );
};

export default AppNavigator;