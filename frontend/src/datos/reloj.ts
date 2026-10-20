/**
 * La hora de la app. Normalmente, la de verdad.
 *
 * Para revisar Inicio y la Agenda en plena Semana Santa sin esperar a marzo,
 * `?ahora=2027-03-26T01:00` en la dirección hace que la app viva en ese
 * momento: el reloj arranca ahí y sigue andando. Se recuerda durante la sesión
 * (al navegar se pierde la query) y `?ahora=` vacío vuelve a la hora real.
 */
const CLAVE = "cofradar:ahora";

let desfase: number | null = null;

function leerDesfase(): number {
  if (desfase !== null) return desfase;
  desfase = 0;
  try {
    const pedida = new URLSearchParams(window.location.search).get("ahora");
    if (pedida !== null) {
      if (pedida === "") sessionStorage.removeItem(CLAVE);
      else if (!Number.isNaN(Date.parse(pedida))) sessionStorage.setItem(CLAVE, String(Date.parse(pedida) - Date.now()));
    }
    const guardado = sessionStorage.getItem(CLAVE);
    if (guardado) desfase = Number(guardado);
  } catch {
    /* sin sessionStorage, la hora real */
  }
  return desfase;
}

export function ahora(): Date {
  return new Date(Date.now() + leerDesfase());
}

/** Si la app está viviendo en otra hora (para mostrarlo y que no engañe). */
export function relojDePrueba(): boolean {
  return leerDesfase() !== 0;
}
