/**
 * ANDAMIAJE · el equivalente de la clase .rl del export.
 *
 * Dice que zona es y nada mas. Se borra cuando la pantalla exista de verdad.
 */
export function Relleno({ children }: { children: string }) {
  return <div className="cf-relleno">{children}</div>;
}
