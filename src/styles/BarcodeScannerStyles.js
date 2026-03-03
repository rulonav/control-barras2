import { StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Fondo oscuro semitransparente
  },
  fullOverlay: {
    flex: 1,
  },
  scanFrame: {
    width: width * 0.7, // 70% del ancho de la pantalla
    height: width * 0.7, // Cuadrado
    borderColor: '#00ff00', // Borde verde
    borderWidth: 2,
    borderStyle: 'solid',
  },
  cornerTopLeft: {
    position: 'absolute',
    top: (height - width * 0.7) / 2 - 10, // Ajuste fino para alinear con el borde superior del marco
    left: (width - width * 0.7) / 2 - 10, // Ajuste fino para alinear con el borde izquierdo del marco
    width: 20,
    height: 20,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#00ff00', // Mismo color que el marco
  },
  cornerTopRight: {
    position: 'absolute',
    top: (height - width * 0.7) / 2 - 10,
    right: (width - width * 0.7) / 2 - 10,
    width: 20,
    height: 20,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderColor: '#00ff00',
  },
  cornerBottomLeft: {
    position: 'absolute',
    bottom: (height - width * 0.7) / 2 - 10,
    left: (width - width * 0.7) / 2 - 10,
    width: 20,
    height: 20,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderColor: '#00ff00',
  },
  cornerBottomRight: {
    position: 'absolute',
    bottom: (height - width * 0.7) / 2 - 10,
    right: (width - width * 0.7) / 2 - 10,
    width: 20,
    height: 20,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderColor: '#00ff00',
  },
  scanInfoCard: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 5,
    elevation: 2,
  },
  scanInfoText: {
    fontSize: 14,
    textAlign: 'center',
  },
  scanInfoRuta: {
    fontWeight: 'bold',
    color: '#2196F3',
  },
  scanInfoUsuario: {
    color: '#666',
  },
  scanTriggerButton: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    paddingVertical: 15,
    alignItems: 'center',
    borderRadius: 8,
  },
  scanTriggerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  scanTriggerSubtext: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.8,
    marginTop: 2,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  permissionCard: {
    width: width * 0.8,
    padding: 20,
    elevation: 2,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  permissionContent: {
    alignItems: 'center',
  },
  permissionIcon: {
    fontSize: 48,
    marginBottom: 15,
  },
  permissionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  permissionText: {
    fontSize: 14,
    textAlign: 'center',
    color: '#666',
    marginBottom: 20,
  },
  permissionButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginBottom: 10,
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
  },
  secondaryButtonText: {
    color: '#fff',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: width * 0.8,
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  textInput: {
    width: '100%',
    marginBottom: 15,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 5,
  },
  helpText: {
    fontSize: 12,
    color: '#666',
    marginTop: 10,
    textAlign: 'center',
  },
});

export default styles;