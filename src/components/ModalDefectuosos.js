// src/components/ModalDefectuosos.js
import React from 'react';
import { View, ScrollView, Text, TouchableOpacity, Modal, Alert } from 'react-native';
import { Button, Card } from 'react-native-paper';
// ✅ CORREGIDO: Importar desde ModalDefectuososStyles en lugar de ScannerScreenStyles
import { styles } from '../styles/ModalDefectuososStyles';

const ModalDefectuosos = ({
  visible,
  onClose,
  productos,
  onMarcarDefectuoso
}) => {
  // Filtrar productos no defectuosos
  const productosDisponibles = productos ? productos.filter(p => !p.es_defectuoso) : [];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>⚠️ Seleccionar Producto Defectuoso</Text>
          <Text style={styles.modalSubtitle}>
            {productosDisponibles.length} productos disponibles
          </Text>
          <ScrollView style={styles.modalList}>
            {productosDisponibles.map((producto, index) => (
              <TouchableOpacity
                key={index}
                style={styles.modalItem}
                onPress={async () => {
                  try {
                    const resultado = await onMarcarDefectuoso(producto);
                    onClose();
                    if (resultado && resultado.success) {
                      Alert.alert('✅ Éxito', resultado.mensaje || 'Producto marcado como defectuoso');
                    } else if (resultado && !resultado.success) {
                      Alert.alert('❌ Error', resultado.mensaje || 'No se pudo marcar el producto');
                    } else {
                      Alert.alert('✅ Éxito', 'Producto marcado como defectuoso');
                    }
                  } catch (error) {
                    Alert.alert('❌ Error', 'No se pudo marcar el producto como defectuoso: ' + error.message);
                  }
                }}
              >
                <Text style={styles.modalItemText}>{producto.codigo}</Text>
                <Text style={styles.modalItemDetail}>
                  {producto.detalle || 'Normal'} - {new Date(producto.timestamp).toLocaleTimeString()}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <View style={styles.modalButtons}>
            <Button
              mode="outlined"
              onPress={onClose}
              style={styles.modalCancelButton}
            >
              ❌ Cancelar
            </Button>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ModalDefectuosos;