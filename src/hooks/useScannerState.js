import { useState } from 'react';

export const useScannerState = () => {
  const [userData, setUserData] = useState(null);
  const [ruta, setRuta] = useState(null);
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [escaneando, setEscaneando] = useState(false);
  const [ultimoResultado, setUltimoResultado] = useState(null);
  const [revisandoMellizos, setRevisandoMellizos] = useState(false);
  const [mellizosEncontrados, setMellizosEncontrados] = useState([]);
  const [mellizoActualIndex, setMellizoActualIndex] = useState(0);
  const [accionMellizos, setAccionMellizos] = useState(null);

  return {
    userData,
    setUserData,
    ruta,
    setRuta,
    productos,
    setProductos,
    loading,
    setLoading,
    escaneando,
    setEscaneando,
    ultimoResultado,
    setUltimoResultado,
    revisandoMellizos,
    setRevisandoMellizos,
    mellizosEncontrados,
    setMellizosEncontrados,
    mellizoActualIndex,
    setMellizoActualIndex,
    accionMellizos,
    setAccionMellizos
  };
};