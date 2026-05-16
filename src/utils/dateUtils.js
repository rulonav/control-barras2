// src/utils/dateUtils.js
// Utilidades para manejo de fechas y verificación de expiración
// Fecha límite para la autodestrucción del sistema
const FECHA_LIMITE = new Date('2026-09-01'); // 1 de septiembre de 2026

/**
* Verifica si la fecha actual ha superado la fecha límite de autodestrucción.
* @returns {boolean} True si la fecha actual es mayor o igual a la fecha límite, false en caso contrario.
*/
export const verificarFechaExpiracion = () => {
const fechaActual = new Date();
// Asegurarse de que solo se compare la parte de la fecha (día, mes, año)
const fechaActualSinHora = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), fechaActual.getDate());
const fechaLimiteSinHora = new Date(FECHA_LIMITE.getFullYear(), FECHA_LIMITE.getMonth(), FECHA_LIMITE.getDate());
return fechaActualSinHora >= fechaLimiteSinHora;
};

/**
* Obtiene la fecha límite en formato legible.
* @returns {string} Fecha límite formateada como DD/MM/AAAA.
*/
export const getFechaLimiteLegible = () => {
return FECHA_LIMITE.toLocaleDateString('es-ES', {
day: '2-digit',
month: '2-digit',
year: 'numeric'
});
};

// Opcional: Exportar la fecha límite para otros usos
export { FECHA_LIMITE };