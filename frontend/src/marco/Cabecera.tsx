import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { IndicadorSincronizacion } from "./IndicadorSincronizacion";

/**
 * La cabecera es una ZONA del marco, no un componente (§8.2, regla dura).
 *
 * Lo que decide el marco: donde cae (pegada arriba, con su area segura y su
 * z-sticky) y que lleva siempre (la ultima sincronizacion, §7.3, que lee del
 * estado global de datos/sincronizacion).
 *
 * Lo que decide cada ruta: todo lo demas. Y por eso esta zona solo conoce
 * POSICIONES, nunca contenidos: no sabe que existe un selector de ciudad, ni
 * uno de dia, ni los filtros del mapa. Recibe nodos y los coloca.
 *
 *   principal    izquierda, crece hasta comerse el espacio libre
 *   acciones     a la derecha de la sincronizacion
 *   titulo       fila propia completa, en serif (pantalla secundaria)
 *   secundaria   fila propia completa (campo de busqueda, selector de dia…)
 *   terciaria    otra fila propia completa (filtros)
 *
 * `terciaria` la trae Cofradias, que necesita tres filas: titulo, campo de
 * busqueda y filtros. Sigue sin saber QUE va dentro: solo que hay otra fila.
 *
 * La marca (22/10/2026): el simbolo de Cofradar a la izquierda, enlazado a
 * Inicio, para que se sepa donde se esta entre por donde se entre. Solo en
 * movil: a partir de lg la lleva el rail (marco.css). Las pantallas
 * secundarias la quitan: su izquierda es la vuelta.
 *
 * Si algun dia hiciera falta una sexta posicion, se anade aqui. Lo que no se
 * hace es que esta zona sepa que va dentro.
 */
export function Cabecera({
  principal,
  acciones,
  titulo,
  secundaria,
  terciaria,
  etiqueta = "Cabecera",
  marca = true,
}: {
  principal?: ReactNode;
  acciones?: ReactNode;
  titulo?: ReactNode;
  secundaria?: ReactNode;
  terciaria?: ReactNode;
  /** aria-label de la zona. La secundaria usa el suyo. */
  etiqueta?: string;
  /** El simbolo de Cofradar a la izquierda. */
  marca?: boolean;
}) {
  return (
    <header className="cf-marco-cabecera" aria-label={etiqueta}>
      {marca ? (
        <Link to="/" className="cf-marco-marca" aria-label="Cofradar, ir a Inicio">
          <Logo variante="simbolo" alto={26} />
        </Link>
      ) : null}
      <span className="cf-marco-cabecera-slot">{principal}</span>
      <IndicadorSincronizacion />
      {acciones}
      {titulo ? <h1 className="cf-marco-titulo">{titulo}</h1> : null}
      {secundaria ? <div className="cf-marco-cabecera-fila">{secundaria}</div> : null}
      {terciaria ? <div className="cf-marco-cabecera-fila">{terciaria}</div> : null}
    </header>
  );
}
