/**
 * Componentes de contenido del design system.
 *
 * Son envoltorios finos de las clases de bundle.css: traducen props a los
 * atributos de datos que el sistema ya entiende y no anaden ni una regla de
 * estilo propia. Lo unico que es nuestro es la composicion de pantalla, que
 * vive en estilos/inicio.css.
 *
 * El marco (zonas, navegacion, sheet, boton, icono) vive en ../marco.
 */
export { Aviso, type Procedencia, type TipoAviso } from "./Aviso";
export { AvisoEntrada } from "./AvisoEntrada";
export { BandaContexto } from "./BandaContexto";
export { Bloque } from "./Bloque";
export {
  Alteraciones,
  ChipAlteracion,
  porGravedad,
  type Alteracion,
  type DatoAlteracion,
} from "./ChipAlteracion";
export { ChipEstado, type Confianza, type Fase } from "./ChipEstado";
export {
  DatoPendiente,
  ErrorCarga,
  Esqueleto,
  NadaEnLaCalle,
  NecesitaConexion,
  SegunDato,
  SinCartografia,
} from "./Estados";
export { Contorno } from "./Contorno";
export {
  HuecoRelacion,
  MarcaRelacion,
  type Relacion,
  type Verificacion,
} from "./MarcaRelacion";
export { Novedades, type Novedad, type ParteNovedad } from "./Novedades";
export { TarjetaCofradia, type DatosCofradia, type Densidad } from "./TarjetaCofradia";
