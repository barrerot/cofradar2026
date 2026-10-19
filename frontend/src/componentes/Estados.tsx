import type { ReactNode } from "react";
import { Boton, Icono } from "../marco";
import type { Dato } from "../datos/useDato";

/**
 * Los estados comunes a todas las pantallas (§12.2, 0-sistema/estados/).
 *
 * Son componentes DISTINTOS, no un «vacío» genérico: no es lo mismo «no hay
 * nada en la calle» que «no tenemos ese dato» que «necesitas conexión».
 *
 *   1 primera carga           <Esqueleto/>               único caso con esqueleto
 *   2 refrescando             en la cabecera: «actualizando» (IndicadorSincronizacion)
 *   3 nada en la calle        <NadaEnLaCalle/>           tono tranquilo, sin alerta
 *   4 sin datos               <DatoPendiente/>           en el hueco del dato, sin inventar
 *   5 sin conexión con datos  aviso del marco (AvisoSinConexion) + lo guardado
 *   6 sin conexión sin datos  <NecesitaConexion/>
 *   7 sin cartografía         <SinCartografia/>          encima de la lista de posiciones
 *   8 error                   <ErrorCarga/>              sin jerga, con reintento
 *
 * Regla 6: una actualización nunca borra información que todavía sirve. Por
 * eso <SegunDato> solo enseña el error o el «necesitas conexión» cuando no
 * hay nada guardado; si lo hay, enseña lo guardado. Nunca spinners.
 */

/** Primera carga: la forma de lo que va a venir, sin contenido. */
export function Esqueleto({ forma = "inicio" }: { forma?: "inicio" | "lista" }) {
  return (
    <div className="cf-esqueleto" aria-busy="true">
      <span className="cf-oculto-visual" role="status">
        Cargando
      </span>
      {forma === "inicio" ? (
        <>
          <div className="cf-esq cf-esq-banda" />
          <div className="cf-esq cf-esq-titulo" />
          <div className="cf-esq-tarjeta">
            <div className="cf-esq-fila">
              <div className="cf-esq" style={{ width: "6.5rem", height: "1.75rem" }} />
              <div className="cf-esq" style={{ width: "8rem", height: "1.75rem" }} />
            </div>
            <div className="cf-esq" style={{ width: "60%", height: "2.25rem" }} />
            <div className="cf-esq" style={{ width: "66%" }} />
            <hr />
            <div className="cf-esq" style={{ width: "58%" }} />
            <div className="cf-esq" style={{ width: "5.5rem", height: "1.875rem" }} />
            <hr />
            <div className="cf-esq" style={{ width: "62%" }} />
          </div>
          <div className="cf-esq cf-esq-titulo" />
        </>
      ) : null}
      {[0, 1, 2].map((i) => (
        <div key={i} className="cf-esq-renglon">
          <div className="cf-esq-col">
            <div className="cf-esq" style={{ width: "9.5rem" }} />
            <div className="cf-esq" style={{ width: "6rem", height: "1.75rem" }} />
          </div>
          <div className="cf-esq" style={{ width: "5.5rem", height: "1.75rem" }} />
        </div>
      ))}
    </div>
  );
}

/** Sabemos que no hay ninguna en la calle: no es un error ni falta información. */
export function NadaEnLaCalle({ titulo = "Ninguna cofradía en la calle ahora", children }: { titulo?: string; children?: ReactNode }) {
  return (
    <section className="cf-nada">
      <h2 className="cf-nada-titulo">{titulo}</h2>
      {children ? <p className="cf-nada-texto">{children}</p> : null}
    </section>
  );
}

/** En el hueco de un dato que no tenemos (§12.2 `sin-datos`). Nunca un valor inventado. */
export function DatoPendiente() {
  return <span className="cf-dato-pendiente">Dato pendiente</span>;
}

function EstadoCentrado({
  icono,
  titulo,
  texto,
  onReintentar,
  rol,
}: {
  icono: "sinConexion" | "critico";
  titulo: string;
  texto: string;
  onReintentar?: () => void;
  rol: "status" | "alert";
}) {
  return (
    <div className="cf-estado-centrado" role={rol}>
      <Icono nombre={icono} tamano={40} />
      <p className="cf-estado-titulo">{titulo}</p>
      <p className="cf-estado-texto">{texto}</p>
      {onReintentar ? (
        <Boton variante="secundario" onClick={onReintentar}>
          Reintentar
        </Boton>
      ) : null}
    </div>
  );
}

/** Primera vez, sin conexión y sin nada guardado. No es «no hay nada» ni «no tenemos datos». */
export function NecesitaConexion({ onReintentar }: { onReintentar?: () => void }) {
  return (
    <EstadoCentrado
      rol="status"
      icono="sinConexion"
      titulo="Necesitas conexión para verlo la primera vez."
      texto="Cuando vuelva, se cargará solo."
      onReintentar={onReintentar}
    />
  );
}

/** Fallo inesperado: mensaje sencillo, sin jerga y sin culpar a nadie. */
export function ErrorCarga({ onReintentar }: { onReintentar?: () => void }) {
  return (
    <EstadoCentrado
      rol="alert"
      icono="critico"
      titulo="Algo ha fallado."
      texto="Inténtalo de nuevo en un momento."
      onReintentar={onReintentar}
    />
  );
}

/**
 * Los datos están y la base del mapa no. Va encima de las posiciones en lista:
 * Cofradar no sabe dibujar el mapa, pero sí dónde van. Nunca un callejero
 * sustituto ni un lienzo vacío.
 */
export function SinCartografia() {
  return (
    <p className="cf-sin-cartografia" role="status">
      <Icono nombre="sinCartografia" tamano={20} />
      <span>No podemos dibujar el mapa, pero sabemos dónde van.</span>
    </p>
  );
}

/**
 * Elige qué pintar según el estado de un dato de useDato.
 *
 * Con algo guardado se pinta SIEMPRE lo guardado (aunque haya error o falte la
 * conexión): la frescura la cuentan la cabecera y el aviso del marco.
 */
export function SegunDato<T>({
  dato,
  esqueleto = <Esqueleto />,
  children,
}: {
  dato: Dato<T>;
  esqueleto?: ReactNode;
  children: (datos: T) => ReactNode;
}) {
  if (dato.datos !== null) return <>{children(dato.datos)}</>;
  if (dato.estado === "sin-conexion-sin-datos") return <NecesitaConexion onReintentar={dato.reintentar} />;
  if (dato.estado === "error") return <ErrorCarga onReintentar={dato.reintentar} />;
  return <>{esqueleto}</>;
}
