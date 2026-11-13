/**
 * La cabecera de jornada (repaso visual de Claude Design, 13/11/2026): antetítulo con el día y la fecha,
 * el nombre en Newsreader y la orla doble en tinta, como en un programa de mano. «Domingo · 21 de marzo».
 */
export function CabeceraJornada({ id, nombre, dia }: { id?: string; nombre: string; dia?: string | null }) {
  const fecha = dia ? new Date(`${dia}T12:00`) : null;
  const ante = fecha
    ? `${fecha.toLocaleDateString("es-ES", { weekday: "long" })} · ${fecha.toLocaleDateString("es-ES", { day: "numeric", month: "long" })}`
    : null;
  return (
    <div className="cf-cabecera-jornada">
      {ante ? <span className="ante">{ante}</span> : null}
      <h2 id={id}>{nombre}</h2>
      <span className="cf-orla" aria-hidden="true" />
    </div>
  );
}
