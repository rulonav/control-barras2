// src/styles/ProductListStyles.js
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  listContainer: {
    padding: 5,
  },
  productCard: {
    marginVertical: 2,
    marginHorizontal: 5,
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productCode: {
    fontSize: 16,
    fontWeight: '500',
  },
  productIndex: {
    fontSize: 12,
    color: '#666',
  },
  productDetail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  productTime: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
});

// ✅ CORREGIDO: Exportar con nombre
export { styles };