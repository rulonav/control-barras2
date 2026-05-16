import * as SQLite from 'expo-sqlite';

// Abrir o crear la base de datos
const db = SQLite.openDatabase('rutaScanner.db');

// Función para inicializar la base de datos
export const initDatabase = () => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      // Configurar la zona horaria para Argentina (UTC-3) - Opcional en algunos casos
      // La clave es usar 'localtime' en los DEFAULT
      tx.executeSql(
        `PRAGMA user_version = 1;` // Opcional: para control de versiones
      );

      // Crear tabla de usuarios
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          nombre TEXT NOT NULL,
          apellido TEXT,
          estacion TEXT NOT NULL,
          email TEXT,
          created_at TEXT DEFAULT (datetime('now', 'localtime'))
        )`,
        [],
        () => console.log('✅ Tabla users creada/existe'),
        (_, error) => {
          console.error('❌ Error creando tabla users:', error);
          return true;
        }
      );

      // Crear tabla de rutas
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS rutas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          numero TEXT NOT NULL,
          usuario_id INTEGER NOT NULL,
          fecha TEXT DEFAULT (datetime('now', 'localtime')),
          finalizada BOOLEAN DEFAULT 0,
          FOREIGN KEY (usuario_id) REFERENCES users (id)
        )`,
        [],
        () => console.log('✅ Tabla rutas creada/existe'),
        (_, error) => {
          console.error('❌ Error creando tabla rutas:', error);
          return true;
        }
      );

      // Crear tabla de productos
      tx.executeSql(
        `CREATE TABLE IF NOT EXISTS productos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          codigo TEXT NOT NULL,
          ruta_id INTEGER NOT NULL,
          detalle TEXT,
          es_mellizo BOOLEAN DEFAULT 0,
          es_defectuoso BOOLEAN DEFAULT 0,
          es_repetido BOOLEAN DEFAULT 0,
          timestamp TEXT DEFAULT (datetime('now', 'localtime')),
          FOREIGN KEY (ruta_id) REFERENCES rutas (id)
        )`,
        [],
        () => console.log('✅ Tabla productos creada/existe'),
        (_, error) => {
          console.error('❌ Error creando tabla productos:', error);
          return true;
        }
      );
    }, 
    (error) => {
      console.error('❌ Error en transacción de inicialización:', error);
      reject(error);
    }, 
    () => {
      console.log('✅ Base de datos inicializada correctamente');
      resolve();
    });
  });
};

export default db;