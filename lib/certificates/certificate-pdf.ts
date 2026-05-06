/**
 * Generador de certificados capyABA — LANDSCAPE 842 × 595 pt (todos los templates)
 *
 * Los assets se leen DESDE EL SISTEMA DE ARCHIVOS (public/certificate-assets/)
 * en lugar de Supabase Storage, para evitar dependencias de red y facilitar
 * el ajuste de posicionamiento.
 *
 * Archivos requeridos en public/certificate-assets/:
 *   background-ibt.png / background-iba.png / background-ceu.png  (2000×1414 px)
 *   firma.png          (2000×2000 px, cuadrada)
 *   logo-capyaba.png   (176×256 px, portrait)
 *   logo-acp.png       (2000×2000 px)
 *   logo-ceu.png       (2000×2000 px)
 *   DancingScript-Bold.ttf
 *   Montserrat-Regular.ttf
 *   Montserrat-Bold.ttf
 *
 * Escala de fondo: 2000 px = 842 pt  →  1 px = 0.421 pt
 *                 1414 px = 595 pt  →  1 px = 0.421 pt  (uniforme)
 *
 * Para convertir posición en píxeles del PNG a PDF:
 *   x_pdf = x_px * 0.421
 *   y_pdf = 595 - y_px * 0.421          ← y desde ABAJO en PDF
 */

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { PDFDocument, PDFPage, PDFFont, PDFImage, rgb, StandardFonts } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'

export type CertificateTemplate = 'ceu' | 'ibt' | 'iba'
export type CertificateModality = 'online' | 'presencial' | 'mixto'
export type CertificateArea     = 'etica' | 'supervision' | 'diversidad_cultural' | 'topicos_aba'

export type CertificateData = {
  studentName: string
  courseTitle: string
  issuedAt: Date
  verificationCode: string
  certificateNumber: string
  template: CertificateTemplate
  hours?: number | null
  ceus?: number | null
  modality?: CertificateModality
  area?: CertificateArea
  eventDate?: Date | null
  /** @deprecated Ya no se usa — los assets se leen de public/certificate-assets/ */
  assetsBaseUrl?: string
}

// ── Colores ──────────────────────────────────────────────────────────────────
const C = {
  ink:      rgb(0.416, 0.271, 0.212),
  inkBold:  rgb(0.247, 0.149, 0.122),
  inkLight: rgb(0.580, 0.440, 0.380),
  gray:     rgb(0.500, 0.500, 0.500),
}

const W = 842   // ancho PDF (pt)
const H = 595   // alto  PDF (pt)

// ── Directorio de assets ──────────────────────────────────────────────────────
const ASSETS = join(process.cwd(), 'public', 'certificate-assets')

type Fonts = { reg: PDFFont; bold: PDFFont; script: PDFFont }
type Imgs  = { firma: PDFImage | null; capy: PDFImage | null; acp: PDFImage | null; ceu: PDFImage | null }


/* ══════════════════════════════════════════════════════════════════════════════
   HELPERS DE CARGA DE ASSETS (filesystem)
   ══════════════════════════════════════════════════════════════════════════════ */

function readAsset(filename: string): Buffer | null {
  try {
    const p = join(ASSETS, filename)
    if (!existsSync(p)) return null
    return readFileSync(p)
  } catch { return null }
}

async function embedImg(doc: PDFDocument, filename: string): Promise<PDFImage | null> {
  try {
    const buf = readAsset(filename)
    if (!buf) return null
    const sig = new Uint8Array(buf)
    return (sig[0] === 0x89 && sig[1] === 0x50)
      ? await doc.embedPng(buf)
      : await doc.embedJpg(buf)
  } catch { return null }
}

async function embedImgAny(doc: PDFDocument, filenames: string[]): Promise<PDFImage | null> {
  for (const fn of filenames) {
    const img = await embedImg(doc, fn)
    if (img) return img
  }
  return null
}

