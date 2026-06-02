'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  DatosFormulario,
  generarVariables,
  reemplazarVariables,
  plantilla,
  formatearFecha,
} from '../lib/generador';
import camposConfig from '../config/campos.json';

interface CuotaInput {
  importe: string;
  fechaLimite: string;
  estado: 'Pendiente' | 'Pagada';
}

function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

async function svgToBase64(svgPath: string, w: number, h: number): Promise<string> {
  const response = await fetch(svgPath);
  const svgText = await response.text();
  const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const img = document.createElement('img') as HTMLImageElement;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = reject;
    img.src = url;
  });
}

function textToPdfContent(text: string): any[] {
  const paragraphs = text.split(/\n\n+/);
  const content: any[] = [];

  const headingStarters = [
    'PRIMERA', 'SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA',
    'SEXTA', 'SÉPTIMA', 'ACUERDO DE PAGO',
  ];

  for (const para of paragraphs) {
    if (!para.trim()) continue;
    const trimmed = para.trim();
    const isHeading = headingStarters.some((s) => trimmed.startsWith(s));
    const isBullet = trimmed.startsWith('•');

    if (isHeading) {
      content.push({ text: trimmed, bold: true, fontSize: 11, margin: [0, 8, 0, 4] });
    } else if (isBullet) {
      content.push({ text: trimmed, fontSize: 10, margin: [0, 0, 0, 3] });
    } else {
      // Uniform body spacing — no top margin to avoid doubling
      content.push({ text: trimmed, fontSize: 10, margin: [0, 0, 0, 5] });
    }
  }

  return content;
}

const inputClass =
  'w-full border border-[rgba(0,0,0,0.12)] rounded-lg px-3.5 py-2.5 text-sm font-medium text-[#1A1A1A] bg-white placeholder-[#A3A3A3] focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] focus:border-transparent transition duration-100 ease-linear';

const labelClass = 'block text-xs font-semibold text-[#1A1A1A] mb-1.5 tracking-[-0.01em]';

