import type { ReactNode } from "react";
import { Boton } from "../marco";
import { Alteraciones, type DatoAlteracion } from "./ChipAlteracion";
import { ChipEstado, type Confianza, type Fase } from "./ChipEstado";
import {
  HuecoRelacion,
  MarcaRelacion,
  type Relacion,
  type Verificacion,
} from "./MarcaRelacion";

/**
 * Tarjeta de cofradia: `.cf-card`.
 *
 * Doble ancla —nombre a la izquierda, estado a la derecha— y la linea de
 * decision: proximo punto relevante + hora. Sin fotografia.
 *
 * El chip va SIEMPRE arriba a la derecha, en el mismo punto, para que al
 * recorrer una lista el estado se lea en vertical sin perseguirlo.
 */
export type Densidad = "compacta" | "estandar" | "expandida";

export type DatosCofradia = {
  id: string;
  nombre: string;
  /**
   * OPCIONAL. Sin fase no se dibuja chip, y eso solo pasa en el directorio
   * de Cofradias FUERA DE TEMPORADA: no hay ningun estado operativo que
   * contar, y un chip diciendo «Prevista» setenta veces seria ruido con
   * forma de dato. Dentro de jornada la fase existe siempre.
   */
  fase?: Fase;
  confianza?: Confianza;
  /** Obligatoria con `desactualizado`: «hace 23 min». */
  antiguedad?: string;
  /** Tu relacion con ella, si hay alguna. */
  relacion?: Relacion;
  verificacion?: Verificacion;
  alteraciones?: readonly DatoAlteracion[];
  /**
   * Linea de decision: el proximo punto relevante y su hora.
   *
   * OPCIONALES. En Inicio y en el mapa son el dato protagonista (§9.4), pero
   * en el DIRECTORIO de Cofradias no existen: alli la pregunta no es «¿que
   * puedo ver ahora?» sino «¿cual es esta?», y un punto y una hora serian
   * datos de jornada en una pantalla que vive todo el ano. Sin ellos la linea
   * no se pinta.
   */
  punto?: string;
  hora?: string;
  /** La hora estimada se marca con «≈». La confirmada va limpia. */
  horaEstimada?: boolean;
  /**
   * Solo si hay ubicacion. Sin ubicacion NO se renderiza nada: ni aviso, ni
   * hueco, ni invitacion a conceder permisos.
   */
  proximidad?: string;
  /**
   * Escudo de reserva del directorio (4-cofradias): las iniciales del nombre
   * popular sin artículo, «GP», «ET». Mientras no haya escudos de verdad.
   */
  iniciales?: string;
};

/**
 * Fases en las que «Dar fe» tiene sentido.
 *
 * `inminente` esta NO DEFINIDO en la ficha, y lo no definido no se inventa:
 * no se dibuja. Las demas —prevista, finalizada, cancelada, no_procesiona—
 * no llevan accion por definicion.
 */
const ADMITE_DAR_FE: readonly Fase[] = ["en_calle", "proxima_entrada"];

export function TarjetaCofradia({
  cofradia,
  densidad = "compacta",
  onDarFe,
  nombreResaltado,
}: {
  cofradia: DatosCofradia;
  densidad?: Densidad;
  onDarFe?: (id: string) => void;
  /**
   * El nombre con la coincidencia de busqueda marcada. Es PRESENTACION: el
   * dato sigue siendo `cofradia.nombre`, que es el que se busca, se ordena y
   * leen los lectores de pantalla. Solo lo usa el directorio (§R-13).
   */
  nombreResaltado?: ReactNode;
}) {
  const {
    id,
    nombre,
    fase,
    confianza,
    antiguedad,
    relacion,
    verificacion,
    alteraciones = [],
    punto,
    hora,
    horaEstimada = false,
    proximidad,
    iniciales,
  } = cofradia;

  /* Compacta = nombre + estado + una linea de datos. Proximidad y accion solo
     desde estandar: son lo que convierte el dato en un juicio de alcance. */
  const detallada = densidad !== "compacta";
  const accion =
    detallada &&
    fase !== undefined &&
    ADMITE_DAR_FE.includes(fase) &&
    onDarFe !== undefined;

  return (
    <article className="cf-card" data-densidad={densidad}>
      <div className="cf-card__head">
        <div className="cf-ident">
          {iniciales ? (
            <span className="cf-escudo" aria-hidden="true">
              {iniciales}
            </span>
          ) : null}
          {/* El hueco existe siempre, con marca o sin ella: es lo que alinea
              los nombres de toda la lista. */}
          <HuecoRelacion>
            {relacion ? (
              <MarcaRelacion relacion={relacion} verificacion={verificacion} />
            ) : null}
          </HuecoRelacion>
          <h3 className="cf-name">{nombreResaltado ?? nombre}</h3>
        </div>

        {fase === undefined ? null : (
          <ChipEstado
            fase={fase}
            confianza={confianza}
            antiguedad={antiguedad}
            tamano={densidad === "compacta" ? "24" : undefined}
            /* Se abrevia «En la calle» → «En calle» SOLO cuando el chip lleva
             coletilla de confianza y necesita el sitio. Sin coletilla cabe
             entero, y el export lo escribe entero: abreviar siempre deja la
             lista hablando como un telegrama sin motivo. */
            abreviar={
              densidad === "compacta" &&
              (confianza === "estimado" || confianza === "desactualizado")
            }
          />
        )}
      </div>

      <Alteraciones
        alteraciones={alteraciones}
        densidad={densidad}
        confianza={confianza}
      />

      {punto !== undefined && hora !== undefined ? (
        <div className="cf-decision">
          <span className="pt">{punto}</span>
          <span className="hr">
            {horaEstimada ? "≈ " : ""}
            {hora}
          </span>
        </div>
      ) : null}

      {detallada && proximidad ? (
        <div className="cf-prox">{proximidad}</div>
      ) : null}

      {accion ? (
        <div className="cf-card__actions">
          <Boton variante="primario" onClick={() => onDarFe(id)}>
            <span>Dar fe</span>
          </Boton>
        </div>
      ) : null}
    </article>
  );
}
