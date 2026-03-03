// src/components/ModalDanados.js
import React from 'react';
import { View, ScrollView, Text, TouchableOpacity, Modal, Alert } from 'react-native';
import { Button, Card } from 'react-native-paper';
// ✅ CORREGIDO: Importar desde ModalDanadosStyles en lugar de ScannerScreenStyles
import { styles } from '../styles/ModalDanadosStyles';

const ModalDanados = ({
  visible,
  onClose,
  productos,
  onMarcarDanado
}) => {
  // Filtrar productos no dañados
  const productosDisponibles = productos ? productos.filter(p => !p.es_danado) : [];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>⚠️ Seleccionar Producto Dañado</Text>
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
                    const resultado = await onMarcarDanado(producto);
                    onClose();
                    if (resultado && resultado.success) {
                      Alert.alert('✅ Éxito', resultado.mensaje || 'Producto marcado como dañado');
                    } else if (resultado && !resultado.success) {
                      Alert.alert('❌ Error', resultado.mensaje || 'No se pudo marcar el producto');
                    } else {
                      Alert.alert('✅ Éxito', 'Producto marcado como dañado');
                    }
                  } catch (error) {
                    Alert.alert('❌ Error', 'No se pudo marcar el producto como dañado: ' + error.message);
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

export default ModalDanados;