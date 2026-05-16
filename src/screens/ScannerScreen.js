// src/screens/ScannerScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import { View, Alert, BackHandler } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import RutaForm from '../components/RutaForm';
import ScannerInterface from '../components/ScannerInterface';
import databaseService from '../services/databaseService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useIsFocused } from '@react-navigation/native';

const ScannerScreen = ({ navigation, route }) => {
  const isFocused = useIsFocused();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [ruta, setRuta] = useState(null);
  const [rangoEscaneo, setRangoEscaneo] = useState(null);
  const [fechaCreacionRuta, setFechaCreacionRuta] = useState(null);

  useEffect(() => {
    if (!isFocused) return;
    
    const cargarDatos = async () => {
      try {
        // ✅ VERIFICAR SI VIENE CON RUTA RECUPERADA (para agregar paquetes o continuar)
        if (route?.params?.rutaRecuperada) {
          setRuta(route.params.rutaRecuperada);
          if (route.params.rangoEscaneo) {
            setRangoEscaneo(route.params.rangoEscaneo);
          }
          if (route.params.fechaCreacion) {
            setFechaCreacionRuta(route.params.fechaCreacion);
          }
          setLoading(false);
          console.log('🔄 Recuperando ruta activa:', route.params.rutaRecuperada.numero);
          return;
        }

        // ✅ CARGAR USUARIO DESDE ASYNCSTORAGE PRIMERO
        const userDataStorage = await AsyncStorage.getItem('userData');
        if (!userDataStorage) {
          Alert.alert('Error', 'No se encontró usuario. Inicie sesión nuevamente.');
          navigation.navigate('MainMenu');
          return;
        }

        const usuarioParseado = JSON.parse(userDataStorage);

        // ✅ VERIFICAR QUE TENGA ID VÁLIDO
        if (!usuarioParseado.id) {
          console.log('⚠️ Usuario sin ID válido, sincronizando con BD...');
          const usuarioBD = await databaseService.crearOActualizarUsuario(usuarioParseado);
          if (usuarioBD && usuarioBD.id) {
            await AsyncStorage.setItem('userData', JSON.stringify({
              ...usuarioParseado,
              id: usuarioBD.id
            }));
            setUserData(usuarioBD);
          } else {
            Alert.alert('Error', 'Usuario no válido. Inicie sesión nuevamente.');
            navigation.navigate('Login');
            return;
          }
        } else {
          setUserData(usuarioParseado);
        }

        console.log('✅ Usuario cargado:', usuarioParseado.nombre, 'ID:', usuarioParseado.id);
      } catch (error) {
        console.error('❌ Error al cargar datos:', error);
        Alert.alert('Error', 'No se pudieron cargar los datos: ' + error.message);
        navigation.navigate('MainMenu');
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [isFocused, route?.params?.rutaRecuperada]);

  // ✅ CREAR RUTA CON RANGO CORREGIDO
  const handleCrearRuta = useCallback(async (numeroRuta, tipoRuta, rangoConfig = null) => {
    if (!userData) {
      Alert.alert('Error', 'Usuario no disponible');
      return;
    }

    if (!userData.id) {
      Alert.alert('Error', 'ID de usuario no válido. Inicie sesión nuevamente.');
      navigation.navigate('Login');
      return;
    }

    try {
      console.log('🔷 Creando ruta:', numeroRuta, 'para usuario ID:', userData.id);
      
      const nuevaRuta = await databaseService.crearRuta({
        numero: numeroRuta,
        usuario_id: userData.id
      });

      if (!nuevaRuta || !nuevaRuta.id) {
        throw new Error('No se pudo crear la ruta en la base de datos');
      }

      console.log('✅ Ruta creada:', nuevaRuta);
      setRuta(nuevaRuta);
      setFechaCreacionRuta(new Date().toISOString());

      // ✅ GUARDAR CONFIGURACIÓN DE RANGO CORREGIDA
      if (rangoConfig) {
        // ✅ CORREGIDO: Los valores YA vienen como números completos desde RutaForm
        // codigoInicial = 45000000000 (prefijo1 + 9 ceros)
        // codigoFinal = 47999999999 (prefijo2 + 9 nueves)
        setRangoEscaneo({
          inicial: rangoConfig.codigoInicial,  // ej: 45000000000
          final: rangoConfig.codigoFinal,      // ej: 47999999999
          prefijo1: rangoConfig.prefijo1,      // ej: 45
          prefijo2: rangoConfig.prefijo2,      // ej: 47
          tipo: tipoRuta
        });
        console.log('📊 Rango de escaneo configurado:', {
          inicial: rangoConfig.codigoInicial,
          final: rangoConfig.codigoFinal,
          prefijo1: rangoConfig.prefijo1,
          prefijo2: rangoConfig.prefijo2
        });
      }
    } catch (error) {
      console.error('💥 Error al crear ruta:', error);
      Alert.alert('Error', 'No se pudo crear la ruta: ' + error.message);
    }
  }, [userData, navigation]);

  // ✅ MANEJAR BOTÓN FÍSICO DE RETROCESO (se maneja en ScannerInterface)
  useEffect(() => {
    if (!ruta || !isFocused) return;
    
    const onBackPress = () => {
      // El back button se maneja en ScannerInterface con modal personalizado
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => backHandler.remove();
  }, [ruta, isFocused]);

  // ✅ LIMPIEZA AL SALIR DE LA PANTALLA
  useEffect(() => {
    return () => {
      console.log('🧹 ScannerScreen - Limpiando al desmontar');
    };
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#2196F3" />
      </View>
    );
  }

  if (ruta) {
    return (
      <ScannerInterface
        ruta={ruta}
        userData={userData}
        navigation={navigation}
        modoDanado={route?.params?.modoDanado || false}
        rangoEscaneo={rangoEscaneo}
        fechaCreacion={fechaCreacionRuta}
      />
    );
  }

  return <RutaForm onCrearRuta={handleCrearRuta} userData={userData} />;
};

export default ScannerScreen;