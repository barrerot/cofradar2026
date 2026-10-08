import { Icono } from "../marco";
import type { NombreTrazo } from "../marco";
import { Contorno } from "./Contorno";

/**
 * Chip de estado: `.cf-chip`. Fase de la cofradia + confianza del dato.
 *
 * Es ESTATICO: no es un boton y no lleva accion. Muestra una y solo una de
 * las siete fases canonicas.
 *
 * Las etiquetas salen literales de la ficha del design system
 * (docs/design/pantallas/0-sistema/componentes/ChipEstado.html). No se
 * reescriben ni se inventan sinonimos: «No realiza estacion · segun horario»
 * no existe como fase.
 */
export type Fase =
  | "prevista"
  | "inminente"
  | "en_calle"
  | "proxima_entrada"
  | "finalizada"
  | "cancelada"
  | "no_procesiona";

export type Confianza = "confirmado" | "estimado" | "desactualizado";

const ETIQUETA: Record<Fase, string> = {
  prevista: "Prevista",
  inminente: "Sale pronto",
  en_calle: "En la calle",
  proxima_entrada: "Próxima a entrar",
  finalizada: "Finalizada",
  cancelada: "No realiza estación",
  no_procesiona: "Hoy no procesiona",
};

/**
 * Abreviaturas. La ficha es explicita: SOLO «En calle» esta definida. Para
 * las demas fases no hay abreviatura y por eso no hay entrada aqui: antes que
 * inventarla, el chip crece a dos lineas (lo hace `.cf-card__head > .cf-chip`
 * con `flex-wrap`).
 */
const ABREVIATURA: Partial<Record<Fase, string>> = {
  en_calle: "En calle",
};

const TRAZO: Record<Fase, NombreTrazo> = {
  prevista: "calendario",
  inminente: "inminente",
  en_calle: "enCalle",
  proxima_entrada: "proximaEntrada",
  finalizada: "finalizada",
  cancelada: "interrumpida",
  no_procesiona: "noProcesiona",
};

/**
 * Fases en las que el dato no puede ser otra cosa que confirmado: no se
 * estiman ni caducan porque no describen algo que este ocurriendo.
 */
const SOLO_CONFIRMADO: readonly Fase[] = ["prevista", "cancelada", "no_procesiona"];

export function ChipEstado({
  fase,
  confianza = "confirmado",
  antiguedad,
  tamano,
  abreviar = false,
}: {
  fase: Fase;
  confianza?: Confianza;
  /** Obligatoria con `desactualizado`: «hace 23 min». */
  antiguedad?: string;
  /** `24` es el tamano pequeño; por defecto 28. Son alturas BASE. */
  tamano?: "24";
  /** Cuando no cabe la etiqueta completa. Solo `en_calle` tiene abreviatura. */
  abreviar?: boolean;
}) {
  const efectiva: Confianza = SOLO_CONFIRMADO.includes(fase) ? "confirmado" : confianza;
  const corta = ABREVIATURA[fase];
  const abrevia = abreviar && corta !== undefined;

  return (
    <span
      className="cf-chip"
      data-fase={fase}
      data-confianza={efectiva}
      {...(tamano ? { "data-size": tamano } : {})}
      {...(abrevia ? { "data-abrev": "si" } : {})}
    >
      <Contorno />
      <Icono nombre={TRAZO[fase]} tamano={16} />
      <span className="lab-full">{ETIQUETA[fase]}</span>
      {corta ? (
        <span className="lab-short" aria-hidden="true">
          {corta}
        </span>
      ) : null}
      <ColetillaConfianza confianza={efectiva} antiguedad={antiguedad} />
    </span>
  );
}

/**
 * La confianza NUNCA va solo en el trazo (regla dura de la ficha): el
 * contorno discontinuo se acompana siempre de texto. Y esta coletilla no se
 * abrevia ni se suprime nunca, ni cuando no cabe.
 */
function ColetillaConfianza({
  confianza,
  antiguedad,
}: {
  confianza: Confianza;
  antiguedad?: string;
}) {
  if (confianza === "estimado") {
    return <span className="cf-tail">· según horario</span>;
  }

  if (confianza === "desactualizado") {
    return (
      <span className="cf-tail">
        <Icono nombre="desactualizado" tamano={16} />
        <span className="cf-num">· {antiguedad ?? "sin dato"}</span>
      </span>
    );
  }

  return null;
}
