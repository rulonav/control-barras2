// src/components/ScannerView.js
import React from 'react';
import ScannerInterface from './ScannerInterface';

const ScannerView = ({ ruta, userData, finalizarRuta, navigation }) => {
  if (!ruta) {
    return null;
  }

  return (
    <ScannerInterface
      ruta={ruta}
      userData={userData}
      finalizarRutaActual={async () => {
        await finalizarRuta(ruta.id);
        navigation.navigate('MainMenu');
      }}
    />
  );
};

export default ScannerView;