import { useEffect } from "react";
import { useJornada } from "./jornada";
import { desfaseReloj } from "./reloj";

/**
 * Contar quién abre Cofradar cada jornada sin saber quién es (BUL-213, aprobado por Carlos el 25/10/2026).
 *
 * El teléfono se apunta él mismo en qué jornadas lo ha abierto («2027:3», «2027:8»), y solo eso. La
 * primera vez de cada jornada avisa al servidor con un «+1», diciendo si ya lo abrió otra jornada de
 * esa Semana Santa. El servidor solo suma dos números por jornada: no recibe ni guarda ningún id.
 *
 * Si no se puede apuntar (sin almacenamiento), no se avisa: mejor no contar que contar en cada visita.
 * Con el reloj de prueba (?ahora=) se apunta aparte y el servidor lo cuenta como de prueba.
 */
const CLAVE = "cofradar:jornadas-abiertas";
/** Para no avisar dos veces si la pantalla se monta otra vez antes de que conteste el servidor. */
const enviadas = new Set<string>();

function leer(clave: string): string[] | null {
  try {
    const v = JSON.parse(localStorage.getItem(clave) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return null;
  }
}

export function useContarApertura(activo: boolean) {
  const { hoy } = useJornada();
  const id = hoy?.id;
  const anio = hoy?.dia?.slice(0, 4);
  useEffect(() => {
    if (!activo || id === undefined || !anio) return;
    const desfase = desfaseReloj();
    const clave = desfase ? `${CLAVE}:prueba` : CLAVE;
    const lista = leer(clave);
    const esta = `${anio}:${id}`;
    if (!lista || lista.includes(esta) || enviadas.has(clave + esta)) return;
    enviadas.add(clave + esta);
    const vuelve = lista.some((x) => x.startsWith(`${anio}:`));
    void fetch("/api/metricas/apertura", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(desfase ? { "X-Reloj-Desfase": String(desfase) } : {}) },
      body: JSON.stringify({ jornada: id, vuelve }),
    })
      .then((r) => {
        if (!r.ok) return void enviadas.delete(clave + esta);
        // Solo esta Semana Santa y la anterior: lo demás ya no sirve para nada
        const recientes = lista.filter((x) => Number(x.slice(0, 4)) >= Number(anio) - 1);
        localStorage.setItem(clave, JSON.stringify([...recientes, esta]));
      })
      .catch(() => {
        /* sin conexión: se avisará la próxima vez que se abra */
        enviadas.delete(clave + esta);
      });
  }, [activo, id, anio]);
}
