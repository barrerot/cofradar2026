import {
  Aviso,
  BandaContexto,
  Bloque,
  MarcaRelacion,
  Novedades,
  TarjetaCofradia,
} from "../componentes";
import type { DatosCofradia } from "../componentes";
import { Boton, Icono, Marco } from "../marco";
import type { EstadoJornada } from "../fixture";
import {
  leerContenidoInicio,
  type InicioActivo,
  type InicioFueraDeTemporada,
  type InicioSinActividad,
} from "../fixture-inicio";
import { CabeceraRaiz } from "./CabeceraRaiz";
import { DarFe } from "./DarFe";

/**
 * Inicio · «¿Que puedo ver ahora?»
 *
 * Tres intensidades que NO son grados de lo mismo (§8.3): cambian que se
 * muestra y si hay accion. La franja de «Dar fe» solo existe en la activa,
 * porque en las otras dos no hay de que dar fe.
 */
export function Inicio({ estado }: { estado: EstadoJornada }) {
  const contenido = leerContenidoInicio({
    intensidad: estado.intensidad,
    ubicacion: estado.ubicacion,
    cuenta: estado.cuenta,
  });

  return (
    <Marco
      cabecera={<CabeceraRaiz />}
      accion={estado.activa ? <DarFe /> : undefined}
    >
      {contenido.intensidad === "activa" ? (
        <JornadaActiva contenido={contenido} />
      ) : contenido.intensidad === "sin-actividad" ? (
        <SinActividad contenido={contenido} />
      ) : (
        <FueraDeTemporada contenido={contenido} />
      )}
    </Marco>
  );
}

/**
 * Jornada en curso.
 *
 * El orden de los bloques no es estetico: va de mas a menos cuanto cambia esa
 * informacion lo que vas a hacer en los proximos minutos.
 *
 *   Incidencias        lo que se ha roto      ← un critico NUNCA queda por
 *   Cerca              lo que puedes alcanzar    debajo de algo que no lo es
 *   En la calle        lo que esta ocurriendo
 *   A punto de ocurrir lo que va a empezar
 *   Mientras no estabas  lo que te perdiste   ← transitorio, va al final
 *
 * Reglas del area que esto implementa:
 *   · Una cofradia aparece UNA sola vez; sus alteraciones viajan en su chip.
 *     El bloque de incidencias lleva AVISOS, que pueden referirse a una
 *     cofradia pero no son su tarjeta.
 *   · `finalizada` no aparece aqui: vive en Agenda.
 *   · Un bloque vacio no se pinta —ni encabezado, ni hueco, ni mensaje—.
 *   · UNA tarjeta es el sujeto de la pantalla; el resto, compactas.
 *   · Sin «destacados», sin «para ti» y sin llamadas a contribuir.
 *
 * «Dar fe» NO viaja en la tarjeta: vive solo en la franja de accion. Dos
 * primarios identicos en la misma pantalla aplanan la jerarquia y reparten
 * la atencion.
 */
function JornadaActiva({ contenido }: { contenido: InicioActivo }) {
  /* El sujeto es la PRIMERA cofradia del PRIMER bloque que tenga alguna, no
     «la primera de Cerca»: sin ubicacion, «Cerca» no existe y el sujeto pasa
     a ser la primera de «En la calle». */
  const sujeto = [...contenido.cerca, ...contenido.enCalle, ...contenido.aPuntoDeOcurrir][0];

  return (
    <div className="cf-ahora">
      {contenido.banda ? (
        <BandaContexto texto={contenido.banda.texto} critica={contenido.banda.critica} />
      ) : null}

      <Bloque titulo="Incidencias">
        {contenido.incidencias.map((i) => (
          <Aviso
            key={i.id}
            tipo={i.tipo}
            titulo={i.titulo}
            cuerpo={i.cuerpo}
            procedencia={i.procedencia}
          />
        ))}
      </Bloque>

      <BloqueCofradias titulo="Cerca" cofradias={contenido.cerca} sujeto={sujeto} />

      <BloqueCofradias titulo="En la calle" cofradias={contenido.enCalle} sujeto={sujeto} />

      <BloqueCofradias titulo="A punto de ocurrir" cofradias={contenido.aPuntoDeOcurrir} sujeto={sujeto} />

      <Novedades novedades={contenido.novedades} />
    </div>
  );
}

