import { useState } from "react";

/**
 * El escudo de una hermandad (BUL-171), en el círculo del directorio (`cf-escudo`) o de la ficha
 * (`cf-ficha-escudo`). Sin imagen, o si no carga, el escudo de reserva: las iniciales del nombre
 * popular sin artículo, «GP», «ET» (4-cofradias).
 */
export function Escudo({ url, iniciales, className }: { url?: string | null; iniciales: string; className: string }) {
  const [fallo, setFallo] = useState(false);
  const imagen = url && !fallo;
  return (
    <span className={className} data-imagen={imagen ? "si" : undefined} aria-hidden="true">
      {imagen ? <img src={url} alt="" loading="lazy" decoding="async" onError={() => setFallo(true)} /> : iniciales}
    </span>
  );
}
