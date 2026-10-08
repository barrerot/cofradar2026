import { NavLink } from "react-router-dom";
import { DESTINOS, RELLENO_EN_DESTINO_ACTIVO, type Destino } from "./destinos";
import { Icono } from "./Icono";

/**
 * Navegacion principal (§9.11, §8.2).
 *
 * Dos anclajes del MISMO componente, como pide §8.4: barra inferior en movil
 * y rail lateral a partir de `lg`. No se crean componentes de escritorio: lo
 * unico que cambia es la clase que consume del design system.
 *
 * La barra no se oculta al hacer scroll. Eso no se implementa con JavaScript:
 * el marco la deja fuera del contenedor que scrollea, asi que no puede
 * ocultarse.
 */
export function NavegacionPrincipal({ anclaje = "barra" }: { anclaje?: "barra" | "rail" }) {
  return (
    <nav className={anclaje === "rail" ? "cf-rail" : "cf-nav"} aria-label="Principal">
      {DESTINOS.map((destino) => (
        <Enlace key={destino.id} destino={destino} />
      ))}
    </nav>
  );
}

function Enlace({ destino }: { destino: Destino }) {
  return (
    <NavLink
      to={destino.ruta}
      end={destino.ruta === "/"}
      // NavLink anade una clase "active" por defecto. El sistema marca estados
      // con atributos, no con clases: aria-current (que NavLink pone solo) es
      // el gancho que usa .cf-nav. Devolvemos undefined para no meter ruido.
      className={() => undefined}
    >
      {({ isActive }) => (
        <>
          <Icono
            nombre={
              isActive && RELLENO_EN_DESTINO_ACTIVO && destino.iconoActivo
                ? destino.iconoActivo
                : destino.icono
            }
          />
          <span>{destino.etiqueta}</span>
        </>
      )}
    </NavLink>
  );
}
