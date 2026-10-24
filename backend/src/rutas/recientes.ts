/**
 * Los «Dar fe» recientes de cada persona, en memoria, y su escritura por lotes (BUL-212).
 *
 * En la prueba de carga de la Madrugá, casi todo lo que se pedía a Supabase eran dos consultas por cada
 * «Dar fe»: leer la última hora de esa persona (para los cuatro controles) y guardarlo. Con unas 67 por
 * segundo Supabase dejaba de responder. Así:
 *
 *   - La historia de cada persona se lee de la base de datos UNA vez (las últimas horas) y después se va
 *     completando aquí con lo que llega. Solo se vuelve a leer si llega una de otra hora que no está.
 *   - Lo que hay que guardar se junta y se escribe de una vez: un lote cuando se llena o a los ESPERA ms,
 *     y nunca dos a la vez (si la base de datos va lenta, el siguiente lote sale más grande).
 *
 * Vale porque los «Dar fe» solo se escriben desde este servidor, que es UN proceso. Si algún día hay
 * varios, esta memoria deja de ver lo que guardan los otros.
 */

const MIN = 60_000;

/** Lo que piden los cuatro controles de una aportación previa, y lo que se responde si se reenvía. */
export type Reciente = {
  clienteId: string;
  hermandadId: number;
  elemento: number | null;
  t: number;
  guardada: Promise<Guardada>;
};
export type Guardada = { id: string; puntos: number; observada: string };

// ---------------------------------------------------------------- la historia de cada persona

/** Lee de la base de datos las de una persona con la hora observada entre `desde` y `hasta` (ms; puede ser Infinity). */
export type LeerHistoria = (usuario: string, desde: number, hasta: number) => Promise<Reciente[]>;

type Historia = { desde: number; hasta: number; filas: Reciente[]; usada: number; cargando: Promise<void> | null };

export function crearHistorias(leer: LeerHistoria, { atras = 3 * 60 * MIN, olvidarTras = 3 * 60 * MIN } = {}) {
  const personas = new Map<string, Historia>();

  /**
   * Sus aportaciones con la hora entre `desde` y `hasta`, leyendo antes lo que falte. Devuelve la lista
   * viva: lo que se haga con ella sin otro `await` por medio no se cruza con otra petición.
   */
  async function de(usuario: string, desde: number, hasta: number): Promise<Reciente[]> {
    let h = personas.get(usuario);
    if (!h) personas.set(usuario, (h = { desde: Infinity, hasta: -Infinity, filas: [], usada: 0, cargando: null }));
    h.usada = Date.now();
    while (desde < h.desde || hasta > h.hasta) {
      if (!h.cargando) {
        // La primera vez, varias horas hacia atrás y todo lo de después: lo que se guarde a partir de
        // ahí pasa por este servidor y se anota aquí, así que no hay que volver a leer hacia delante
        const d = h.desde === Infinity ? desde - atras : Math.min(h.desde, desde);
        const a = h.desde === Infinity ? Infinity : Math.max(h.hasta, hasta);
        const hh = h;
        hh.cargando = leer(usuario, d, a)
          .then((leidas) => {
            // Las que están aquí y aún no ha visto la base de datos (en un lote sin escribir) se quedan
            const ya = new Set(leidas.map((r) => r.clienteId));
            hh.filas = [...leidas, ...hh.filas.filter((r) => !ya.has(r.clienteId))];
            hh.desde = d;
            hh.hasta = a;
          })
          .finally(() => (hh.cargando = null));
      }
      await h.cargando;
    }
    return h.filas;
  }

  /** Para que los cuatro controles de la siguiente ya la vean, antes de que esté escrita. */
  function anotar(usuario: string, r: Reciente) {
    personas.get(usuario)?.filas.push(r);
  }

  /** Si no se pudo guardar, no ha pasado. */
  function quitar(usuario: string, clienteId: string) {
    const h = personas.get(usuario);
    if (h) h.filas = h.filas.filter((r) => r.clienteId !== clienteId);
  }

  /** Al borrar la cuenta. */
  function olvidar(usuario: string) {
    personas.delete(usuario);
  }

  /** Quien lleva horas sin dar fe sale de la memoria (si vuelve, se lee otra vez). */
  function limpiar(ahora = Date.now()) {
    for (const [u, h] of personas) if (ahora - h.usada > olvidarTras && !h.cargando) personas.delete(u);
  }

  return { de, anotar, quitar, olvidar, limpiar, cuantas: () => personas.size };
}

// ---------------------------------------------------------------- los lotes

/** Escribe un lote y dice qué id le ha tocado a cada una, por su clave; las que faltan ya estaban. */
export type EscribirLote<F> = (filas: F[]) => Promise<Map<string, Guardada>>;

export function crearLotes<F>(escribir: EscribirLote<F>, clave: (f: F) => string, { maximo = 500, espera = 200 } = {}) {
  type Pendiente = { fila: F; bien: (g: Guardada) => void; mal: (e: unknown) => void };
  let cola: Pendiente[] = [];
  let temporizador: ReturnType<typeof setTimeout> | null = null;
  let escribiendo = false;

  async function vaciar() {
    if (temporizador) clearTimeout(temporizador);
    temporizador = null;
    if (escribiendo || !cola.length) return;
    escribiendo = true;
    const lote = cola.splice(0, maximo);
    try {
      const hechas = await escribir(lote.map((p) => p.fila));
      for (const p of lote) {
        const g = hechas.get(clave(p.fila));
        if (g) p.bien(g);
        else p.mal(new Error(`El lote no devolvió ${clave(p.fila)}`));
      }
    } catch (e) {
      for (const p of lote) p.mal(e);
    } finally {
      escribiendo = false;
      // Lo que llegó mientras tanto sale ya, sin esperar
      if (cola.length) void vaciar();
    }
  }

  function guardar(fila: F): Promise<Guardada> {
    return new Promise((bien, mal) => {
      cola.push({ fila, bien, mal });
      if (cola.length >= maximo) void vaciar();
      else if (!temporizador) temporizador = setTimeout(() => void vaciar(), espera);
    });
  }

  return { guardar, pendientes: () => cola.length };
}
