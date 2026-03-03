// src/components/ModalMellizos.js
import React from 'react';
import { View, Text, Modal, Alert, ScrollView } from 'react-native';
import { Button, Card } from 'react-native-paper';
import { styles } from '../styles/ModalMellizosStyles';

const ModalMellizos = ({
  visible,
  productos,
  mellizosEncontrados,
  mellizoActualIndex,
  onAccionMellizos,
  onSeleccionarAccion,
  onSaltar,
  onManejarAccion
}) => {
  if (!visible) return null;

  const tieneMellizos = mellizosEncontrados && mellizosEncontrados.length > 0;
  const indiceValido = mellizoActualIndex < mellizosEncontrados.length;

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          {tieneMellizos && indiceValido ? (
            <>
              <Text style={styles.modalTitle}>🔄 Revisión de Mellizos</Text>
              <Text style={styles.itemDetails}>
                Tienes {productos.length} Paquetes Escaneados
              </Text>
              <Text style={styles.itemDetails}>
                📊 Progreso: {mellizoActualIndex + 1} de {mellizosEncontrados.length}
              </Text>
              <Card style={{ marginBottom: 15 }}>
                <Card.Content>
                  <Text style={styles.itemText}>
                    🔢 Código: {mellizosEncontrados[mellizoActualIndex].codigo}
                  </Text>
                  <Text style={styles.itemDetails}>
                    📈 Aparece {mellizosEncontrados[mellizoActualIndex].veces} veces en la lista
                  </Text>
                  <ScrollView style={styles.listContainer}>
                    <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>📦 Productos encontrados:</Text>
                    {mellizosEncontrados[mellizoActualIndex].productos.map((producto, index) => (
                      <Text key={index} style={{ fontSize: 14, marginBottom: 3 }}>
                        • ID: {producto.id} - {new Date(producto.timestamp).toLocaleTimeString()}
                        {producto.es_danado && ' ⚠️ DAÑADO'}
                      </Text>
                    ))}
                  </ScrollView>
                  <Text style={styles.itemDetails}>
                    ❓ ¿Qué acción deseas realizar?
                  </Text>
                </Card.Content>
              </Card>
              <View style={styles.buttonContainer}>
                <Button
                  mode="contained"
                  onPress={() => onManejarAccion('marcar_todos_mellizos')}
                  style={[styles.actionButton, styles.keepButton]}
                  icon="package-variant"
                >
                  📦 Marcar TODOS
                </Button>
                <Button
                  mode="contained"
                  onPress={() => onManejarAccion('eliminar_dejando_uno')}
                  style={[styles.actionButton, styles.removeButton]}
                  icon="delete"
                >
                  🗑️ Eliminar Dups
                </Button>
                <Button
                  mode="outlined"
                  onPress={onSaltar}
                  style={[styles.actionButton, styles.separateButton]}
                  icon="skip-next"
                >
                  ⏭️ Saltar
                </Button>
                <Button
                  mode="text"
                  onPress={onSaltar}
                  style={styles.actionButton}
                  icon="close"
                >
                  ❌ Cancelar
                </Button>
              </View>
            </>
          ) : (
            <View style={{ alignItems: 'center' }}>
              <Text style={styles.modalTitle}>✅ Revisión Completada</Text>
              <Text style={styles.itemDetails}>
                {tieneMellizos ? 'Todos los mellizos han sido procesados' : 'No se encontraron mellizos'}
              </Text>
              <Card style={{ marginBottom: 15, width: '100%' }}>
                <Card.Content>
                  <Text style={{ fontWeight: 'bold', marginBottom: 10 }}>📊 Estadísticas Finales</Text>
                  <Text style={styles.itemDetails}>
                    • 📦 Total productos: {productos.length}
                  </Text>
                  <Text style={styles.itemDetails}>
                    • ⚠️ Productos dañados: {productos.filter(p => p.es_danado).length}
                  </Text>
                  <Text style={styles.itemDetails}>
                    • 🔄 Productos mellizos: {productos.filter(p => p.es_mellizo).length}
                  </Text>
                </Card.Content>
              </Card>
              <Button
                mode="contained"
                onPress={onSaltar}
                style={[styles.actionButton, styles.keepButton]}
                icon="check"
              >
                ✅ Continuar
              </Button>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default ModalMellizos;