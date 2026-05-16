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

            }
          })()
        ];

        await Promise.all(loadPromises);
        this.soundsLoaded = true;

      } catch (error) {

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

        }) : Promise.resolve()
      );
      await Promise.allSettled(unloadPromises);
      this.soundObjects = {};
      this.soundsLoaded = false;
    } catch (error) {

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

    try {
      await this.playSuccessSound();
      await new Promise(resolve => setTimeout(resolve, 500));
      await this.playErrorSound();
      await new Promise(resolve => setTimeout(resolve, 500));
      await this.playWarningSound();

    } catch (error) {

    }
  }
}

const audioService = new AudioService();
export default audioService;