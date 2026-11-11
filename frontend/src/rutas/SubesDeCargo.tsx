import { useEffect, useState } from "react";
import { Boton, HojaDecision } from "../marco";
import { apuntarCargoVisto, cargoVisto, pedirCargo, type Cargo, type LineaCasa as Linea } from "../datos/cargo";
import { useSesion } from "../datos/sesion";

/**
 * 23 · «Ahora eres Costalero en Cofradar». Cada vez que cambia `aviso` (has dado fe, has ganado), mira el
 * cargo; si es más alto que el último que se te enseñó en este teléfono, sale la hoja. Sobria: un solo
 * botón, sin confeti ni compartir.
 */
export function SubesDeCargo({ aviso }: { aviso: unknown }) {
  const { usuario } = useSesion();
  const [nuevo, setNuevo] = useState<Cargo | null>(null);
  const id = usuario?.id;
  useEffect(() => {
    if (!id || aviso === null || aviso === undefined) return;
    let vigente = true;
    void pedirCargo().then((c) => {
      if (!vigente || !c) return;
      const visto = cargoVisto(id);
      if (visto === null || c.numero < visto) apuntarCargoVisto(id, c.numero);
      else if (c.numero > visto) setNuevo(c);
    });
    return () => {
      vigente = false;
    };
  }, [id, aviso]);
  const seguir = () => {
    if (id && nuevo) apuntarCargoVisto(id, nuevo.numero);
    setNuevo(null);
  };
  return (
    <HojaDecision
      abierta={!!nuevo}
      titulo={nuevo ? `Ahora eres ${nuevo.nombre} en Cofradar` : ""}
      alCerrar={seguir}
      acciones={
        <Boton variante="primario" tamano="52" onClick={seguir}>
          Seguir
        </Boton>
      }
    >
      <p className="cf-cargo-subes">{nuevo?.frase}</p>
    </HojaDecision>
  );
}

/** 24 · La línea pequeña de la casa, en la partida ganada y en la pregunta del día. */
export function LineaCasa({ linea }: { linea: Linea | undefined }) {
  if (!linea) return null;
  return (
    <p className="cf-cargo-casa">
      {linea.puntos > 0
        ? `+${linea.puntos} ${linea.puntos === 1 ? "punto" : "puntos"} para tu cargo`
        : linea.tope
          ? "Hoy ya has sumado los 10 puntos de la casa. Mañana, más."
          : null}
    </p>
  );
}