export default function HomePage() {
  const [nombre, setNombre] = useState('');
  const [tipoDoc, setTipoDoc] = useState('');
  const [numDoc, setNumDoc] = useState('');
  const [ciudadPais, setCiudadPais] = useState('');
  const [direccion, setDireccion] = useState('');
  const [fechaAcuerdo, setFechaAcuerdo] = useState(getTodayISO());
  const [montoTotal, setMontoTotal] = useState('');
  const [numeroCuotasInput, setNumeroCuotasInput] = useState('1');
  const [cuotasError, setCuotasError] = useState('');
  const [cuotas, setCuotas] = useState<CuotaInput[]>([{ importe: '', fechaLimite: '', estado: 'Pendiente' }]);

  const numeroCuotas = parseInt(numeroCuotasInput);
  const numeroCuotasValido = /^\d+$/.test(numeroCuotasInput) && numeroCuotas >= 1 && numeroCuotas <= 6;

  const handleNumeroCuotasChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw !== '' && !/^\d+$/.test(raw)) return; // bloquea puntos, comas, letras
    setNumeroCuotasInput(raw);
    if (raw === '') {
      setCuotasError('');
      return;
    }
    const val = parseInt(raw);
    if (val > 6) {
      setCuotasError('El número de cuotas máximo es 6');
    } else if (val < 1) {
      setCuotasError('El número mínimo es 1 cuota');
    } else {
      setCuotasError('');
    }
  };

  useEffect(() => {
    if (!numeroCuotasValido) return;
    setCuotas((prev) => {
      const next: CuotaInput[] = [];
      for (let i = 0; i < numeroCuotas; i++) {
        next.push(prev[i] ?? { importe: '', fechaLimite: '', estado: 'Pendiente' });
      }
      return next;
    });
  }, [numeroCuotas, numeroCuotasValido]);

  const sumaCuotas = cuotas.reduce((acc, c) => {
    const val = parseFloat(c.importe);
    return acc + (isNaN(val) ? 0 : val);
  }, 0);

  const montoTotalNum = parseFloat(montoTotal);
  const montosCoinciden =
    !isNaN(montoTotalNum) &&
    montoTotal !== '' &&
    cuotas.length > 0 &&
    cuotas.every((c) => c.importe !== '') &&
    Math.abs(sumaCuotas - montoTotalNum) < 0.01;

  const camposVacios =
    !nombre.trim() || !tipoDoc.trim() || !numDoc.trim() ||
    !ciudadPais.trim() || !fechaAcuerdo.trim() || !montoTotal.trim();

  const cuotasIncompletas = cuotas.some(
    (c) => c.importe.trim() === '' || c.fechaLimite.trim() === ''
  );

  const isDisabled = camposVacios || cuotasIncompletas || !montosCoinciden || !numeroCuotasValido || !!cuotasError;

  const updateCuota = (index: number, field: keyof CuotaInput, value: string) => {
    setCuotas((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value } as CuotaInput;
      return updated;
    });
  };

  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfError, setPdfError] = useState('');

  const handleGenerarPDF = async () => {
    setIsGenerating(true);
    setPdfError('');
    try {
      const [pdfMakeModule, pdfFontsModule] = await Promise.all([
        import('pdfmake/build/pdfmake'),
        import('pdfmake/build/vfs_fonts'),
      ]);

      const pdfMake = (pdfMakeModule as any).default ?? pdfMakeModule;
      // vfs_fonts exports the vfs object directly (module.exports = vfs)
      const vfs = (pdfFontsModule as any).default ?? pdfFontsModule;
      pdfMake.vfs = vfs;

      let logoBase64: string | null = null;
      try {
        logoBase64 = await svgToBase64('/30x-logo-dark.svg', 240, 80);
      } catch {
        // logo no crítico — continúa sin él
      }

    const datos: DatosFormulario = {
      NOMBRE_PARTICIPANTE: nombre,
      TIPO_DOCUMENTO: tipoDoc,
      NUMERO_DOCUMENTO: numDoc,
      CIUDAD_PAIS: ciudadPais,
      DIRECCION: direccion,
      FECHA_ACUERDO: fechaAcuerdo,
      MONTO_TOTAL: montoTotalNum,
      NUMERO_CUOTAS: numeroCuotas,
      cuotas: cuotas.map((c, i) => ({
        numero: i + 1,
        importe: parseFloat(c.importe),
        fechaLimite: c.fechaLimite,
        estado: c.estado,
      })),
    };

    const variables = generarVariables(datos);
    const textoConVariables = reemplazarVariables(plantilla, variables);
    const partes = textoConVariables.split('[[TABLA_CUOTAS]]');
    const beforeTable = partes[0] ?? '';
    const afterTable = partes[1] ?? '';

    // --- Tablas de cuotas y datos bancarios ---
    const tablaCuotas: any = {
      table: {
        headerRows: 1,
        widths: ['auto', '*', '*', 'auto'],
        body: [
          [
            { text: 'Nº de cuota', bold: true, fillColor: '#F5F5F5', fontSize: 9 },
            { text: 'Importe (USD)', bold: true, fillColor: '#F5F5F5', fontSize: 9 },
            { text: 'Fecha límite', bold: true, fillColor: '#F5F5F5', fontSize: 9 },
            { text: 'Estado', bold: true, fillColor: '#F5F5F5', fontSize: 9 },
          ],
          ...datos.cuotas.map((c, i) => [
            { text: `Cuota ${i + 1}`, fontSize: 9 },
            { text: `USD ${c.importe.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, fontSize: 9 },
            { text: formatearFecha(c.fechaLimite), fontSize: 9 },
            {
              text: c.estado === 'Pagada' ? '✓ Pagada' : '• Pendiente',
              fontSize: 9,
              color: c.estado === 'Pagada' ? '#16A34A' : '#525252',
              bold: c.estado === 'Pagada',
            },
          ]),
        ],
      },
      layout: 'lightHorizontalLines',
      margin: [0, 8, 0, 8],
    };

    const tablaBancaria: any = {
      table: {
        widths: ['auto', '*'],
        body: [
          [{ text: 'Beneficiario', fontSize: 9, bold: true }, { text: '30X LLC', fontSize: 9 }],
          [{ text: 'Banco', fontSize: 9, bold: true }, { text: 'Choice Financial Group (Mercury)', fontSize: 9 }],
          [{ text: 'Tipo de cuenta', fontSize: 9, bold: true }, { text: 'Checking', fontSize: 9 }],
          [{ text: 'Número de cuenta', fontSize: 9, bold: true }, { text: '202508734194', fontSize: 9 }],
          [{ text: 'ABA', fontSize: 9, bold: true }, { text: '091311229', fontSize: 9 }],
          [{ text: 'SWIFT/BIC', fontSize: 9, bold: true }, { text: 'CHFGUS44021', fontSize: 9 }],
          [{ text: 'Dirección banco', fontSize: 9, bold: true }, { text: '4501 23rd Avenue S, Fargo, ND 58104, EE. UU.', fontSize: 9 }],
          [{ text: 'Dirección beneficiario', fontSize: 9, bold: true }, { text: '30 North Gould Street, STE R, Sheridan, WY 82801, EE. UU.', fontSize: 9 }],
        ],
      },
      layout: 'lightHorizontalLines',
      margin: [0, 8, 0, 8],
    };

    // --- Limpiar afterTable: quitar líneas bancarias y separar sección FIRMAS ---
    const bankLines = new Set([
      'Beneficiario: 30X LLC',
      'Banco: Choice Financial Group (Mercury)',
      'Tipo de cuenta: Checking',
      'Número de cuenta: 202508734194',
      'ABA: 091311229',
      'SWIFT/BIC: CHFGUS44021',
      'Dirección banco: 4501 23rd Avenue S, Fargo, ND 58104, EE. UU.',
      'Dirección beneficiario: 30 North Gould Street, STE R, Sheridan, WY 82801, EE. UU.',
    ]);

    const afterLines = afterTable.split('\n').filter((l) => !bankLines.has(l.trim()));
    const firmasIdx = afterLines.findIndex((l) => l.trim() === 'FIRMAS');
    const textBeforeFirmas = firmasIdx >= 0
      ? afterLines.slice(0, firmasIdx).join('\n')
      : afterLines.join('\n');

    // --- Bloque de firmas en dos columnas ---
    const firmasBlock: any = {
      margin: [0, 24, 0, 0],
      stack: [
        { text: 'FIRMAS', bold: true, fontSize: 11, margin: [0, 0, 0, 0] },
        {
          margin: [0, 0, 0, 0],
          columns: [
            {
              width: '*',
              stack: [
                // 60pt de espacio para firmar
                { text: ' ', fontSize: 10, margin: [0, 60, 0, 0] },
                { text: '____________________________', fontSize: 10, margin: [0, 0, 0, 6] },
                { text: 'Por 30X LLC', fontSize: 9, bold: true, margin: [0, 0, 0, 2] },
                { text: 'Nombre: Dylan Rosemberg', fontSize: 9, margin: [0, 0, 0, 1] },
                { text: 'Pasaporte: AAI462007', fontSize: 9, margin: [0, 0, 0, 1] },
                { text: 'Cargo: Representante Legal 30X LLC', fontSize: 9 },
              ],
            },
            {
              width: '*',
              stack: [
                { text: ' ', fontSize: 10, margin: [0, 60, 0, 0] },
                { text: '____________________________', fontSize: 10, alignment: 'right', margin: [0, 0, 0, 6] },
                { text: 'PARTICIPANTE / DEUDOR', fontSize: 9, bold: true, alignment: 'right', margin: [0, 0, 0, 2] },
                { text: `Nombre completo: ${nombre}`, fontSize: 9, alignment: 'right', margin: [0, 0, 0, 1] },
                { text: `Documento: ${tipoDoc} ${numDoc}`, fontSize: 9, alignment: 'right' },
              ],
            },
          ],
        },
      ],
    };

    // --- Construir contenido final ---
    // Filtrar también la frase introductoria bancaria del texto (ya se renderiza antes de tablaBancaria)
    const frasesBancarias = new Set([
      'Los pagos deberán realizarse, principalmente, mediante transferencia bancaria a nombre de:',
    ]);
    const textBeforeFirmasFinal = textBeforeFirmas
      .split(/\n\n+/)
      .filter((p) => !frasesBancarias.has(p.trim()))
      .join('\n\n');

    const content: any[] = [
      ...textToPdfContent(beforeTable),
      tablaCuotas,
      { text: 'Los pagos deberán realizarse, principalmente, mediante transferencia bancaria a nombre de:', fontSize: 10, margin: [0, 4, 0, 4] },
      tablaBancaria,
      ...textToPdfContent(textBeforeFirmasFinal),
      firmasBlock,
    ];

    const docDefinition: any = {
      pageSize: 'LETTER',
      pageMargins: [72, 72, 72, 72],
      ...(logoBase64 ? {
        header: (_currentPage: number, _pageCount: number) => ({
          image: logoBase64,
          width: 60,
          margin: [0, 20, 72, 0],
          alignment: 'right',
        }),
      } : {}),
      content,
      defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.4 },
    };

    const filename = `acuerdo_pago_${nombre.replace(/\s+/g, '_')}_${fechaAcuerdo.replace(/-/g, '')}.pdf`;
    pdfMake.createPdf(docDefinition).download(filename);
    } catch (err) {
      console.error('Error generando PDF:', err);
      setPdfError('No se pudo generar el PDF. Intenta de nuevo.');
    } finally {
      setIsGenerating(false);
    }
  };

  const tipoDocCampo = camposConfig.campos_participante.find((c) => c.id === 'TIPO_DOCUMENTO');
  const tipoDocOpciones: string[] = (tipoDocCampo && 'opciones' in tipoDocCampo ? tipoDocCampo.opciones : []) ?? [];
  const montoDefinido = montoTotal !== '' && !isNaN(parseFloat(montoTotal));
  const cuotasDefinidas = cuotas.every((c) => c.importe !== '');

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#FAFAFA' }}>

      {/* Header */}
      <header
        className="sticky top-0 z-10"
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '0px 1px 2px rgba(0,0,0,0.03)',
        }}
      >
        <div className="max-w-2xl mx-auto px-6 h-14 flex items-center gap-5">
          <Image
            src="/30x-logo-dark.svg"
            alt="30X"
            width={48}
            height={24}
            style={{ objectFit: 'contain' }}
          />
          <div
            style={{
              width: '1px',
              height: '20px',
              backgroundColor: 'rgba(0,0,0,0.12)',
            }}
          />
          <div>
            <p
              className="text-sm font-semibold leading-tight"
              style={{ color: '#1A1A1A', letterSpacing: '-0.01em' }}
            >
              Generador de Acuerdos de Pago
            </p>
            <p className="text-xs font-medium" style={{ color: '#737373' }}>
              30X Inmersivo · 30X LLC
            </p>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-2xl mx-auto px-6 py-10">
        <div
          className="rounded-xl p-8"
          style={{
            backgroundColor: '#FFFFFF',
            boxShadow: '0px 1px 2px rgba(0,0,0,0.01), 0px 2px 6px rgba(0,0,0,0.02), 0px 4px 16px rgba(0,0,0,0.04)',
            border: '1px solid rgba(0,0,0,0.06)',
          }}
        >

          {/* Section 1 */}
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-5">
              <span
                className="flex items-center justify-center w-5 h-5 rounded-full text-white text-xs font-bold"
                style={{ backgroundColor: '#1A1A1A', fontSize: '10px' }}
              >
                1
              </span>
              <h2
                className="text-xs font-semibold uppercase"
                style={{ color: '#1A1A1A', letterSpacing: '0.06em' }}
              >
                Datos del participante
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className={labelClass}>
                  Nombre completo <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Ej: Jhony Antonio Rodríguez Silva"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    Tipo de documento <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <select
                    value={tipoDoc}
                    onChange={(e) => setTipoDoc(e.target.value)}
                    className={inputClass}
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="">Seleccionar...</option>
                    {tipoDocOpciones.map((op) => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>
                    Número de documento <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={numDoc}
                    onChange={(e) => setNumDoc(e.target.value)}
                    placeholder="Ej: 18.790.150"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    Ciudad y país <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={ciudadPais}
                    onChange={(e) => setCiudadPais(e.target.value)}
                    placeholder="Ej: Bogotá, Colombia"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Dirección <span style={{ color: '#A3A3A3', fontWeight: 500 }}>(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                    placeholder="Ej: Calle 123 #45-67"
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  Fecha del acuerdo <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="date"
                  value={fechaAcuerdo}
                  onChange={(e) => setFechaAcuerdo(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          {/* Divider */}
          <div style={{ height: '1px', backgroundColor: 'rgba(0,0,0,0.06)', marginBottom: '2rem' }} />

          {/* Section 2 */}
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-5">
              <span
                className="flex items-center justify-center w-5 h-5 rounded-full text-white text-xs font-bold"
                style={{ backgroundColor: '#1A1A1A', fontSize: '10px' }}
              >
                2
              </span>
              <h2
                className="text-xs font-semibold uppercase"
                style={{ color: '#1A1A1A', letterSpacing: '0.06em' }}
              >
                Estructura de pago
              </h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    Monto total (USD) <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    value={montoTotal}
                    onChange={(e) => setMontoTotal(e.target.value)}
                    placeholder="Ej: 4000"
                    min={0}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>
                    Número de cuotas <span style={{ color: '#EF4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={numeroCuotasInput}
                    onChange={handleNumeroCuotasChange}
                    placeholder="1–6"
                    className={inputClass}
                    style={cuotasError ? { borderColor: '#EF4444', boxShadow: '0 0 0 2px rgba(239,68,68,0.15)' } : {}}
                  />
                  {cuotasError && (
                    <p className="mt-1.5 text-xs font-medium" style={{ color: '#EF4444' }}>
                      {cuotasError}
                    </p>
                  )}
                </div>
              </div>

              {/* Cuotas table */}
              {numeroCuotas > 0 && (
                <div>
                  <label className={labelClass} style={{ marginBottom: '8px' }}>
                    Detalle de cuotas
                  </label>
                  <div
                    className="rounded-lg overflow-hidden"
                    style={{ border: '1px solid rgba(0,0,0,0.08)' }}
                  >
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ backgroundColor: '#FAFAFA', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                          <th
                            className="text-left px-4 py-2.5 w-16"
                            style={{ fontSize: '11px', fontWeight: 600, color: '#737373', letterSpacing: '0.02em' }}
                          >
                            Cuota
                          </th>
                          <th
                            className="text-left px-4 py-2.5"
                            style={{ fontSize: '11px', fontWeight: 600, color: '#737373', letterSpacing: '0.02em' }}
                          >
                            Importe (USD) <span style={{ color: '#EF4444' }}>*</span>
                          </th>
                          <th
                            className="text-left px-4 py-2.5"
                            style={{ fontSize: '11px', fontWeight: 600, color: '#737373', letterSpacing: '0.02em' }}
                          >
                            Fecha límite <span style={{ color: '#EF4444' }}>*</span>
                          </th>
                          <th
                            className="text-left px-4 py-2.5"
                            style={{ fontSize: '11px', fontWeight: 600, color: '#737373', letterSpacing: '0.02em' }}
                          >
                            Estado
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {cuotas.map((cuota, i) => (
                          <tr
                            key={i}
                            style={{
                              borderBottom: i < cuotas.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                            }}
                          >
                            <td className="px-4 py-2.5">
                              <span
                                className="text-xs font-semibold"
                                style={{ color: '#525252', letterSpacing: '-0.01em' }}
                              >
                                #{i + 1}
                              </span>
                            </td>
                            <td className="px-4 py-2.5">
                              <input
                                type="number"
                                value={cuota.importe}
                                onChange={(e) => updateCuota(i, 'importe', e.target.value)}
                                placeholder="0.00"
                                min={0}
                                step="0.01"
                                className="w-full border border-[rgba(0,0,0,0.12)] rounded-md px-2.5 py-1.5 text-sm font-medium text-[#1A1A1A] bg-white placeholder-[#A3A3A3] focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] transition duration-100"
                              />
                            </td>
                            <td className="px-4 py-2.5">
                              <input
                                type="date"
                                value={cuota.fechaLimite}
                                onChange={(e) => updateCuota(i, 'fechaLimite', e.target.value)}
                                className="w-full border border-[rgba(0,0,0,0.12)] rounded-md px-2.5 py-1.5 text-sm font-medium text-[#1A1A1A] bg-white focus:outline-none focus:ring-2 focus:ring-[#1A1A1A] transition duration-100"
                              />
                            </td>
                            <td className="px-4 py-2.5">
                              <button
                                type="button"
                                onClick={() => updateCuota(i, 'estado', cuota.estado === 'Pendiente' ? 'Pagada' : 'Pendiente')}
                                className="text-xs font-semibold px-2.5 py-1 rounded-full transition duration-100"
                                style={cuota.estado === 'Pagada'
                                  ? { backgroundColor: '#DCFCE7', color: '#16A34A', border: '1px solid #BBF7D0' }
                                  : { backgroundColor: '#F5F5F5', color: '#737373', border: '1px solid rgba(0,0,0,0.08)' }
                                }
                              >
                                {cuota.estado === 'Pagada' ? '✓ Pagada' : '• Pendiente'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Validator */}
                  {montoDefinido && cuotasDefinidas && (
                    <div className="mt-2.5 flex items-center gap-2">
                      {montosCoinciden ? (
                        <>
                          <span
                            className="inline-flex items-center justify-center w-4 h-4 rounded-full text-white text-xs font-bold"
                            style={{ backgroundColor: '#22C55E', fontSize: '9px' }}
                          >
                            ✓
                          </span>
                          <p className="text-xs font-medium" style={{ color: '#22C55E' }}>
                            Los montos coinciden
                          </p>
                        </>
                      ) : (
                        <>
                          <span
                            className="inline-flex items-center justify-center w-4 h-4 rounded-full text-white text-xs font-bold"
                            style={{ backgroundColor: '#EF4444', fontSize: '10px' }}
                          >
                            !
                          </span>
                          <p className="text-xs font-medium" style={{ color: '#EF4444' }}>
                            La suma de cuotas (USD {sumaCuotas.toLocaleString('en-US', { minimumFractionDigits: 2 })}) no coincide con el total (USD {parseFloat(montoTotal).toLocaleString('en-US', { minimumFractionDigits: 2 })})
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Generate button */}
          <button
            onClick={handleGenerarPDF}
            disabled={isDisabled || isGenerating}
            className="w-full py-3 px-6 rounded-lg text-sm font-semibold transition duration-100 ease-linear"
            style={
              isDisabled || isGenerating
                ? { backgroundColor: '#F5F5F5', color: '#A3A3A3', cursor: 'not-allowed' }
                : {
                    backgroundColor: '#1A1A1A',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    letterSpacing: '-0.01em',
                  }
            }
            onMouseEnter={(e) => {
              if (!isDisabled && !isGenerating) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#262626';
            }}
            onMouseLeave={(e) => {
              if (!isDisabled && !isGenerating) (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1A1A1A';
            }}
          >
            {isGenerating ? 'Generando PDF...' : 'Generar y Descargar PDF'}
          </button>

          {isDisabled && !isGenerating && (
            <p className="text-center text-xs mt-2.5" style={{ color: '#A3A3A3' }}>
              Completa todos los campos y verifica que los montos coincidan.
            </p>
          )}
          {pdfError && (
            <p className="text-center text-xs mt-2.5 font-medium" style={{ color: '#EF4444' }}>
              {pdfError}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