async function tryEmbedFont(doc: PDFDocument, buf: Buffer): Promise<PDFFont | null> {
  try { return await doc.embedFont(buf, { subset: true }) } catch { return null }
}


/* ══════════════════════════════════════════════════════════════════════════════
   FUNCIÓN PRINCIPAL
   ══════════════════════════════════════════════════════════════════════════════ */

export async function generateCertificatePDF(data: CertificateData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create()
  pdfDoc.registerFontkit(fontkit)
  pdfDoc.setTitle(`Certificado · ${data.studentName}`)
  pdfDoc.setAuthor('capyABA')
  pdfDoc.setSubject(data.courseTitle)
  pdfDoc.setCreationDate(data.issuedAt)

  const page = pdfDoc.addPage([W, H])

  // ── Fuentes ────────────────────────────────────────────────────────────────
  const [regBuf, boldBuf, scriptBuf] = [
    readAsset('Montserrat-Regular.ttf'),
    readAsset('Montserrat-Bold.ttf'),
    readAsset('DancingScript-Bold.ttf'),
  ]
  const fReg    = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fBold   = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const fScript = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

  const fonts: Fonts = {
    reg:    regBuf    ? (await tryEmbedFont(pdfDoc, regBuf)    ?? fReg)    : fReg,
    bold:   boldBuf   ? (await tryEmbedFont(pdfDoc, boldBuf)   ?? fBold)   : fBold,
    script: scriptBuf ? (await tryEmbedFont(pdfDoc, scriptBuf) ?? fScript) : fScript,
  }

  // ── Imágenes ───────────────────────────────────────────────────────────────
  const [bgImg, firmaImg, capyImg, acpImg, ceuImg] = await Promise.all([
    embedImgAny(pdfDoc, [
      `background-${data.template}.png`,
      `background-${data.template}.jpg`,
      'background.png',
    ]),
    embedImg(pdfDoc, 'firma.png'),
    embedImg(pdfDoc, 'logo-capyaba.png'),
    embedImg(pdfDoc, 'logo-acp.png'),
    data.template === 'ceu' ? embedImg(pdfDoc, 'logo-ceu.png') : Promise.resolve(null),
  ])

  const imgs: Imgs = { firma: firmaImg, capy: capyImg, acp: acpImg, ceu: ceuImg }

  // ── Fondo ──────────────────────────────────────────────────────────────────
  if (bgImg) {
    page.drawImage(bgImg, { x: 0, y: 0, width: W, height: H })
  } else {
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(0.996, 0.961, 0.953) })
  }

  if (data.template === 'ceu') drawCeu(page, fonts, imgs, data)
  else                         drawIbtIba(page, fonts, imgs, data)

  return await pdfDoc.save()
}


