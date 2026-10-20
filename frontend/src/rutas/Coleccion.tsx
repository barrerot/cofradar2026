import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AvisoEntrada, Esqueleto, SegunDato } from "../componentes";
import { BottomSheet, Boton, EnCapaDelMarco, Icono, PantallaSecundaria } from "../marco";
import { useJornada } from "../datos/jornada";
import { useRelaciones } from "../datos/relaciones";
import { useSesion } from "../datos/sesion";
import { useDato } from "../datos/useDato";
import type { EstadoJornada } from "../fixture";
import { coincide } from "./Cofradias";
import { DarFe } from "./DarFe";

/**
 * P-21 Mi colección (7-mi-cofradar/coleccion), registro editorial.
 *
 *   Cuántas     «12 de 72 hermandades», con su barra. Sin comparar con nadie.
 *   La lista    todas, por jornada: las que has visto con el ojo relleno en
 *               granate y los años; las demás, con el ojo en contorno. Cada
 *               una lleva a su ficha.
 *   Añadir      «Añadir una que vi»: eliges el año y la cofradía. Sirve para
 *               las de años anteriores (desde 1950); la de este año también se
 *               marca desde su ficha con «La he visto».
 *
 * Es de la cuenta (decisión del 20/10/2026): sin sesión se invita a entrar.
 */
type Cofradia = { id: string; nombre: string; jornadaId: number };

export function Coleccion({ estado }: { estado: EstadoJornada }) {
  const { usuario, disponible, entrar } = useSesion();
  const todas = useDato<Cofradia[]>("/cofradias", { cadaMs: 600_000 });

  return (
    <PantallaSecundaria
      registro="editorial"
      titulo="Mi colección"
      vuelta={{ etiqueta: "Mi Cofradar", ruta: "/mi-cofradar" }}
      accion={estado.activa ? <DarFe /> : undefined}
    >
      <AvisoEntrada motivo="coleccion" />
      {usuario === null ? (
        <div className="cf-seguidas-vacio">
          <Icono nombre="vista" tamano={40} />
          <p>Para guardar las cofradías que ves, entra con tu cuenta de Google.</p>
          {disponible ? (
            <Boton variante="secundario" onClick={() => void entrar("coleccion")}>
              Entrar con Google
            </Boton>
          ) : null}
        </div>
      ) : (
        <SegunDato dato={todas} esqueleto={<Esqueleto forma="lista" />}>
          {(lista) => <Contenido todas={lista} />}
        </SegunDato>
      )}
    </PantallaSecundaria>
  );
}

function Contenido({ todas }: { todas: Cofradia[] }) {
  const relaciones = useRelaciones();
  const { jornadas } = useJornada();
  const [anadiendo, setAnadiendo] = useState(false);

  if (!relaciones.listas) return <Esqueleto forma="lista" />;
  const total = todas.length;
  const vistas = todas.filter((c) => relaciones.aniosVista(c.id).length > 0).length;
  const orden = [...(jornadas.datos ?? [])].sort((a, b) => a.orden - b.orden);

  return (
    <div className="cf-coleccion">
      <div className="cf-coleccion-cuenta">
        <p>
          <span className="cf-num n">
            {vistas} de {total}
          </span>{" "}
          hermandades
        </p>
        <div
          className="cf-coleccion-barra"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={vistas}
          aria-label="Hermandades vistas"
        >
          <span style={{ width: `${total ? (vistas / total) * 100 : 0}%` }} />
        </div>
      </div>

      <div>
        <Boton variante="secundario" aria-haspopup="dialog" onClick={() => setAnadiendo(true)}>
          <Icono nombre="mas" tamano={20} />
          Añadir una que vi
        </Boton>
      </div>

      {orden.map((j) => {
        const deEsta = todas.filter((c) => c.jornadaId === j.id);
        if (!deEsta.length) return null;
        return (
          <section key={j.id} className="cf-coleccion-grupo" aria-labelledby={`coleccion-${j.id}`}>
            <h2 id={`coleccion-${j.id}`}>{j.nombre}</h2>
            <ul>
              {deEsta.map((c) => {
                const anios = relaciones.aniosVista(c.id);
                return (
                  <li key={c.id}>
                    <Link to={`/cofradias/${c.id}`} className="cf-coleccion-fila" data-vista={anios.length ? "" : undefined}>
                      <Icono nombre={anios.length ? "vista" : "ojo"} tamano={24} />
                      <span className="nm">{c.nombre}</span>
                      {anios.length ? <span className="cf-num anios">{anios.join(", ")}</span> : null}
                      <span className="cf-oculto-visual">{anios.length ? "Vista" : "Sin ver"}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <EnCapaDelMarco>
        <BottomSheet
          abierto={anadiendo}
          titulo="Añadir una que vi"
          modo="bloquea"
          alturaInicial="expandido"
          alCerrar={() => setAnadiendo(false)}
        >
          <Anadir todas={todas} />
        </BottomSheet>
      </EnCapaDelMarco>
    </div>
  );
}

/** Elegir el año y marcar o desmarcar cofradías de ese año. */
function Anadir({ todas }: { todas: Cofradia[] }) {
  const relaciones = useRelaciones();
  const actual = relaciones.anio ?? new Date().getFullYear();
  const [anio, setAnio] = useState(actual);
  const [consulta, setConsulta] = useState("");
  const [fallo, setFallo] = useState(false);
  const anios = useMemo(() => Array.from({ length: actual - 1950 + 1 }, (_, k) => actual - k), [actual]);
  const lista = [...todas].filter((c) => coincide(c.nombre, consulta)).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  const cambiar = async (id: string, poner: boolean) => {
    setFallo(false);
    if (!(await relaciones.cambiarVista(id, poner, anio))) setFallo(true);
  };

  return (
    <div className="cf-coleccion-anadir">
      <label className="cf-field">
        <span>Año</span>
        <select value={anio} onChange={(e) => setAnio(Number(e.target.value))}>
          {anios.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </label>
      <label className="cf-field">
        <span>Cofradía</span>
        <input type="search" placeholder="Buscar hermandad" value={consulta} onChange={(e) => setConsulta(e.target.value)} />
      </label>
      {fallo ? (
        <p className="cf-ficha-fallo" role="status">
          <Icono nombre="informativo" tamano={20} />
          No se ha podido guardar. Inténtalo de nuevo en un momento.
        </p>
      ) : null}
      <ul className="cf-coleccion-opciones">
        {lista.map((c) => {
          const marcada = relaciones.aniosVista(c.id).includes(anio);
          return (
            <li key={c.id}>
              <button type="button" role="checkbox" aria-checked={marcada} onClick={() => void cambiar(c.id, !marcada)}>
                <Icono nombre={marcada ? "vista" : "ojo"} tamano={20} />
                <span>{c.nombre}</span>
                {marcada ? <Icono nombre="check" tamano={20} /> : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
