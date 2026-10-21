import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Esqueleto } from "../componentes";
import { Boton, Icono, PantallaSecundaria } from "../marco";
import { alCambiarCola, pendientes, type Envio } from "../datos/darFe";
import { useMisAportaciones } from "../datos/puntos";
import { useSesion } from "../datos/sesion";
import { useDato } from "../datos/useDato";
import type { EstadoJornada } from "../fixture";
import { DarFe } from "./DarFe";

/**
 * P-22 Mis aportaciones (7-mi-cofradar/aportaciones, 4.14).
 *
 * Tu historial de «Dar fe», agrupado por jornada y día y, dentro, por hora. De cada una se dice solo lo
 * bueno (F-27): «Contribuyó a la posición» cuando consolidó. Nunca «rechazada», «no verificada» ni nada
 * parecido: la que no se usa simplemente no lleva marca, y la nota de abajo explica por qué no pasa
 * nada. Las que esperan conexión en el teléfono salen con «Pendiente de enviar» (F-26).
 */
type Fila = {
  clave: string;
  cofradia: string | null;
  nombre: string;
  jornada: string | null;
  etiqueta: string;
  observada: Date;
  contribuyo: boolean;
  pendiente: boolean;
};

const hora = (d: Date) => d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

export function MisAportaciones({ estado }: { estado: EstadoJornada }) {
  const { usuario, disponible, entrar } = useSesion();
  const mias = useMisAportaciones();
  const cofradias = useDato<{ id: string; jornada: string }[]>("/cofradias", { cadaMs: 600_000 });
  const [cola, setCola] = useState<Envio[]>(pendientes);
  useEffect(() => alCambiarCola(() => setCola(pendientes())), []);

  const jornadaDe = new Map((cofradias.datos ?? []).map((c) => [c.id, c.jornada]));
  const filas: Fila[] = [
    ...cola.map((e) => ({
      clave: e.clienteId,
      cofradia: e.cofradia,
      nombre: e.nombre,
      jornada: jornadaDe.get(e.cofradia) ?? null,
      etiqueta: e.etiqueta,
      observada: new Date(e.observada),
      contribuyo: false,
      pendiente: true,
    })),
    ...(mias?.aportaciones ?? [])
      .filter((a) => !cola.some((e) => e.clienteId === a.clienteId))
      .map((a) => ({
        clave: a.id,
        cofradia: a.cofradia,
        nombre: a.nombre ?? "Una cofradía",
        jornada: a.jornada,
        etiqueta: a.etiqueta,
        observada: new Date(a.observada),
        contribuyo: a.contribuyo,
        pendiente: false,
      })),
  ];

  return (
    <PantallaSecundaria
      registro="editorial"
      titulo="Mis aportaciones"
      vuelta={{ etiqueta: "Mi Cofradar", ruta: "/mi-cofradar" }}
      accion={estado.activa ? <DarFe /> : undefined}
    >
      <div className="cf-aportaciones">
        {usuario === null && !cola.length ? (
          <div className="cf-aportaciones-vacio">
            <p>Para dar fe, entra con tu cuenta de Google. Tus aportaciones aparecerán aquí.</p>
            {disponible ? (
              <Boton variante="secundario" onClick={() => void entrar("mi-cofradar")}>
                Entrar con Google
              </Boton>
            ) : null}
          </div>
        ) : usuario && !mias && !cola.length ? (
          <Esqueleto forma="lista" />
        ) : filas.length ? (
          <Grupos filas={filas} />
        ) : (
          <p className="cf-aportaciones-vacio">Tus aportaciones aparecerán aquí cuando des fe.</p>
        )}
        <aside className="cf-aportaciones-como">
          <h2>¿Cómo se usan mis aportaciones?</h2>
          <p>
            Cofradar usa una aportación para situar una cofradía cuando otras personas, por su cuenta, ven lo mismo. Si una no se
            usa, no significa que estuviera mal.
          </p>
        </aside>
      </div>
    </PantallaSecundaria>
  );
}

/**
 * Por jornada y noche, la más reciente arriba; dentro, por orden de hora. La noche empieza a las 6 de la
 * mañana: las 02:40 de la Madrugá van con la Madrugá, no con el día siguiente.
 */
function Grupos({ filas }: { filas: Fila[] }) {
  const noche = (d: Date) => new Date(d.getTime() - 6 * 3_600_000).toDateString();
  const grupos = new Map<string, Fila[]>();
  for (const f of [...filas].sort((a, b) => a.observada.getTime() - b.observada.getTime())) {
    const clave = `${f.jornada ?? ""}|${noche(f.observada)}`;
    grupos.set(clave, [...(grupos.get(clave) ?? []), f]);
  }
  const ordenados = [...grupos.values()].sort((a, b) => b[0]!.observada.getTime() - a[0]!.observada.getTime());
  return (
    <>
      {ordenados.map((g) => {
        const primera = g[0]!;
        const dia = primera.observada.toLocaleDateString("es-ES", { day: "numeric", month: "long" });
        return (
          <section key={`${primera.jornada}|${primera.clave}`} className="cf-aportaciones-grupo">
            <h2>{primera.jornada ? `${primera.jornada} · ${dia}` : dia}</h2>
            <p className="cf-aportaciones-cuenta">
              {g.length === 1 ? "1 aportación" : `${g.length} aportaciones, por orden de hora`}
            </p>
            <ol className="cf-aportaciones-lista">
              {g.map((f) => (
                <li key={f.clave}>
                  <span className="hr cf-num">{hora(f.observada)}</span>
                  <span className="ico" aria-hidden="true">
                    <Icono nombre="darFeNoVerificable" tamano={24} />
                  </span>
                  <span className="que">
                    {f.cofradia ? (
                      <Link className="cf-name" to={`/cofradias/${f.cofradia}`}>
                        {f.nombre}
                      </Link>
                    ) : (
                      <span className="cf-name">{f.nombre}</span>
                    )}
                    <span className="el">{f.etiqueta}</span>
                    {f.contribuyo ? (
                      <span className="marca" data-tipo="contribuyo">
                        <Icono nombre="darFeVerificada" tamano={20} />
                        Contribuyó a la posición
                      </span>
                    ) : null}
                    {f.pendiente ? (
                      <span className="marca" data-tipo="pendiente">
                        <Icono nombre="desactualizado" tamano={20} />
                        Pendiente de enviar
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        );
      })}
    </>
  );
}