/* ══════════════════════════════════════════════════════════════════════════════
   IBT / IBA  — landscape 842 × 595 pt
   ══════════════════════════════════════════════════════════════════════════════

   Referencia de posiciones (medidas sobre background-ibt.png 2000×1414 px,
   escala 0.421 pt/px):

     Ornamento ✻    pixel y ≈ 300  →  pdf y = 595 - 300*0.421 = 469
     Línea larga    pixel y ≈ 640  →  pdf y = 595 - 640*0.421 = 325
     Tres puntos    pixel y ≈ 740  →  pdf y = 595 - 740*0.421 = 284
     Línea firma    pixel y ≈ 1010 →  pdf y = 595 - 1010*0.421 = 170
*/
function drawIbtIba(page: PDFPage, f: Fonts, imgs: Imgs, data: CertificateData) {
  const cx = W / 2   // 421

  // "Certificado" — mismo tamaño y posición que CEU (68pt, y=492)
  centered(page, 'Certificado', f.script, 68, cx, 466, C.inkBold)

  // "OTORGADO A" — mismo que CEU
  spaced(page, 'OTORGADO A', f.reg, 9, cx, 437, 2, C.inkLight)

  // Nombre — bajado 10pt
  bigName(page, f.script, toTitleCase(data.studentName), cx, 307)

  const hours = data.hours ?? (data.template === 'ibt' ? 40 : 270)
  mixed(page, [
    { text: 'POR COMPLETAR CON ÉXITO LAS ', f: f.reg },
    { text: `${hours} HORAS`, f: f.bold },
    { text: ' DE', f: f.reg },
  ], cx, 281, 14.5, C.ink)

  if (data.template === 'ibt') {
    centered(page, 'FORMACIÓN TEÓRICA COMO TERAPEUTA DE CONDUCTA', f.bold, 14.5, cx, 266, C.inkBold)
    centered(page, 'INTERNACIONAL (IBT)', f.bold, 14.5, cx, 251, C.inkBold)
  } else {
    centered(page, 'FORMACIÓN TEÓRICA COMO ANALISTA DE CONDUCTA', f.bold, 14.5, cx, 266, C.inkBold)
    centered(page, 'INTERNACIONAL (IBA)', f.bold, 14.5, cx, 251, C.inkBold)
  }

  // Fecha entre descripción y línea firma (pdf y=170)
  centered(page, `Fecha de emisión: ${fmtDate(data.issuedAt)}`, f.reg, 10, cx, 232, C.inkLight)

  /* ── Sección inferior ──────────────────────────────────────────────────── */

  // Logo capyABA — izquierda  (176×256 px → ratio 0.688; natural pdf = 74×108 pt)
  if (imgs.capy) page.drawImage(imgs.capy, { x: 118, y: 30, width: 128, height: 186 })

  // Firma — centro; línea firma a pdf y≈170, imagen encima
  if (imgs.firma) page.drawImage(imgs.firma, { x: 351, y: 91, width: 140, height: 140 })

  // Texto bajo firma — fuente más grande
  centered(page, 'Francesca Ramírez Bontá, IBA', f.bold, 11,   cx, 102, C.inkBold)
  centered(page, 'AC PROVIDER',                   f.reg,  10,   cx,  87, C.ink)
  centered(page, 'IBA_022026_004855',              f.reg,   9,   cx,  73, C.inkLight)

  // Logo ACP — derecha  (2000×2000 → cuadrado)
  if (imgs.acp) page.drawImage(imgs.acp, { x: 592, y: 30, width: 170, height: 170 })

  verif(page, f.reg, data.verificationCode)
}


