import { LineaCirio } from "./PreguntaDelDia";
import { useCuadrillas, type ResumenCuadrilla } from "../datos/cuadrillas";
import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { AvisoEntrada } from "../componentes";
import { Boton, Cabecera, Icono, Marco, type NombreTrazo } from "../marco";
import { useMisAportaciones } from "../datos/puntos";
import { grados, useAlbum, type Album } from "../datos/album";
import { useCargo } from "../datos/cargo";
import { mesDe, useHermano, type Hermano } from "../datos/hermano";
import { miles } from "../datos/trivialOnline";
import { useRelaciones } from "../datos/relaciones";
import { useSesion } from "../datos/sesion";
import type { EstadoJornada } from "../fixture";
import { DarFe } from "./DarFe";
import { FilaTuSemanaSanta } from "./TuSemanaSanta";
import { SelectorJornada } from "./SelectorJornada";
import { TarjetaCargo } from "./Cargo";
import { Estampa } from "./Estampa";

/**
 * P-19 Mi Cofradar · la capa personal (7-mi-cofradar/portada-*), registro
 * editorial.
 *
 *   Progreso     tus puntos y tu cargo de hermandad «en Cofradar» (BUL-219,
 *                F-58), con lo que falta para el siguiente y lo que viene de la
 *                calle y de la casa (12-ano-cofrade/16). Lleva a «Tu cargo».
 *                Sin cuenta o sin ningún punto, «Empiezas a sumar puntos cuando
 *                das fe» (portada-B): nunca una cifra inventada.
 *   Lo tuyo      Seguidas, Mi colección, Álbum de estampas (F-56), Mis
 *                aportaciones y Cuadrillas. Con cuenta, con sus
 *                cifras. Sin cuenta no hay nada guardado (decisión del
 *                20/10/2026: lo personal es de la cuenta y no se guarda «solo
 *                en este teléfono»), así que se invita a entrar con Google, como
 *                botón secundario y no como barrera: Ajustes y Ayuda siguen ahí.
 *   Carnet       con cuenta, lo de arriba va en un carnet con orla granate (repaso visual,
 *                13/11/2026): tu progreso y tu número, y tres de tus estampas del álbum
 *                en pequeño, con el enlace al álbum. Sin estampas, sin tira: nunca «te falta».
 *   Trivial      el juego de preguntas para las esperas (F-50, 10-trivial/
 *                trivial-01): sin cuenta y sin puntos, así que no es «lo tuyo»
 *                y su icono no va en granate.
 *   Más          Cuenta (con sesión), Ajustes y Ayuda y fuentes.
 */
