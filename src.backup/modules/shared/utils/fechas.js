// Constantes de formato de fecha
const DIAS_SEMANA = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MESES_CORTOS = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];

export const formatearFechaSinAnio = (fechaStr) => {
  if (!fechaStr) return '';
  const partes = fechaStr.split('-');
  if (partes.length !== 3) return '';
  const [anio, mes, dia] = partes;
  const fecha = new Date(anio, parseInt(mes)-1, dia);
  if (isNaN(fecha.getTime())) return '';
  return DIAS_SEMANA[fecha.getDay()] + ' ' + parseInt(dia) + ' de ' + MESES[parseInt(mes)-1];
};

export const formatearRangoCorto = (f1, f2) => {
  if (!f1 || !f2) return '';
  const [a1, m1, d1] = f1.split('-');
  const [a2, m2, d2] = f2.split('-');
  const fecha1 = new Date(a1, parseInt(m1)-1, d1);
  const fecha2 = new Date(a2, parseInt(m2)-1, d2);
  const dia1 = DIAS_SEMANA[fecha1.getDay()].substring(0, 3) + ' ' + parseInt(d1);
  const dia2 = DIAS_SEMANA[fecha2.getDay()].substring(0, 3) + ' ' + parseInt(d2);
  return dia1 + ' - ' + dia2;
};

export const obtenerMesCortoYAnio = (fechaStr) => {
  if (!fechaStr) return { mes: '', anio: '' };
  const partes = fechaStr.split('-');
  if (partes.length !== 3) return { mes: '', anio: '' };
  return { mes: MESES_CORTOS[parseInt(partes[1])-1] || '', anio: partes[0] || '' };
};
