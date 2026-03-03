import React from 'react';
import { View, FlatList, TouchableOpacity, Text } from 'react-native';
import { Text, Card } from 'react-native-paper';
import { styles } from '../styles/ProductListStyles';

const ProductList = ({ productos = [], onProductPress }) => {
  const renderProductItem = ({ item, index }) => {
    // ✅ Validación robusta
    if (!item || typeof item !== 'object') {
      console.warn('⚠️ [ProductList] Item inválido:', item, 'índice:', index);
      return null;
    }

    const codigo = String(item.codigo ?? '');
    const detalle = String(item.detalle ?? '');
    const timestamp = item.timestamp
      ? new Date(item.timestamp).toLocaleTimeString()
      : 'Sin hora';

    return (
      <TouchableOpacity onPress={() => onProductPress(item)}>
        <Card style={styles.productCard}>
          <Card.Content>
            <View style={styles.productRow}>
              <Text style={styles.productCode}>{codigo}</Text>
              <Text style={styles.productIndex}>#{index + 1}</Text>
            </View>
            {detalle ? <Text style={styles.productDetail}>{detalle}</Text> : null}
            <Text style={styles.productTime}>{timestamp}</Text>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  // ✅ Asegurar que `productos` sea siempre un array
  const data = Array.isArray(productos) ? productos : [];

  return (
    <FlatList
      data={data}
      keyExtractor={(item, index) => index.toString()}
      renderItem={renderProductItem}
      contentContainerStyle={styles.listContainer}
      showsVerticalScrollIndicator={true}
    />
  );
};

export default ProductList;