export function MiCofradar({ estado }: { estado: EstadoJornada }) {
  const { usuario, disponible, entrar } = useSesion();
  const relaciones = useRelaciones();
  const mias = useMisAportaciones();
  const { cargo } = useCargo();
  const { album } = useAlbum();
  const hermano = useHermano();
  const con = !!usuario;
  const { datos: cuadrillas } = useCuadrillas<{ cuadrillas: ResumenCuadrilla[] }>(con ? "" : null);
  const eliminada = (useLocation().state as { cuentaEliminada?: boolean } | null)?.cuentaEliminada;

  // Solo cuenta lo que ya ha llegado del servidor: nunca un 0 que no es
  const cifra = (n: number) => (con && relaciones.listas ? String(n) : undefined);

  return (
    <Marco
      registro="editorial"
      cabecera={<Cabecera principal={<SelectorJornada />} titulo="Mi Cofradar" />}
      accion={estado.activa ? <DarFe /> : undefined}
    >
      <div className="cf-mi">
        <AvisoEntrada motivo="mi-cofradar" />
        {eliminada && !con ? (
          <div className="cf-aviso-entrada" role="status">
            <Icono nombre="informativo" tamano={20} />
            <p>Tu cuenta se ha eliminado.</p>
          </div>
        ) : null}

        {(() => {
          const progreso =
            cargo && cargo.puntos > 0 ? (
              <TarjetaCargo cargo={cargo} hermano={hermano} />
            ) : (
              <>
                {hermano ? <NumeroHermano h={hermano} /> : null}
                <LineaCirio />
                <p className="cf-mi-progreso">
                  <Icono nombre="darFeNoVerificable" tamano={24} />
                  <span>Empiezas a sumar puntos cuando das fe.</span>
                </p>
              </>
            );
          return con ? (
            <section className="cf-mi-carnet" aria-label="Tu carnet">
              <span className="cf-orla" aria-hidden="true" />
              {progreso}
              {album ? <TusEstampas album={album} /> : null}
            </section>
          ) : (
            progreso
          );
        })()}

        <FilaTuSemanaSanta />

        <nav className="cf-mi-grupo" aria-label="Lo tuyo">
          <Fila icono="seguida" marca a="/mi-cofradar/seguidas" valor={cifra(relaciones.seguidas)}>
            Seguidas
          </Fila>
          <Fila icono="vista" marca a="/mi-cofradar/coleccion" valor={cifra(relaciones.coleccion)}>
            Mi colección
          </Fila>
          {con && !(album && conEstampas(album).length > 0) ? (
            <Fila icono="album" marca a="/mi-cofradar/album" valor={album ? String(album.estampas) : undefined}>
              Álbum de estampas
            </Fila>
          ) : null}
          <Fila
            icono={mias?.aportaciones.length ? "darFeVerificada" : "darFeNoVerificable"}
            marca={!!mias?.aportaciones.length}
            a="/mi-cofradar/aportaciones"
            valor={mias?.aportaciones.length ? String(mias.aportaciones.length) : undefined}
            nota={mias?.aportaciones.length ? undefined : "Tus aportaciones aparecerán aquí cuando des fe."}
          >
            Mis aportaciones
          </Fila>
          {con ? (
            <Fila icono="cuadrilla" marca a="/mi-cofradar/cuadrillas" valor={cuadrillas ? String(cuadrillas.cuadrillas.length) : undefined}>
              Cuadrillas
            </Fila>
          ) : null}
        </nav>

        {!con && disponible && usuario !== undefined ? (
          <div className="cf-mi-entrar">
            <p>Entra con tu cuenta de Google para seguir cofradías y guardar las que ves. Las tendrás en cualquier teléfono.</p>
            <Boton variante="secundario" onClick={() => void entrar("mi-cofradar")}>
              Entrar con Google
            </Boton>
          </div>
        ) : null}

        <nav className="cf-mi-grupo" aria-label="Trivial">
          <Fila icono="trivial" a="/mi-cofradar/trivial" nota="Preguntas sobre las 72 hermandades para las esperas">
            Trivial cofrade
          </Fila>
        </nav>

        <nav className="cf-mi-grupo" aria-label="Más">
          {con ? (
            <Fila icono="usuario" a="/mi-cofradar/cuenta" nota={usuario.email}>
              Cuenta
            </Fila>
          ) : null}
          <Fila icono="ajustes" a="/mi-cofradar/ajustes">
            Ajustes
          </Fila>
          <Fila icono="ayuda" a="/mi-cofradar/ayuda">
            Ayuda y fuentes
          </Fila>
        </nav>
      </div>
    </Marco>
  );
}

/** Las estampas que tienes, las más completas primero (sin orden de llegada: el álbum no lo guarda). */
const conEstampas = (album: Album) =>
  album.jornadas
    .flatMap((j) => j.estampas.map((e) => ({ e, jornada: j.nombre })))
    .filter(({ e }) => grados(e) > 0)
    .sort((a, b) => grados(b.e) - grados(a.e));

/** Tres de tus estampas en pequeño y el enlace al álbum. Sin ninguna, nada: el álbum sigue en su fila. */
function TusEstampas({ album }: { album: Album }) {
  const tuyas = conEstampas(album).slice(0, 3);
  if (tuyas.length === 0) return null;
  return (
    <div className="cf-mi-estampas">
      <p className="rotulo">Tus estampas</p>
      <div className="tira">
        {tuyas.map(({ e, jornada }) => (
          <Estampa key={e.cofradia} e={e} jornada={jornada} />
        ))}
      </div>
      <Link className="abrir" to="/mi-cofradar/album">
        Abrir el álbum · <span className="cf-num">{album.estampas}</span> {album.estampas === 1 ? "estampa" : "estampas"}
        <Icono nombre="chevronDerecha" tamano={20} />
      </Link>
    </div>
  );
}

/** F-54 (11-trivial-online/21a): «Hermano nº 214 de Cofradar · desde noviembre de 2026». */
function NumeroHermano({ h }: { h: Hermano }) {
  return (
    <p className="cf-mi-hermano">
      Hermano nº <span className="cf-num">{miles(h.numero)}</span> de Cofradar · desde {mesDe(h.desde)}
    </p>
  );
}

function Fila({
  icono,
  marca = false,
  a,
  valor,
  nota,
  children,
}: {
  icono: NombreTrazo;
  /** Icono en el granate de las marcas de relación (seguida, vista). */
  marca?: boolean;
  a: string;
  valor?: string;
  nota?: string;
  children: ReactNode;
}) {
  return (
    <Link className="cf-mi-fila" to={a}>
      <span className="cf-mi-icono" data-marca={marca ? "" : undefined}>
        <Icono nombre={icono} tamano={24} />
      </span>
      <span className="cf-mi-texto">
        <span className="cf-mi-nombre">{children}</span>
        {nota ? <span className="cf-mi-nota">{nota}</span> : null}
      </span>
      {valor !== undefined ? <span className="cf-mi-valor cf-num">{valor}</span> : <span />}
      <Icono nombre="chevronDerecha" tamano={20} />
    </Link>
  );
}
