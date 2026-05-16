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

const screenOptions = {
  headerStyle: { backgroundColor: '#2196F3' },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: 'bold' },
};

const AppNavigator = () => {
  const requiereActualizacion = verificarFechaExpiracion();

  return (
    <Stack.Navigator
      initialRouteName={requiereActualizacion ? "UpdateRequired" : "Login"}
      screenOptions={screenOptions}
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