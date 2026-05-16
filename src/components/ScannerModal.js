import React from 'react';
import { View, Modal, TouchableOpacity, Text } from 'react-native';
import { Card, Button } from 'react-native-paper';
import { styles } from '../styles/ScannerModalStyles';

const ScannerModal = ({ visible, onClose, actions }) => {

  const handleAction = (onPress, label) => {

    onPress();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalContent}>
          {actions.map((action, index) => (
            <Button
              key={index}
              mode={action.style === 'cancel' ? 'outlined' : 'contained'}
              onPress={() => handleAction(action.onPress, action.label)}
              style={styles.modalActionItem}
            >
              {action.label}
            </Button>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

export default ScannerModal;