/* ══════════════════════════════════════════════════════════════════════════════
   CEU  — landscape 842 × 595 pt
   ══════════════════════════════════════════════════════════════════════════════

   Referencia de posiciones (medidas sobre background-ceu.png 2000×1414 px):

     Hoja decorativa  pixel y ≈ 290  →  pdf y = 595 - 290*0.421 = 473
     Línea larga      pixel y ≈ 650  →  pdf y = 595 - 650*0.421 = 321
     Tres puntos      pixel y ≈ 760  →  pdf y = 595 - 760*0.421 = 275
     Caja INFO        pixel x ≈ 1420 →  pdf x = 1420*0.421 = 598
                      pixel y_top≈760→  pdf y = 275  (misma altura que puntos)
     Ícono ⓘ          pixel y ≈ 854  →  pdf y ≈ 220 (ajustado iterativamente)
     Ícono persona    pixel y ≈ 930  →  pdf y ≈ 190
     Ícono calendario pixel y ≈ 1012 →  pdf y ≈ 152 (más espacio desde Online)
     Ícono libro      pixel y ≈ 1088 →  pdf y ≈ 122
     Línea firma      pixel y ≈ 1030 →  pdf y = 595 - 1030*0.421 = 161
*/
function drawCeu(page: PDFPage, f: Fonts, imgs: Imgs, data: CertificateData) {
  const cx = W / 2   // 421
  // Centro de la columna izquierda (x=0 a x≈598): ≈299
  const cxL = 299

  /* ── ENCABEZADO ─────────────────────────────────────────────────────────── */

  // "Certificado" — grande, encima de la hoja decorativa (pdf y=473)
  centered(page, 'Certificado', f.script, 68, cx, 492, C.inkBold)

  // Logo capyABA — esquina superior derecha (176×256 → ratio 0.688)
  // Dibujar en 90×131 pt para respetar el aspect ratio portrait (más grande)
  if (imgs.capy) page.drawImage(imgs.capy, { x: 636, y: 440, width: 90, height: 131 })

  // "OTORGADO A" con letter-spacing
  spaced(page, 'OTORGADO A', f.reg, 9, cx, 454, 2, C.inkLight)

  /* ── NOMBRE ──────────────────────────────────────────────────────────────── */
  // Baseline al ras de la línea larga (pdf y=321): y=336 deja ~15pt de espacio
  // Centrado en cx=330 (zona izquierda-centro, evita solapar con info box)
  bigNameCeu(page, f.script, toTitleCase(data.studentName), 421, 336)

  /* ── DESCRIPCIÓN ──────────────────────────────────────────────────────────
     Los tres puntos están a pdf y≈275.  Texto comienza a y=267 (8pt debajo).
     Interlineado reducido a 14pt para que las 3 líneas queden juntas.
     Centrado en columna izquierda (cxL=299, maxW=510).                       */
  const hours = data.hours ?? 1
  const ceus  = data.ceus  ?? 1
  const maxW  = 510

  // Descripción: oración continua con comas, interlineado uniforme 15pt, fuente 14.5pt
  const descSZ = 14.5
  const descLH = 15

  const descCX = 421  // mismo centro que el nombre (centro de página)
  const titleLines = wrapText(`Por atender la presentación "${data.courseTitle}",`, f.reg, descSZ, maxW)
  titleLines.forEach((line, i) => centered(page, line, f.reg, descSZ, descCX, 310 - i * descLH, C.ink))
  const descLine2Y = 310 - titleLines.length * descLH

  mixed(page, [
    { text: 'dictado por ', f: f.reg },
    { text: 'Francesca Ramírez Bontá, IBA', f: f.bold },
    { text: ',', f: f.reg },
  ], descCX, descLine2Y, descSZ, C.ink)

  mixed(page, [
    { text: 'con una Duración de ', f: f.reg },
    { text: String(hours), f: f.bold },
    { text: ` hr${hours === 1 ? '' : 's'} equivalentes a `, f: f.reg },
    { text: `${ceus} CEU${ceus === 1 ? '' : 's'}`, f: f.bold },
    { text: '.', f: f.reg },
  ], descCX, descLine2Y - descLH, descSZ, C.ink)

  /* ── SECCIÓN INFERIOR ────────────────────────────────────────────────────── */

  // Logos izquierda — 116×116, centrados en sus cuadrantes, más arriba
  if (imgs.ceu) page.drawImage(imgs.ceu, { x: 76,  y: 85,  width: 116, height: 116 })
  if (imgs.acp) page.drawImage(imgs.acp, { x: 186, y: 82,  width: 130, height: 130 })

  // Firma — encima de la línea: 130×130, bottom en y=128, top≈258
  // Firma — centrada en cx=421, bottom en y=93
  if (imgs.firma) page.drawImage(imgs.firma, { x: 360, y: 93, width: 140, height: 140 })

  // Texto justo debajo de la firma — centrado en cx=430
  centered(page, 'Francesca Ramírez Bontá, IBA', f.bold, 9,   430,  112, C.inkBold)
  centered(page, 'AC PROVIDER',                   f.reg,  8.5, 430,  100, C.ink)
  centered(page, 'IBA_022026_004855',              f.reg,  8,   430,   89, C.inkLight)

  // Caja INFORMACIÓN — columna derecha
  drawInfoBox(page, f, data)

  // Fecha de emisión — centrada entre las líneas decorativas del fondo (cx≈310), tamaño 9pt
  centered(page, `Fecha de emisión: ${fmtDate(data.issuedAt)}`, f.reg, 9, 420, 31, C.inkLight)

  verif(page, f.reg, data.verificationCode)
}


