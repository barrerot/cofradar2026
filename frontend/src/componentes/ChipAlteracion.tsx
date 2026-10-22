import { Icono } from "../marco";
import type { NombreTrazo } from "../marco";
import { Contorno } from "./Contorno";

/**
 * Chip de alteracion: `.cf-alt`. Se superpone a la fase, no la sustituye.
 *
 * Etiquetas literales de la ficha
 * (docs/design/pantallas/0-sistema/componentes/ChipAlteracion.html).
 */
export type Alteracion =
  | "incidencia"
  | "interrumpida"
  | "regreso_anticipado"
  | "cambio_recorrido"
  | "retraso"
  | "adelanto";

const ETIQUETA: Record<Alteracion, string> = {
  incidencia: "Incidencia",
  interrumpida: "Interrumpida",
  regreso_anticipado: "Regreso anticipado",
  cambio_recorrido: "Cambio de recorrido",
  retraso: "Retraso",
  adelanto: "Adelanto",
};

const TRAZO: Record<Alteracion, NombreTrazo> = {
  incidencia: "critico",
  interrumpida: "interrumpida",
  regreso_anticipado: "regresoAnticipado",
  cambio_recorrido: "cambioRecorrido",
  retraso: "retraso",
  adelanto: "adelanto",
};

/**
 * Gravedad, de mayor a menor, tal como la fija la ficha:
 *   incidencia / interrumpida / regreso anticipado
 *     > cambio de recorrido
 *       > retraso / adelanto
 *
 * Los empates conservan el orden en que llegan.
 */
const GRAVEDAD: Record<Alteracion, number> = {
  incidencia: 0,
  interrumpida: 0,
  regreso_anticipado: 0,
  cambio_recorrido: 1,
  retraso: 2,
  adelanto: 2,
};

export type DatoAlteracion = {
  tipo: Alteracion;
  /**
   * Minutos, solo para retraso y adelanto. Positivo siempre: el signo lo pone
   * el tipo —`+` el retraso, `−` (menos tipografico, U+2212) el adelanto—.
   */
  minutos?: number;
};

/** Ordena por gravedad sin mutar la entrada. El orden es estable. */
export function porGravedad(alteraciones: readonly DatoAlteracion[]): DatoAlteracion[] {
  return [...alteraciones].sort((a, b) => GRAVEDAD[a.tipo] - GRAVEDAD[b.tipo]);
}

export function ChipAlteracion({
  alteracion,
  confianza = "confirmado",
  resto,
}: {
  alteracion: DatoAlteracion;
  confianza?: "confirmado" | "estimado" | "desactualizado";
  /** En compacta: cuantas alteraciones mas hay. Se pinta como «+N». */
  resto?: number;
}) {
  const { tipo, minutos } = alteracion;
  const cifra =
    minutos === undefined ? null : `${tipo === "adelanto" ? "−" : "+"}${minutos} min`;

  return (
    <span className="cf-alt" data-alteracion={tipo} data-confianza={confianza}>
      <Contorno />
      <Icono nombre={TRAZO[tipo]} tamano={16} />
      <span>
        {ETIQUETA[tipo]}
        {cifra ? <> <span className="cf-num">{cifra}</span></> : null}
      </span>
      {resto ? <span className="cf-more">+{resto}</span> : null}
    </span>
  );
}

/**
 * La tira de alteraciones de una tarjeta: `.cf-alts`.
 *
 * Regla dura: una alteracion NUNCA se oculta por falta de espacio. En
 * densidad compacta no se recorta la lista en silencio: se muestra la mas
 * grave y el resto se cuenta en «+N», que es informacion, no truncamiento.
 */
export function Alteraciones({
  alteraciones,
  densidad,
  confianza,
}: {
  alteraciones: readonly DatoAlteracion[];
  densidad: "compacta" | "estandar" | "expandida";
  confianza?: "confirmado" | "estimado" | "desactualizado";
}) {
  if (alteraciones.length === 0) return null;

  const ordenadas = porGravedad(alteraciones);
  const compacta = densidad === "compacta";
  const visibles = compacta ? ordenadas.slice(0, 1) : ordenadas;
  const resto = compacta ? ordenadas.length - 1 : 0;

  return (
    <div className="cf-alts">
      {visibles.map((a) => (
        <ChipAlteracion
          key={a.tipo}
          alteracion={a}
          /* La incidencia la publica el equipo: nunca es una estimación */
          confianza={a.tipo === "incidencia" ? "confirmado" : confianza}
          resto={resto || undefined}
        />
      ))}
    </div>
  );
}
