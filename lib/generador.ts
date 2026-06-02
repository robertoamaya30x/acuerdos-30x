import plantilla from '../templates/acuerdo_pago.txt';
import camposConfig from '../config/campos.json';
import { numeroALetras } from './numeroALetras';

export interface Cuota {
  numero: number;
  importe: number;
  fechaLimite: string;
  estado: 'Pendiente' | 'Pagada';
}

export interface DatosFormulario {
  NOMBRE_PARTICIPANTE: string;
  TIPO_DOCUMENTO: string;
  NUMERO_DOCUMENTO: string;
  CIUDAD_PAIS: string;
  DIRECCION: string;
  FECHA_ACUERDO: string;
  MONTO_TOTAL: number;
  NUMERO_CUOTAS: number;
  cuotas: Cuota[];
}

export function formatearFecha(fechaISO: string): string {
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  const [year, month, day] = fechaISO.split('-').map(Number);
  return `${day} de ${meses[month - 1]} de ${year}`;
}

export function generarVariables(datos: DatosFormulario): Record<string, string> {
  return {
    NOMBRE_PARTICIPANTE: datos.NOMBRE_PARTICIPANTE,
    TIPO_DOCUMENTO: datos.TIPO_DOCUMENTO,
    NUMERO_DOCUMENTO: datos.NUMERO_DOCUMENTO,
    CIUDAD_PAIS: datos.CIUDAD_PAIS,
    DIRECCION: datos.DIRECCION || 'No especificada',
    FECHA_ACUERDO: formatearFecha(datos.FECHA_ACUERDO),
    MONTO_TOTAL: datos.MONTO_TOTAL.toLocaleString('en-US'),
    MONTO_LETRAS: numeroALetras(datos.MONTO_TOTAL),
    NUMERO_CUOTAS: datos.NUMERO_CUOTAS.toString(),
    TABLA_CUOTAS: '[[TABLA_CUOTAS]]',
    NOMBRE_PROGRAMA: camposConfig.nombre_programa,
  };
}

export function reemplazarVariables(texto: string, variables: Record<string, string>): string {
  let resultado = texto;
  for (const [key, value] of Object.entries(variables)) {
    resultado = resultado.replaceAll(`{{${key}}}`, value);
  }
  return resultado;
}

export { plantilla };
