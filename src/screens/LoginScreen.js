// src/screens/LoginScreen.js
import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import {
  TextInput,
  Button,
  Text,
  Card,
  Title,
  ActivityIndicator
} from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import databaseService from '../services/databaseService';
import { styles } from '../styles/LoginScreenStyles';

const LoginScreen = ({ navigation }) => {
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [estacion, setEstacion] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingUser, setCheckingUser] = useState(true);

  useEffect(() => {
    checkExistingUser();
  }, []);

  const checkExistingUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('userData');
      console.log('📋 Verificando usuario existente...');
      
      if (userData) {
        const parsedUser = JSON.parse(userData);
        console.log('✅ Usuario encontrado en AsyncStorage:', parsedUser);
        
        // ✅ VERIFICAR QUE TENGA ID VÁLIDO
        if (parsedUser.id) {
          console.log('✅ Usuario tiene ID válido, redirigiendo...');
          navigation.replace('MainMenu');
        } else {
          console.log('⚠️ Usuario sin ID de SQLite, mostrando formulario para sincronizar');
          setNombre(parsedUser.nombre || '');
          setApellido(parsedUser.apellido || '');
          setEstacion(parsedUser.estacion || '');
          setEmail(parsedUser.email || '');
        }
      } else {
        console.log('👤 No hay usuario, mostrando formulario');
      }
    } catch (error) {
      console.error('❌ Error verificando usuario:', error);
    } finally {
      setCheckingUser(false);
    }
  };

  const handleLogin = async () => {
    if (!nombre.trim() || !estacion.trim()) {
      Alert.alert('Error', 'Nombre y estación son obligatorios');
      return;
    }

    setLoading(true);
    try {
      const userData = {
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        estacion: estacion.trim(),
        email: email.trim(),
        loginTime: new Date().toISOString()
      };

      console.log('💾 Guardando datos de usuario en AsyncStorage...');
      
      // ✅ PRIMERO: Sincronizar con SQLite para obtener ID
      console.log('💾 Sincronizando usuario con BD SQLite...');
      const usuarioConId = await databaseService.crearOActualizarUsuario(userData);
      console.log('✅ Usuario en SQLite:', usuarioConId);
      
      if (!usuarioConId || !usuarioConId.id) {
        throw new Error('No se pudo obtener ID de usuario de la base de datos');
      }

      // ✅ SEGUNDO: Guardar en AsyncStorage CON EL ID
      const userDataConId = {
        ...userData,
        id: usuarioConId.id
      };
      await AsyncStorage.setItem('userData', JSON.stringify(userDataConId));
      console.log('✅ Usuario guardado en AsyncStorage con ID:', usuarioConId.id);
      
      navigation.replace('MainMenu');
    } catch (error) {
      console.error('❌ Error guardando usuario:', error);
      Alert.alert('Error', 'No se pudo guardar la información del usuario: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (checkingUser) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Verificando sesión...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Card style={styles.card}>
          <Card.Content>
            <Title style={styles.title}>Control de Rutas</Title>
            <Text style={styles.subtitle}>Ingrese sus datos para comenzar</Text>
            
            <TextInput
              label="Nombre *"
              value={nombre}
              onChangeText={setNombre}
              style={styles.input}
              mode="outlined"
              autoCapitalize="words"
            />
            
            <TextInput
              label="Apellido"
              value={apellido}
              onChangeText={setApellido}
              style={styles.input}
              mode="outlined"
              autoCapitalize="words"
            />
            
            <TextInput
              label="Estación de Trabajo *"
              value={estacion}
              onChangeText={setEstacion}
              style={styles.input}
              mode="outlined"
              autoCapitalize="characters"
            />
            
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              style={styles.input}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.button}
              contentStyle={styles.buttonContent}
            >
              {loading ? 'Iniciando...' : 'Comenzar'}
            </Button>
            
            <Text style={styles.requiredText}>* Campos obligatorios</Text>
          </Card.Content>
        </Card>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;