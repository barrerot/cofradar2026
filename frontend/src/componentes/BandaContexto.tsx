import { Boton, Icono } from "../marco";
import type { NombreTrazo } from "../marco";

/**
 * Banda de contexto de jornada: `.cf-band`. Ancho completo.
 *
 * Comunica algo que afecta a TODA la jornada —riesgo de lluvia—, no a una
 * cofradia. Regla dura: no se convierte en alteracion de ninguna cofradia.
 *
 * El criterio para decidir si una banda es critica esta NO DEFINIDO en la
 * ficha; aqui se recibe ya decidido en `critica` y no se infiere del texto.
 */
export function BandaContexto({
  texto,
  icono = "lluvia",
  critica = false,
  onDescartar,
}: {
  texto: string;
  icono?: NombreTrazo;
  /** La critica no se puede descartar: no lleva boton de cierre. */
  critica?: boolean;
  onDescartar?: () => void;
}) {
  const descartable = !critica && onDescartar !== undefined;

  return (
    <div className="cf-band" role="note">
      <Icono nombre={icono} tamano={20} />
      <span className="txt">{texto}</span>
      {descartable ? (
        <Boton variante="terciario" onClick={onDescartar} aria-label="Descartar aviso">
          <Icono nombre="cerrar" tamano={16} />
        </Boton>
      ) : null}
    </div>
  );
}
