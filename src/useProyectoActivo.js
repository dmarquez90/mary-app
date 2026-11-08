import { useSyncExternalStore, useCallback } from 'react'

// Proyecto activo compartido entre módulos (Presupuesto, Órdenes de Cambio, Financiero, etc.).
// Al elegir un proyecto en cualquier módulo, queda activo en todos hasta que el usuario lo
// cambie manualmente. Se guarda en localStorage para que sobreviva a recargas.

const LS_KEY = 'mary_proyecto_activo'
const listeners = new Set()

let actual = (() => {
  try { return localStorage.getItem(LS_KEY) } catch { return null }
})()

const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }
const getSnapshot = () => actual

export const setProyectoActivo = (id) => {
  actual = id ?? ''
  try { localStorage.setItem(LS_KEY, actual) } catch { /* localStorage bloqueado */ }
  listeners.forEach(fn => fn())
}

// Devuelve [proyId, setProyId] con la misma forma que useState.
// Si el proyecto guardado no existe en la lista (borrado, otro tenant, aún sin elegir),
// se usa el primero de la lista, como antes.
export function useProyectoActivo(proyectos = []) {
  const guardado = useSyncExternalStore(subscribe, getSnapshot)
  const valido = guardado === '' || (guardado && proyectos.some(p => p.id === guardado))
  const proyId = valido ? guardado : (proyectos[0]?.id || '')
  const setProyId = useCallback((id) => setProyectoActivo(id), [])
  return [proyId, setProyId]
}
