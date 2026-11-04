// Utilidades para el logo de la empresa (guardado como data URL en tenants.logo_url)

const MAX_W = 400
const MAX_H = 200

// Lee una imagen y la reduce a un PNG de tamaño razonable (conserva transparencia)
export function resizeLogo(file) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\/(png|jpe?g|webp)$/.test(file.type)) return reject(new Error('invalid_type'))
    if (file.size > 5 * 1024 * 1024) return reject(new Error('too_big'))
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('read_error'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('read_error'))
      img.onload = () => {
        const scale = Math.min(1, MAX_W / img.width, MAX_H / img.height)
        const w = Math.max(1, Math.round(img.width * scale))
        const h = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/png'))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

// Para ExcelJS: { base64, width, height } con alto fijo y ancho proporcional
export function logoParaExcel(dataUrl, altoPx = 36) {
  return new Promise(resolve => {
    if (!dataUrl) return resolve(null)
    const img = new Image()
    img.onerror = () => resolve(null)
    img.onload = () => resolve({
      base64: dataUrl,
      width:  Math.round(img.width * (altoPx / img.height)),
      height: altoPx,
    })
    img.src = dataUrl
  })
}

// Agrega el logo (si existe) al worksheet, anclado a la celda superior izquierda
export function agregarLogoExcel(wb, ws, logo, col = 0, row = 0) {
  if (!logo) return
  const id = wb.addImage({ base64: logo.base64, extension: 'png' })
  ws.addImage(id, { tl: { col: col + 0.05, row: row + 0.1 }, ext: { width: logo.width, height: logo.height } })
}

// ── Logo global de la empresa actual (lo fija App.jsx al cargar el perfil) ──
let logoDataUrl = null
let logoExcel   = null   // { base64, width, height } precargado para los reportes

export function setLogoGlobal(dataUrl) {
  logoDataUrl = dataUrl || null
  logoExcel = null
  if (logoDataUrl) logoParaExcel(logoDataUrl, 26).then(l => { if (logoDataUrl === dataUrl) logoExcel = l })
}

export const getLogoGlobal = () => logoDataUrl

// Header de reportes Excel: logo a la izquierda de la celda y nombre de empresa a la derecha
export function headerConLogo(ws, cell) {
  if (!logoExcel) return
  const wb = ws.workbook
  const id = wb.addImage({ base64: logoExcel.base64, extension: 'png' })
  ws.addImage(id, { tl: { col: 0.08, row: 0.12 }, ext: { width: logoExcel.width, height: logoExcel.height } })
  cell.alignment = { ...(cell.alignment || {}), horizontal: 'right', vertical: 'middle' }
}

// Fila propia con el logo (para documentos cuyo encabezado es una banda de color).
// Devuelve la siguiente fila libre.
export function filaLogoExcel(ws, row) {
  if (!logoExcel) return row
  const wb = ws.workbook
  const id = wb.addImage({ base64: logoExcel.base64, extension: 'png' })
  ws.getRow(row).height = 36
  ws.addImage(id, { tl: { col: 0.1, row: row - 1 + 0.1 }, ext: { width: logoExcel.width, height: logoExcel.height } })
  return row + 1
}
