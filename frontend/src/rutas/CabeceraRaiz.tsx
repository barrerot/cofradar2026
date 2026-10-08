import { Boton, Cabecera, Icono } from "../marco";
import type { EstadoJornada } from "../fixture";

/**
 * La cabecera que comparten Inicio y Agenda: selector de ciudad y jornada a
 * la izquierda, buscar a la derecha (§8.2).
 *
 * Vive en rutas/, no en marco/, y eso es a proposito: el marco no debe saber
 * que existe un selector de jornada. Cada ruta compone la suya.
 *
 * El sheet del selector esta en 2-inicio-ahora/11; aqui el boton solo declara
 * aria-haspopup="dialog" como en el export y todavia no abre nada.
 */
export function CabeceraRaiz({ estado }: { estado: EstadoJornada }) {
  return (
    <Cabecera
      sincronizacion={estado.sincronizacion}
      principal={
        <Boton variante="secundario" tamano="36" aria-haspopup="dialog">
          <span>{estado.jornada.nombre}</span>
          <Icono nombre="chevronAbajo" tamano={16} />
        </Boton>
      }
      acciones={
        <Boton variante="terciario" tamano="36">
          <Icono nombre="buscar" tamano={16} />
          <span>Buscar</span>
        </Boton>
      }
    />
  );
}
