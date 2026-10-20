import { useState } from "react";
import { Link } from "react-router-dom";
import { AvisoEntrada, ChipEstado, Esqueleto, MarcaRelacion, SegunDato } from "../componentes";
import { Boton, Icono, PantallaSecundaria } from "../marco";
import { useActividad } from "../datos/actividad";
import { useJornada } from "../datos/jornada";
import { useRelaciones } from "../datos/relaciones";
import { useSesion } from "../datos/sesion";
import { useDato } from "../datos/useDato";
import type { EstadoJornada } from "../fixture";
import { DarFe } from "./DarFe";

/**
 * P-20 Seguidas (7-mi-cofradar/seguidas y seguidas-vacia).
 *
 * Las cofradías que sigues, agrupadas por jornada: la de hoy primero («· hoy»)
 * y las demás en el orden de la semana. Cada fila lleva a su ficha y tiene
 * «Dejar de seguir». Hoy, la que según el horario está en la calle lleva su
 * chip «según horario»; el estado de verdad llega con el motor (4.16).
 *
 * Son de la cuenta (decisión del 20/10/2026): sin sesión se invita a entrar.
 */
type Cofradia = { id: string; nombre: string; jornada: string; jornadaId: number };

export function Seguidas({ estado }: { estado: EstadoJornada }) {
  const { usuario, disponible, entrar } = useSesion();
  const todas = useDato<Cofradia[]>("/cofradias", { cadaMs: 600_000 });

  return (
    <PantallaSecundaria
      titulo="Seguidas"
      vuelta={{ etiqueta: "Mi Cofradar", ruta: "/mi-cofradar" }}
      sangrado="lista"
      accion={estado.activa ? <DarFe /> : undefined}
    >
      <AvisoEntrada motivo="seguidas" />
      {usuario === null ? (
        <Vacio texto="Para seguir cofradías, entra con tu cuenta de Google.">
          {disponible ? (
            <Boton variante="secundario" onClick={() => void entrar("seguidas")}>
              Entrar con Google
            </Boton>
          ) : null}
        </Vacio>
      ) : (
        <SegunDato dato={todas} esqueleto={<Esqueleto forma="lista" />}>
          {(lista) => <Lista todas={lista} />}
        </SegunDato>
      )}
    </PantallaSecundaria>
  );
}

function Lista({ todas }: { todas: Cofradia[] }) {
  const relaciones = useRelaciones();
  const { jornadas, hoy } = useJornada();
  const { salidas, ahora } = useActividad();
  const [fallo, setFallo] = useState(false);

  if (!relaciones.listas) return <Esqueleto forma="lista" />;
  const mias = todas.filter((c) => relaciones.esSeguida(c.id));
  if (!mias.length) return <Vacio texto={"Aún no sigues ninguna.\nPuedes seguirlas desde su ficha."} />;

  const orden = [...(jornadas.datos ?? [])].sort(
    (a, b) => Number(b.id === hoy?.id) - Number(a.id === hoy?.id) || a.orden - b.orden,
  );
  const t = ahora.getTime();
  const enCalle = new Set(
    salidas.filter((s) => s.salida && s.entrada && s.salida.getTime() <= t && t < s.entrada.getTime()).map((s) => s.id),
  );

  const dejar = async (id: string) => {
    setFallo(false);
    if (!(await relaciones.cambiarSeguida(id, false))) setFallo(true);
  };

  return (
    <div className="cf-seguidas">
      {fallo ? (
        <p className="cf-ficha-fallo" role="status">
          <Icono nombre="informativo" tamano={20} />
          No se ha podido guardar. Inténtalo de nuevo en un momento.
        </p>
      ) : null}
      {orden.map((j) => {
        const deEsta = mias.filter((c) => c.jornadaId === j.id);
        if (!deEsta.length) return null;
        return (
          <section key={j.id} className="cf-cofradias-grupo" aria-labelledby={`seguidas-${j.id}`}>
            <h2 id={`seguidas-${j.id}`}>{j.id === hoy?.id ? `${j.nombre} · hoy` : j.nombre}</h2>
            <ul className="cf-seguidas-lista">
              {deEsta.map((c) => (
                <li key={c.id} className="cf-seguidas-fila">
                  <Link to={`/cofradias/${c.id}`} className="cf-seguidas-nombre">
                    <MarcaRelacion relacion="seguida" />
                    <span>{c.nombre}</span>
                  </Link>
                  <Boton variante="secundario" onClick={() => void dejar(c.id)}>
                    Dejar de seguir
                  </Boton>
                  {enCalle.has(c.id) ? (
                    <div className="cf-seguidas-estado">
                      <ChipEstado fase="en_calle" confianza="estimado" />
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function Vacio({ texto, children }: { texto: string; children?: React.ReactNode }) {
  return (
    <div className="cf-seguidas-vacio">
      <Icono nombre="seguida" tamano={40} />
      <p>{texto}</p>
      {children}
    </div>
  );
}
