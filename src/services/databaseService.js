// src/services/databaseService.js
import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';

const database = SQLite.openDatabase('controlbarras.db');

class DatabaseService {
  constructor() {
    this.db = database;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    try {
      await this.createTables();
      this.initialized = true;

    } catch (error) {

      throw error;
    }
  }

  async createTables() {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre TEXT NOT NULL,
            apellido TEXT NOT NULL,
            estacion TEXT NOT NULL,
            email TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )`,
          [],
          () => console.log('✅ Tabla users creada/existe'),
          (_, error) => {
            console.error('❌ Error creando tabla users:', error);
            return false;
          }
        );
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS rutas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            numero TEXT NOT NULL,
            usuario_id INTEGER NOT NULL,
            fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
            finalizada BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (usuario_id) REFERENCES users (id)
          )`,
          [],
          () => console.log('✅ Tabla rutas creada/existe'),
          (_, error) => {
            console.error('❌ Error creando tabla rutas:', error);
            return false;
          }
        );
        tx.executeSql(
          `CREATE TABLE IF NOT EXISTS productos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            codigo TEXT NOT NULL,
            ruta_id INTEGER NOT NULL,
            detalle TEXT,
            es_mellizo BOOLEAN DEFAULT 0,
            es_defectuoso BOOLEAN DEFAULT 0,
            es_repetido BOOLEAN DEFAULT 0,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (ruta_id) REFERENCES rutas (id)
          )`,
          [],
          () => {
            console.log('✅ Tabla productos creada/existe');
            resolve();
          },
          (_, error) => {
            console.error('❌ Error creando tabla productos:', error);
            reject(error);
          }
        );
        
        // Crear índices para optimizar queries de duplicados y búsquedas
        tx.executeSql(
          `CREATE INDEX IF NOT EXISTS idx_productos_codigo ON productos(codigo)`,
          [],
          () => console.log('✅ Índice idx_productos_codigo creado'),
          (_, error) => {
            console.error('❌ Error creando índice codigo:', error);
            return false;
          }
        );
        
        tx.executeSql(
          `CREATE INDEX IF NOT EXISTS idx_productos_ruta_id ON productos(ruta_id)`,
          [],
          () => console.log('✅ Índice idx_productos_ruta_id creado'),
          (_, error) => {
            console.error('❌ Error creando índice ruta_id:', error);
            return false;
          }
        );
        
        tx.executeSql(
          `CREATE INDEX IF NOT EXISTS idx_productos_codigo_ruta ON productos(codigo, ruta_id)`,
          [],
          () => console.log('✅ Índice compuesto idx_productos_codigo_ruta creado'),
          (_, error) => {
            console.error('❌ Error creando índice compuesto:', error);
            return false;
          }
        );
      });
    });
  }

  async crearOActualizarUsuario(userData) {
    try {

      return new Promise((resolve, reject) => {
        this.db.transaction(tx => {
          tx.executeSql(
            `SELECT * FROM users WHERE estacion = ? AND nombre = ? AND apellido = ?`,
            [userData.estacion, userData.nombre, userData.apellido],
            (_, { rows }) => {
              if (rows._array.length > 0) {
                const existing = rows._array[0];
                tx.executeSql(
                  `UPDATE users SET email = ? WHERE id = ?`,
                  [userData.email || existing.email, existing.id],
                  () => resolve({ ...existing, email: userData.email || existing.email }),
                  (_, error) => reject(error)
                );
              } else {
                tx.executeSql(
                  `INSERT INTO users (nombre, apellido, estacion, email) VALUES (?, ?, ?, ?)`,
                  [userData.nombre, userData.apellido || '', userData.estacion, userData.email || ''],
                  (_, result) => {
                    tx.executeSql(
                      'SELECT * FROM users WHERE id = ?',
                      [result.insertId],
                      (_, { rows }) => resolve(rows._array[0]),
                      (_, error) => reject(error)
                    );
                  },
                  (_, error) => reject(error)
                );
              }
            },
            (_, error) => reject(error)
          );
        });
      });
    } catch (error) {

      throw error;
    }
  }

  async obtenerUsuarioActual() {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM users ORDER BY id DESC LIMIT 1',
          [],
          (_, { rows }) => resolve(rows._array[0] || null),
          (_, error) => reject(error)
        );
      });
    });
  }

  async crearRuta(rutaData) {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'INSERT INTO rutas (numero, usuario_id) VALUES (?, ?)',
          [rutaData.numero, rutaData.usuario_id],
          (_, result) => {
            tx.executeSql(
              'SELECT * FROM rutas WHERE id = ?',
              [result.insertId],
              (_, { rows }) => resolve(rows._array[0]),
              (_, error) => reject(error)
            );
          },
          (_, error) => reject(error)
        );
      });
    });
  }

  async bulkInsertProductos(productos) {
    if (!productos || productos.length === 0) return;
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        try {
          productos.forEach(p => {
            tx.executeSql(
              `INSERT INTO productos (codigo, ruta_id, detalle, es_mellizo, es_defectuoso, es_repetido, timestamp)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                p.codigo,
                p.ruta_id,
                p.detalle || null,
                p.es_mellizo ? 1 : 0,
                p.es_defectuoso ? 1 : 0,
                p.es_repetido ? 1 : 0,
                p.timestamp || new Date().toISOString()
              ]
            );
          });
          resolve();
        } catch (error) {
          reject(error);
        }
      }, (error) => {
        reject(error);
      }, () => {
        resolve();
      });
    });
  }

  async finalizarRuta(rutaId) {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'UPDATE rutas SET finalizada = 1 WHERE id = ?',
          [rutaId],
          (_, result) => resolve(result),
          (_, error) => reject(error)
        );
      });
    });
  }

  async obtenerProductosRuta(rutaId) {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM productos WHERE ruta_id = ? ORDER BY timestamp DESC',
          [rutaId],
          (_, { rows }) => resolve(rows._array),
          (_, error) => reject(error)
        );
      });
    });
  }

  async obtenerRutasUsuario(usuarioId) {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM rutas WHERE usuario_id = ? ORDER BY fecha DESC',
          [usuarioId],
          (_, { rows }) => resolve(rows._array),
          (_, error) => reject(error)
        );
      });
    });
  }

  async eliminarRuta(rutaId) {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql('DELETE FROM productos WHERE ruta_id = ?', [rutaId], () => {
          tx.executeSql('DELETE FROM rutas WHERE id = ?', [rutaId], (_, result) => {
            resolve(result);
          }, (_, error) => reject(error));
        }, (_, error) => reject(error));
      });
    });
  }

  async actualizarProducto(productoId, updates) {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const values = [...Object.values(updates), productoId];
        tx.executeSql(
          `UPDATE productos SET ${fields} WHERE id = ?`,
          values,
          (_, result) => resolve(result),
          (_, error) => reject(error)
        );
      });
    });
  }

  async eliminarProducto(productoId) {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'DELETE FROM productos WHERE id = ?',
          [productoId],
          (_, result) => resolve(result),
          (_, error) => reject(error)
        );
      });
    });
  }

  async obtenerProductoPorCodigo(codigo, rutaId) {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM productos WHERE codigo = ? AND ruta_id = ? LIMIT 1',
          [codigo, rutaId],
          (_, { rows }) => resolve(rows._array[0] || null),
          (_, error) => reject(error)
        );
      });
    });
  }

  async agregarProducto(productoData) {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          `INSERT INTO productos (codigo, ruta_id, detalle, es_mellizo, es_defectuoso, es_repetido, timestamp)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            productoData.codigo,
            productoData.ruta_id,
            productoData.detalle || null,
            productoData.es_mellizo ? 1 : 0,
            productoData.es_defectuoso ? 1 : 0,
            productoData.es_repetido ? 1 : 0,
            productoData.timestamp || new Date().toISOString()
          ],
          (_, result) => {
            tx.executeSql(
              'SELECT * FROM productos WHERE id = ?',
              [result.insertId],
              (_, { rows }) => resolve(rows._array[0]),
              (_, error) => reject(error)
            );
          },
          (_, error) => reject(error)
        );
      });
    });
  }

  async obtenerProductosDuplicados(rutaId) {
    return new Promise((resolve, reject) => {
      this.db.transaction(tx => {
        tx.executeSql(
          `SELECT codigo, COUNT(*) as veces,
          GROUP_CONCAT(id) as ids,
          GROUP_CONCAT(timestamp) as timestamps
          FROM productos
          WHERE ruta_id = ?
          GROUP BY codigo
          HAVING COUNT(*) > 1`,
          [rutaId],
          (_, { rows }) => {
            const duplicados = rows._array.map(dup => ({
              codigo: dup.codigo,
              veces: dup.veces,
              productos: dup.ids.split(',').map((id, index) => ({
                id: parseInt(id),
                timestamp: dup.timestamps.split(',')[index]
              }))
            }));
            resolve(duplicados);
          },
          (_, error) => reject(error)
        );
      });
    });
  }

  // ✅ IMPLEMENTADA: Función para comparar con archivo CSV/Excel
  async compararConArchivo(archivoData) {
    try {

      // Leer el archivo
      const contenido = await FileSystem.readAsStringAsync(archivoData.uri);
      const lineas = contenido.split('\n').filter(linea => linea.trim() !== '');
      
      if (lineas.length < 2) {
        return {
          coincidencias: 0,
          diferencias: 0,
          detalles: 'El archivo está vacío o no tiene datos válidos'
        };
      }
      
      // Parsear headers
      const headers = lineas[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
      const indiceUnitId = headers.findIndex(h => h.includes('unit') || h.includes('codigo'));
      const indiceFecha = headers.findIndex(h => h.includes('fecha') || h.includes('date'));
      
      if (indiceUnitId === -1) {
        return {
          coincidencias: 0,
          diferencias: 0,
          detalles: 'No se encontró columna de códigos (unit_id/codigo) en el archivo'
        };
      }
      
      // Extraer códigos del archivo
      const codigosArchivo = new Set();
      for (let i = 1; i < lineas.length; i++) {
        const valores = lineas[i].split(',').map(v => v.trim().replace(/"/g, ''));
        if (valores[indiceUnitId]) {
          codigosArchivo.add(valores[indiceUnitId].replace(/[^0-9]/g, ''));
        }
      }
      
      // Obtener productos escaneados de la última ruta
      const usuario = await this.obtenerUsuarioActual();
      if (!usuario) {
        return {
          coincidencias: 0,
          diferencias: 0,
          detalles: 'No hay usuario registrado'
        };
      }
      
      const rutas = await this.obtenerRutasUsuario(usuario.id);
      if (!rutas || rutas.length === 0) {
        return {
          coincidencias: 0,
          diferencias: 0,
          detalles: 'No hay rutas escaneadas'
        };
      }
      
      const ultimaRuta = rutas[0];
      const productosEscaneados = await this.obtenerProductosRuta(ultimaRuta.id);
      const codigosEscaneados = new Set(productosEscaneados.map(p => p.codigo.replace(/[^0-9]/g, '')));
      
      // Calcular coincidencias y diferencias
      let coincidencias = 0;
      let faltantesEnEscaneo = 0;
      let noCoinciden = 0;
      
      codigosArchivo.forEach(codigo => {
        if (codigosEscaneados.has(codigo)) {
          coincidencias++;
        } else {
          faltantesEnEscaneo++;
        }
      });
      
      codigosEscaneados.forEach(codigo => {
        if (!codigosArchivo.has(codigo)) {
          noCoinciden++;
        }
      });
      
      return {
        coincidencias,
        diferencias: faltantesEnEscaneo + noCoinciden,
        detalles: `✅ Coincidencias: ${coincidencias} | ⚠️ Faltantes en escaneo: ${faltantesEnEscaneo} | 📦 No coinciden: ${noCoinciden}`,
        rutaComparada: ultimaRuta.numero,
        totalArchivo: codigosArchivo.size,
        totalEscaneado: codigosEscaneados.size
      };
    } catch (error) {

      return {
        coincidencias: 0,
        diferencias: 0,
        detalles: 'Error al procesar el archivo: ' + error.message
      };
    }
  }
}

const databaseService = new DatabaseService();
export default databaseService;