/* ══════════════════════════════════════════════════════════════════════════════
   CAJA INFORMACIÓN (solo en CEU)
   ══════════════════════════════════════════════════════════════════════════════

   Los íconos (ⓘ, persona, calendario, libro) forman parte del fondo.
   Este código dibuja TODOS los textos: encabezado, etiquetas y opciones.

   Opción seleccionada → texto normal + "(X)" al final
   Opciones no seleccionadas → texto normal + "( )" al final

   ─── AJUSTE FINO ─────────────────────────────────────────────────────────────
   Si los textos no coinciden con los íconos del fondo, ajusta las constantes
   Y_* a continuación.  Escala de referencia: 1 px del PNG = 0.421 pt PDF.
*/
function drawInfoBox(page: PDFPage, f: Fonts, data: CertificateData) {
  // ── Posiciones X ─────────────────────────────────────────────────────────────
  const INFO_X = 648   // "INFORMACIÓN" — un poco a la derecha
  const LBL_X  = 625   // etiquetas: Modalidad, Fecha, Área
  const OPT_X  = 630   // opciones con leve indent

  // ── Posiciones Y (pdf desde abajo) ───────────────────────────────────────────
  const Y_INFO     = 214   // "INFORMACIÓN"       — subido a altura del ícono ⓘ
  const Y_MOD_LBL  = 187   // "Modalidad:"        — subido a altura del ícono persona
  const Y_MOD_1    = 173   // primera opción de modalidad
  const Y_MOD_LH   =  13   // interlineado opciones modalidad
  const Y_EVT_LBL  = 142   // "Fecha del evento:" — subido a altura del ícono calendario
  const Y_AREA_LBL = 107   // "Área:"             — subido un poco
  const Y_AREA_1   =  94   // primera opción de área
  const Y_AREA_LH  =  12   // interlineado opciones de área

  // ── Tamaños de fuente ─────────────────────────────────────────────────────────
  const SZ_HDR = 9    // "INFORMACIÓN"
  const SZ_LBL = 8    // etiquetas de sección
  const SZ_OPT = 7.5  // opciones
  const B      = '•'  // bullet
  // ──────────────────────────────────────────────────────────────────────────────

  const selMod  = data.modality ?? 'online'
  const selArea = data.area     ?? 'topicos_aba'

  // ── Encabezado ────────────────────────────────────────────────────────────────
  page.drawText('INFORMACIÓN', {
    x: INFO_X, y: Y_INFO, size: SZ_HDR, font: f.bold, color: C.inkBold,
  })

  // ── Modalidad ─────────────────────────────────────────────────────────────────
  page.drawText('Modalidad:', {
    x: LBL_X, y: Y_MOD_LBL, size: SZ_LBL, font: f.bold, color: C.inkBold,
  })
  const mods: [string, CertificateModality][] = selMod === 'mixto'
    ? [['Presencial', 'presencial'], ['Mixto', 'mixto']]
    : [['Presencial', 'presencial'], ['Online', 'online']]

  mods.forEach(([label, value], i) => {
    const sel = selMod === value
    page.drawText(`${B} ${label}  ${sel ? '(X)' : '( )'}`, {
      x: OPT_X, y: Y_MOD_1 - i * Y_MOD_LH, size: SZ_OPT,
      font: f.reg, color: C.ink,
    })
  })

  // ── Fecha del evento — etiqueta + valor en la misma línea ────────────────────
  const evDate = data.eventDate ? fmtDate(data.eventDate) : '—'
  const evLblW = f.bold.widthOfTextAtSize('Fecha del evento: ', SZ_LBL)
  page.drawText('Fecha del evento: ', {
    x: LBL_X, y: Y_EVT_LBL, size: SZ_LBL, font: f.bold, color: C.inkBold,
  })
  page.drawText(evDate, {
    x: LBL_X + evLblW, y: Y_EVT_LBL, size: SZ_LBL, font: f.reg, color: C.ink,
  })

  // ── Área ──────────────────────────────────────────────────────────────────────
  page.drawText('Área:', {
    x: LBL_X, y: Y_AREA_LBL, size: SZ_LBL, font: f.bold, color: C.inkBold,
  })
  const areas: [string, CertificateArea][] = [
    ['Ética',               'etica'],
    ['Supervisión',         'supervision'],
    ['Diversidad cultural', 'diversidad_cultural'],
    ['Tópicos ABA',         'topicos_aba'],
  ]
  areas.forEach(([label, value], i) => {
    const sel = selArea === value
    page.drawText(`${B} ${label}  ${sel ? '(X)' : '( )'}`, {
      x: OPT_X, y: Y_AREA_1 - i * Y_AREA_LH, size: SZ_OPT,
      font: f.reg, color: C.ink,
    })
  })
}


