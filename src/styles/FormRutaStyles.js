// src/styles/FormRutaStyles.js
import { StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  scrollContent: { padding: 10 },
  card: { padding: 15, elevation: 2, backgroundColor: '#fff', borderRadius: 8 },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333', textAlign: 'center' },
  
  // SECCIÓN DE RANGO
  rangoSection: { marginBottom: 15, padding: 10, backgroundColor: '#f9f9f9', borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  rangoTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 5, color: '#333' },
  rangoInputs: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginVertical: 10 },
  rangoInputWrapper: { alignItems: 'center', flex: 1 },
  rangoLabel: { fontSize: 12, color: '#666', marginBottom: 4 },
  rangoInput: { width: 80, padding: 10, fontSize: 18, textAlign: 'center', backgroundColor: '#fff', borderRadius: 6 },
  
  // ✅ CONTORNO VISIBLE PARA INPUTS
  inputVisibleBorder: { borderWidth: 2, borderColor: '#2196F3', backgroundColor: '#fff' },
  
  rangoPreview: { fontSize: 11, color: '#888', marginTop: 4 },
  rangoSeparator: { fontSize: 20, color: '#666', fontWeight: 'bold' },
  rangoPreviewContainer: { marginTop: 10, padding: 8, backgroundColor: '#e3f2fd', borderRadius: 4 },
  rangoPreviewText: { fontSize: 13, color: '#1976D2', textAlign: 'center', fontWeight: '500' },
  rangoPreviewSubtext: { fontSize: 10, color: '#666', textAlign: 'center', marginTop: 2, fontStyle: 'italic' },
  
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 15 },
  
  label: { fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 8 },
  tipoSelector: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, gap: 5 },
  tipoButton: { flex: 1 },
  tipoButtonActive: { backgroundColor: '#2196F3' },
  
  input: { padding: 12, fontSize: 16, backgroundColor: '#fff', borderRadius: 6, marginBottom: 10 },
  
  previewContainer: { marginTop: 5, marginBottom: 15, padding: 8, backgroundColor: '#f0f7ff', borderRadius: 4 },
  previewText: { fontSize: 13, color: '#666' },
  previewValue: { fontWeight: 'bold', color: '#2196F3' },
  
  button: { marginTop: 10, paddingVertical: 6 },
  helpText: { fontSize: 11, color: '#999', textAlign: 'center', marginTop: 10, fontStyle: 'italic' },
});

export { styles };