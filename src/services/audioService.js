// src/services/audioService.js
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

// ✅ CORREGIDO: Nombre del archivo con mayúscula (Bip.mp3)
import bipSound from '../../assets/Sound/Bip.mp3';
import errorSound from '../../assets/Sound/error.mp3';

class AudioService {
  constructor() {
    this.soundObjects = {};
    this.initialized = false;
    this.soundsLoaded = false;
    this.loadPromise = null;
  }

  // ✅ INICIALIZAR MODO DE AUDIO
  async initialize() {
    if (this.initialized) return;
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });
      this.initialized = true;
    } catch (error) {
      console.error('Error inicializando audio:', error);
    }
  }

  // ✅ CARGAR SONIDOS
  async loadSounds() {
    if (this.loadPromise) return this.loadPromise;
    if (this.soundsLoaded) return Promise.resolve();

    this.loadPromise = (async () => {
      try {
        await this.initialize();
        
        const loadPromises = [
          (async () => {
            try {
              const successSound = new Audio.Sound();
              await successSound.loadAsync(bipSound, {
                shouldPlay: false,
                isLooping: false
              });
              this.soundObjects.success = successSound;
            } catch (error) {
              console.warn('Error cargando sonido success:', error);
            }
          })(),
          (async () => {
            try {
              const errorSoundObj = new Audio.Sound();
              await errorSoundObj.loadAsync(errorSound, {
                shouldPlay: false,
                isLooping: false
              });
              this.soundObjects.error = errorSoundObj;
            } catch (error) {
              console.warn('Error cargando sonido error:', error);
            }
          })()
        ];

        await Promise.all(loadPromises);
        this.soundsLoaded = true;
        console.log('✅ Sonidos cargados y listos');
      } catch (error) {
        console.warn('No se pudieron cargar los sonidos:', error);
        this.soundsLoaded = false;
      } finally {
        this.loadPromise = null;
      }
    })();

    return this.loadPromise;
  }

  // ✅ REPRODUCIR SONIDO DE ÉXITO
  async playSuccessSound() {
    try {
      await Promise.allSettled([
        this.playSound('success'),
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      ]);
    } catch (error) {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (hapticError) {
        console.warn('Error en háptica de éxito:', hapticError);
      }
    }
  }

  // ✅ REPRODUCIR SONIDO DE ERROR
  async playErrorSound() {
    try {
      await Promise.allSettled([
        this.playSound('error'),
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      ]);
    } catch (error) {
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } catch (hapticError) {
        console.warn('Error en háptica de error:', hapticError);
      }
    }
  }

  // ✅ REPRODUCIR SONIDO DE ADVERTENCIA
  async playWarningSound() {
    try {
      await Promise.allSettled([
        this.playSound('error'),
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      ]);
    } catch (error) {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch (hapticError) {
        console.warn('Error en háptica de advertencia:', hapticError);
      }
    }
  }

  // ✅ REPRODUCIR SONIDO GENÉRICO
  async playSound(type) {
    try {
      if (!this.soundsLoaded) {
        await this.loadSounds();
      }

      const sound = this.soundObjects[type];
      
      if (sound && this.soundsLoaded) {
        try {
          await sound.stopAsync();
        } catch (stopError) {
          // Ignorar errores al detener
        }
        await sound.setPositionAsync(0);
        await sound.playAsync();
      }
    } catch (soundError) {
      console.warn(`Error reproduciendo sonido ${type}:`, soundError);
      throw soundError;
    }
  }

  // ✅ PRE-CARGAR TODOS LOS SONIDOS
  async preloadAllSounds() {
    if (!this.soundsLoaded) {
      await this.loadSounds();
    }
  }

  // ✅ DESCARGAR SONIDOS
  async unloadSounds() {
    try {
      const unloadPromises = Object.values(this.soundObjects).map(sound =>
        sound ? sound.unloadAsync().catch(error => {
          console.warn('Error descargando sonido:', error);
        }) : Promise.resolve()
      );
      await Promise.allSettled(unloadPromises);
      this.soundObjects = {};
      this.soundsLoaded = false;
    } catch (error) {
      console.error('Error descargando sonidos:', error);
    }
  }

  // ✅ OBTENER ESTADO DE SONIDOS
  getSoundStatus() {
    return {
      initialized: this.initialized,
      soundsLoaded: this.soundsLoaded,
      soundsAvailable: Object.keys(this.soundObjects).length
    };
  }

  // ✅ PROBAR SONIDOS
  async testSounds() {
    console.log('🔊 Probando sonidos...');
    try {
      await this.playSuccessSound();
      await new Promise(resolve => setTimeout(resolve, 500));
      await this.playErrorSound();
      await new Promise(resolve => setTimeout(resolve, 500));
      await this.playWarningSound();
      console.log('✅ Prueba de sonidos completada');
    } catch (error) {
      console.error('❌ Error en prueba de sonidos:', error);
    }
  }
}

const audioService = new AudioService();
export default audioService;