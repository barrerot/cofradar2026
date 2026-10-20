import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { AvisoEntrada } from "../componentes";
import { Boton, Cabecera, Icono, Marco, type NombreTrazo } from "../marco";
import { useRelaciones } from "../datos/relaciones";
import { useSesion } from "../datos/sesion";
import type { EstadoJornada } from "../fixture";
import { DarFe } from "./DarFe";
import { SelectorJornada } from "./SelectorJornada";

/**
 * P-19 Mi Cofradar · la capa personal (7-mi-cofradar/portada-*), registro
 * editorial.
 *
 *   Progreso     los puntos y el nivel llegan con la fase 4 (BUL-219). Hasta
 *                entonces, para todos, «Empiezas a sumar puntos cuando das fe»
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
  const con = !!usuario;

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

        <p className="cf-mi-progreso">
          <Icono nombre="darFeNoVerificable" tamano={24} />
          <span>Empiezas a sumar puntos cuando das fe.</span>
        </p>

        <nav className="cf-mi-grupo" aria-label="Lo tuyo">
          <Fila icono="seguida" marca a="/mi-cofradar/seguidas" valor={cifra(relaciones.seguidas)}>
            Seguidas
          </Fila>
          <Fila icono="vista" marca a="/mi-cofradar/coleccion" valor={cifra(relaciones.coleccion)}>
            Mi colección
          </Fila>
          <Fila icono="darFeNoVerificable" a="/mi-cofradar/aportaciones" nota="Tus aportaciones aparecerán aquí cuando des fe.">
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
