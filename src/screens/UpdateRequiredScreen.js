// src/screens/UpdateRequiredScreen.js
import React from 'react';
import { View, Text, StyleSheet, Alert, Linking } from 'react-native';
import { Button, Card } from 'react-native-paper';

const UpdateRequiredScreen = ({ navigation }) => {
  const FECHA_LIMITE = '2026-07-01'; // 1 de julio de 2026

  const handleContactDeveloper = () => {
    Alert.alert(
      'Actualización Requerida',
      'Por favor, contacta al desarrollador para obtener la versión más reciente de la aplicación.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Contactar',
          onPress: () => {
            // Aquí puedes agregar el contacto del desarrollador
            Linking.openURL('mailto:desarrollador@ejemplo.com?subject=Actualización App Control de Barras');
          }
        }
      ]
    );
  };

  const handleTryAgain = () => {
    // Verificar si aún está en fecha límite
    const fechaActual = new Date();
    const fechaLimite = new Date(FECHA_LIMITE);
    
    if (fechaActual < fechaLimite) {
      // Si ya no está en fecha límite, volver al login
      navigation.replace('Login');
    } else {
      Alert.alert(
        'Aún requiere actualización',
        'La fecha límite aún no ha pasado. Por favor contacta al desarrollador.'
      );
    }
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.title}>⚠️ Actualización Requerida</Text>
          
          <View style={styles.messageContainer}>
            <Text style={styles.message}>
              Esta versión de la aplicación ha expirado.
            </Text>
            <Text style={styles.subMessage}>
              Fecha límite: {FECHA_LIMITE}
            </Text>
            <Text style={styles.instruction}>
              Para continuar usando la aplicación, necesitas actualizar a la versión más reciente.
            </Text>
          </View>

          <Button
            mode="contained"
            onPress={handleContactDeveloper}
            style={styles.button}
            icon="email"
            contentStyle={styles.buttonContent}
          >
            📧 Solicitar Actualización
          </Button>

          <Button
            mode="outlined"
            onPress={handleTryAgain}
            style={styles.secondaryButton}
            icon="refresh"
            contentStyle={styles.buttonContent}
          >
            🔄 Intentar de Nuevo
          </Button>

          <Text style={styles.footer}>
            La aplicación no funcionará hasta que se actualice.
          </Text>
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8f9fa',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    padding: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#dc3545',
    marginBottom: 20,
    textAlign: 'center',
  },
  messageContainer: {
    backgroundColor: '#fff8f8',
    padding: 15,
    borderRadius: 8,
    marginBottom: 25,
    borderLeftWidth: 4,
    borderLeftColor: '#dc3545',
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
    color: '#333',
  },
  subMessage: {
    fontSize: 16,
    marginBottom: 12,
    textAlign: 'center',
    color: '#666',
  },
  instruction: {
    fontSize: 14,
    textAlign: 'center',
    color: '#888',
    lineHeight: 20,
  },
  button: {
    marginTop: 10,
    marginBottom: 10,
    paddingVertical: 6,
  },
  secondaryButton: {
    marginBottom: 15,
    paddingVertical: 6,
  },
  buttonContent: {
    paddingVertical: 6,
  },
  footer: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default UpdateRequiredScreen;