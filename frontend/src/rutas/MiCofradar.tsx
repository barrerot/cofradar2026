import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { AvisoEntrada } from "../componentes";
import { Boton, Cabecera, Icono, Marco, type NombreTrazo } from "../marco";
import { nivelDe, useMisAportaciones } from "../datos/puntos";
import { useRelaciones } from "../datos/relaciones";
import { useSesion } from "../datos/sesion";
import type { EstadoJornada } from "../fixture";
import { DarFe } from "./DarFe";
import { SelectorJornada } from "./SelectorJornada";

/**
 * P-19 Mi Cofradar · la capa personal (7-mi-cofradar/portada-*), registro
 * editorial.
 *
 *   Progreso     tus puntos (base y bonus de «Dar fe») y tu nivel, que es un
 *                cargo de hermandad «en Cofradar» (BUL-219), con lo que falta
 *                para el siguiente (portada-A). Sin cuenta o sin ninguna
 *                aportación, «Empiezas a sumar puntos cuando das fe»
 *                (portada-B): nunca una cifra inventada.
 *   Lo tuyo      Seguidas, Mi colección y Mis aportaciones. Con cuenta, con sus
 *                cifras. Sin cuenta no hay nada guardado (decisión del
 *                20/10/2026: lo personal es de la cuenta y no se guarda «solo
 *                en este teléfono»), así que se invita a entrar con Google, como
 *                botón secundario y no como barrera: Ajustes y Ayuda siguen ahí.
 *   Más          Cuenta (con sesión), Ajustes y Ayuda y fuentes.
 */
export function MiCofradar({ estado }: { estado: EstadoJornada }) {
  const { usuario, disponible, entrar } = useSesion();
  const relaciones = useRelaciones();
  const mias = useMisAportaciones();
  const con = !!usuario;
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

        {mias && mias.aportaciones.length ? (
          <Progreso puntos={mias.puntos} />
        ) : (
          <p className="cf-mi-progreso">
            <Icono nombre="darFeNoVerificable" tamano={24} />
            <span>Empiezas a sumar puntos cuando das fe.</span>
          </p>
        )}

        <nav className="cf-mi-grupo" aria-label="Lo tuyo">
          <Fila icono="seguida" marca a="/mi-cofradar/seguidas" valor={cifra(relaciones.seguidas)}>
            Seguidas
          </Fila>
          <Fila icono="vista" marca a="/mi-cofradar/coleccion" valor={cifra(relaciones.coleccion)}>
            Mi colección
          </Fila>
          <Fila
            icono={mias?.aportaciones.length ? "darFeVerificada" : "darFeNoVerificable"}
            marca={!!mias?.aportaciones.length}
            a="/mi-cofradar/aportaciones"
            valor={mias?.aportaciones.length ? String(mias.aportaciones.length) : undefined}
            nota={mias?.aportaciones.length ? undefined : "Tus aportaciones aparecerán aquí cuando des fe."}
          >
            Mis aportaciones
          </Fila>
        </nav>

        {!con && disponible && usuario !== undefined ? (
          <div className="cf-mi-entrar">
            <p>Entra con tu cuenta de Google para seguir cofradías y guardar las que ves. Las tendrás en cualquier teléfono.</p>
            <Boton variante="secundario" onClick={() => void entrar("mi-cofradar")}>
              Entrar con Google
            </Boton>
          </div>
        ) : null}

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

/** «Tu progreso»: los puntos, el nivel y la barra hasta el siguiente. Granate: es lo tuyo. */
function Progreso({ puntos }: { puntos: number }) {
  const n = nivelDe(puntos);
  const pc = n.siguiente ? Math.round((100 * (puntos - n.desde)) / (n.siguiente.desde - n.desde)) : 100;
  return (
    <section className="cf-mi-progreso cf-mi-nivel" aria-label="Tu progreso">
      <p className="rotulo">Tu progreso</p>
      <p className="puntos">
        <span className="cf-num">{String(puntos).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}</span> puntos
      </p>
      <p className="nivel">
        {n.nombre} <span className="en">en Cofradar</span>
      </p>
      {n.siguiente ? (
        <>
          <div className="barra" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pc} aria-label={`Hacia ${n.siguiente.nombre}`}>
            <span style={{ width: `${pc}%` }} />
          </div>
          <p className="hacia">
            <span>Hacia {n.siguiente.nombre}</span>
            <span className="cf-num">Faltan {n.siguiente.faltan}</span>
          </p>
        </>
      ) : (
        <p className="hacia">Has llegado al último nivel.</p>
      )}
    </section>
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