/* ══════════════════════════════════════════════════════════════════════════════
   HELPERS DE DIBUJO
   ══════════════════════════════════════════════════════════════════════════════ */

/** Nombre en DancingScript, auto-reduce si excede el ancho de la página (IBT/IBA) */
function bigName(page: PDFPage, script: PDFFont, name: string, cx: number, y: number) {
  let size = 54
  let tw   = script.widthOfTextAtSize(name, size)
  while (tw > W - 160 && size > 28) { size -= 1; tw = script.widthOfTextAtSize(name, size) }
  page.drawText(name, { x: cx - tw / 2, y, size, font: script, color: C.ink })
}

/** Nombre en DancingScript para CEU — ancho limitado a columna izquierda (≤550 pt) */
function bigNameCeu(page: PDFPage, script: PDFFont, name: string, cx: number, y: number) {
  const MAX_W = 550
  let size = 62     // más grande que IBT/IBA
  let tw   = script.widthOfTextAtSize(name, size)
  while (tw > MAX_W && size > 26) { size -= 1; tw = script.widthOfTextAtSize(name, size) }
  const x = tw > MAX_W ? (W - tw) / 2 : cx - tw / 2
  page.drawText(name, { x, y, size, font: script, color: C.ink })
}

function centered(page: PDFPage, text: string, font: PDFFont, size: number, cx: number, y: number, color = C.ink) {
  const tw = font.widthOfTextAtSize(text, size)
  page.drawText(text, { x: cx - tw / 2, y, size, font, color })
}

function mixed(page: PDFPage, segs: { text: string; f: PDFFont }[], cx: number, y: number, size: number, color = C.ink) {
  const total = segs.reduce((s, g) => s + g.f.widthOfTextAtSize(g.text, size), 0)
  let x = cx - total / 2
  for (const g of segs) {
    page.drawText(g.text, { x, y, size, font: g.f, color })
    x += g.f.widthOfTextAtSize(g.text, size)
  }
}

/**
 * Texto centrado con letter-spacing manual (pdf-lib no soporta characterSpacing).
 * Dibuja carácter a carácter con un gap extra entre cada uno.
 */
function spaced(
  page: PDFPage, text: string, font: PDFFont, size: number,
  cx: number, y: number, gap: number, color = C.ink,
) {
  const totalW = font.widthOfTextAtSize(text, size) + gap * (text.length - 1)
  let x = cx - totalW / 2
  for (const ch of text) {
    page.drawText(ch, { x, y, size, font, color })
    x += font.widthOfTextAtSize(ch, size) + gap
  }
}

function verif(page: PDFPage, reg: PDFFont, code: string) {
  const text = `Verificación: ${code}`
  const size = 7
  const tw   = reg.widthOfTextAtSize(text, size)
  page.drawText(text, { x: W - tw - 14, y: 10, size, font: reg, color: C.gray })
}

function wrapText(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w
    if (font.widthOfTextAtSize(test, size) > maxW && cur) { lines.push(cur); cur = w }
    else cur = test
  }
  if (cur) lines.push(cur)
  return lines
}

function fmtDate(d: Date) {
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`
}

/** Capitaliza la primera letra de cada palabra: "juan pérez" → "Juan Pérez" */
function toTitleCase(name: string): string {
  return name.replace(/\S+/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}
