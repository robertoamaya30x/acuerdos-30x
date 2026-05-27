const unidades = [
  '', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
  'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete',
  'dieciocho', 'diecinueve', 'veinte',
];

const decenas = [
  '', '', 'veinti', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa',
];

const centenas = [
  '', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos',
  'seiscientos', 'setecientos', 'ochocientos', 'novecientos',
];

function menosDeVeintiuno(n: number): string {
  return unidades[n];
}

function menosDeCien(n: number): string {
  if (n <= 20) return menosDeVeintiuno(n);
  const dec = Math.floor(n / 10);
  const uni = n % 10;
  if (dec === 2) {
    // veintiuno through veintinueve
    if (uni === 0) return 'veinte';
    if (uni === 1) return 'veintiún';
    return 'veinti' + unidades[uni];
  }
  if (uni === 0) return decenas[dec];
  if (uni === 1) return decenas[dec] + ' y un';
  return decenas[dec] + ' y ' + unidades[uni];
}

function menosDeMil(n: number): string {
  if (n === 100) return 'cien';
  if (n < 100) return menosDeCien(n);
  const cen = Math.floor(n / 100);
  const resto = n % 100;
  if (resto === 0) return centenas[cen];
  return centenas[cen] + ' ' + menosDeCien(resto);
}

export function numeroALetras(n: number): string {
  const sufijo = ' dólares de los Estados Unidos de América';

  if (n === 0) return 'cero' + sufijo;

  if (n < 1000) {
    return menosDeMil(n) + sufijo;
  }

  if (n < 1000000) {
    const miles = Math.floor(n / 1000);
    const resto = n % 1000;

    let parteMiles: string;
    if (miles === 1) {
      parteMiles = 'mil';
    } else {
      parteMiles = menosDeMil(miles) + ' mil';
    }

    if (resto === 0) {
      return parteMiles + sufijo;
    }
    return parteMiles + ' ' + menosDeMil(resto) + sufijo;
  }

  // Fallback for numbers >= 1,000,000 (outside spec range but handle gracefully)
  return n.toString() + sufijo;
}