/**
 * Un bloque de cofradias.
 *
 * Devuelve `null` con la lista vacia, y eso NO es un detalle de
 * implementacion: es la regla dura del area —un bloque vacio no se pinta, ni
 * encabezado, ni hueco, ni mensaje—. `Bloque` por si solo no puede aplicarla
 * aqui, porque recibiria un elemento y un elemento nunca esta «vacio»; la
 * condicion la tiene que conocer quien tiene los datos.
 *
 * El sujeto va en densidad estandar y envuelto en `.cf-ahora-sujeto`, que es
 * lo que conserva la caja; las demas van compactas y el CSS les quita borde,
 * radio y fondo para dejarlas en filas separadas por filete.
 */
function BloqueCofradias({
  titulo,
  cofradias,
  sujeto,
}: {
  titulo: string;
  cofradias: readonly DatosCofradia[];
  sujeto: DatosCofradia | undefined;
}) {
  if (cofradias.length === 0) return null;

  return (
    <Bloque titulo={titulo}>
      <div className="cf-lista">
        {cofradias.map((c) =>
          c.id === sujeto?.id ? (
            <div className="cf-ahora-sujeto" key={c.id}>
              <TarjetaCofradia cofradia={c} densidad="estandar" />
            </div>
          ) : (
            <TarjetaCofradia key={c.id} cofradia={c} densidad="compacta" />
          ),
        )}
      </div>
    </Bloque>
  );
}

/**
 * Jornada sin nada en la calle.
 *
 * Informacion, no fallo: sin iconos de alerta, sin ilustracion y sin
 * disculpa. Los bloques vacios no se pintan, asi que aqui no hay bloques. El
 * acceso a la jornada completa es OPCIONAL, no la salida de un error.
 */
function SinActividad({ contenido }: { contenido: InicioSinActividad }) {
  const { antes, hora, despues } = contenido.proximaSalida;

  return (
    <div className="cf-ahora-calma">
      <p className="titular">{contenido.titular}</p>
      <p className="siguiente">
        {antes}
        <b>{hora}</b>
        {despues}
      </p>
    </div>
  );
}

/**
 * Entre temporadas.
 *
 * Tres cosas y aire: cuanto falta, un acceso a la programacion y lo tuyo. La
 * cuenta atras va en dias —sin horas ni segundos—: a cinco meses y medio
 * vista es la unidad que sirve.
 */
function FueraDeTemporada({ contenido }: { contenido: InicioFueraDeTemporada }) {
  const { proxima, tuyo } = contenido;

  return (
    <div className="cf-ahora" data-intensidad="fuera-temporada">
      <div className="cf-ahora-proxima">
        <span className="cf-ahora-rotulo">Próxima jornada</span>
        <span className="nombre">{proxima.nombre}</span>
        <span className="fecha">{proxima.fecha}</span>

        <div className="cf-ahora-cuenta">
          <span className="dias">{proxima.dias}</span>
          <span>días</span>
        </div>
      </div>

      <div>
        <Boton variante="terciario" tamano="36">
          <Icono nombre="calendario" tamano={16} />
          <span>Ver la programación en Agenda</span>
        </Boton>
      </div>

      <div className="cf-ahora-tuyo">
        <span className="cf-ahora-rotulo">Lo tuyo</span>
        {tuyo.map((c) => (
          <div className="fila" key={c.id}>
            <MarcaRelacion relacion={c.relacion} />
            <span className="nm">{c.nombre}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
