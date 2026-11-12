import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { Esqueleto } from "../componentes";
import { Boton, HojaDecision, Icono, PantallaSecundaria, type NombreTrazo } from "../marco";
import { apuntarTarjetaVista, lineaHermano, tarjetaVista, tituloTarjeta, useAnos, useTarjeta, type ClaveLinea, type Tarjeta } from "../datos/ano";
import { dibujarTarjeta, nombreImagen } from "../datos/imagenTarjeta";
import { useSesion } from "../datos/sesion";
import type { EstadoJornada } from "../fixture";
import { DarFe } from "./DarFe";
import { Cirio } from "./PreguntaDelDia";

/**
 * «Tu Semana Santa» (F-59; 12-ano-cofrade/25–31): la tarjeta del año, para guardarla y compartirla.
 *   FilaTuSemanaSanta    en Mi Cofradar, encima de «lo tuyo»; no sale si no hay ninguna tarjeta (31)
 *   /mi-cofradar/semana-santa         la del último año, con «Otros años» al pie (26, 30)
 *   /mi-cofradar/semana-santa/:anio   la de un año anterior (30b)
 * Es un recuerdo, no un premio: sin puntos, ni comparaciones, ni confeti. Solo lo que hizo (R5).
 */

const RUTA = "/mi-cofradar/semana-santa";
const TEXTO = (anio: number) => `Mi Semana Santa ${anio} en Cofradar · cofradar.es`;

const ICONO: Record<Exclude<ClaveLinea, "cirio">, { nombre: NombreTrazo; marca: boolean }> = {
  vistas: { nombre: "vista", marca: true },
  fe: { nombre: "darFeVerificada", marca: true },
  preguntas: { nombre: "trivial", marca: false },
  partidas: { nombre: "trivial", marca: false },
  estampas: { nombre: "album", marca: true },
};

/** 25 · La fila de Mi Cofradar. Hasta que la abre, «Ya está tu tarjeta del año». */
export function FilaTuSemanaSanta() {
  const { usuario } = useSesion();
  const anios = useAnos();
  const anio = anios?.[0];
  if (!usuario || !anio) return null;
  const nueva = !tarjetaVista(usuario.id, anio);
  return (
    <Link className="cf-ano-fila" to={RUTA}>
      <span className="cf-ano-fila-icono">
        <Icono nombre="tarjetaAno" tamano={24} />
      </span>
      <span className="cf-mi-texto">
        <span className="cf-mi-nombre">Tu Semana Santa {anio}</span>
        {nueva ? <span className="cf-mi-nota">Ya está tu tarjeta del año</span> : null}
      </span>
      <Icono nombre="chevronDerecha" tamano={20} />
    </Link>
  );
}

/** La tarjeta, como estampa de recuerdo. Siempre en claro: es la que se comparte. */
export function TarjetaAno({ t }: { t: Tarjeta }) {
  const hermano = lineaHermano(t);
  return (
    <figure className="cf-ano-tarjeta" data-theme="light" aria-label={`Tu Semana Santa ${t.anio}`}>
      <div className="cf-ano-filete">
        <header className="cf-ano-cabeza">
          <p className="cf-ano-marca">Cofradar</p>
          <p className="cf-ano-anio">Semana Santa de Sevilla · {t.anio}</p>
          <span className="cf-ano-rayita" aria-hidden="true" />
          {/* El alias se parte por los guiones bajos, nunca a mitad de palabra */}
          <h2 className="cf-ano-alias">
            {tituloTarjeta(t)
              .split(/(?<=_)/)
              .map((trozo, i) => (
                <span key={i}>{trozo}</span>
              ))}
          </h2>
          {hermano ? <p className="cf-ano-hermano">{hermano}</p> : null}
        </header>
        <ul className="cf-ano-lineas">
          {t.lineas.map((l) => (
            <li key={l.clave}>
              <span className="cf-ano-icono" data-marca={l.clave !== "cirio" && ICONO[l.clave].marca ? "" : undefined}>
                {l.clave === "cirio" ? <Cirio forma="encendido" tamano={24} /> : <Icono nombre={ICONO[l.clave].nombre} tamano={24} />}
              </span>
              <span>{l.texto}</span>
            </li>
          ))}
        </ul>
        <footer className="cf-ano-pie">
          <span className="cf-ano-rayita" aria-hidden="true" />
          <p>cofradar.es</p>
        </footer>
      </div>
    </figure>
  );
}

/** «Compartir» con su hoja (28) y «Guardar imagen». La imagen se hace en el teléfono, al pedirla. */
function Acciones({ t }: { t: Tarjeta }) {
  const [imagen, setImagen] = useState<{ blob: Blob; url: string } | null>(null);
  const [abierta, setAbierta] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    let url: string | null = null;
    void dibujarTarjeta(t)
      .then((blob) => {
        if (!vivo) return;
        url = URL.createObjectURL(blob);
        setImagen({ blob, url });
      })
      .catch(() => vivo && setAviso("No se ha podido hacer la imagen. Vuelve a intentarlo."));
    return () => {
      vivo = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [t]);

  const guardar = () => {
    if (!imagen) return;
    const a = document.createElement("a");
    a.href = imagen.url;
    a.download = nombreImagen(t);
    a.click();
  };

  const compartir = async () => {
    if (!imagen) return;
    setAviso(null);
    const archivo = new File([imagen.blob], nombreImagen(t), { type: "image/png" });
    const datos = { files: [archivo], text: TEXTO(t.anio) };
    if (navigator.canShare?.(datos)) {
      try {
        await navigator.share(datos);
        setAbierta(false);
      } catch {
        /* cerrar el menú no es un error */
      }
      return;
    }
    // Sin compartir imágenes (un ordenador): se guarda la imagen y se copia el texto
    guardar();
    try {
      await navigator.clipboard.writeText(TEXTO(t.anio));
      setAviso("Imagen guardada y mensaje copiado. Pégalo donde quieras.");
    } catch {
      setAviso("Imagen guardada.");
    }
  };

  return (
    <>
      <div className="cf-ano-acciones">
        <Boton variante="primario" tamano="52" onClick={() => setAbierta(true)} disabled={!imagen}>
          <Icono nombre="compartir" tamano={20} />
          Compartir
        </Boton>
        <Boton variante="secundario" tamano="52" onClick={guardar} disabled={!imagen}>
          <Icono nombre="descargar" tamano={20} />
          Guardar imagen
        </Boton>
        {aviso && !abierta ? <p role="status">{aviso}</p> : null}
      </div>
      <HojaDecision
        abierta={abierta}
        titulo="Vista previa del mensaje"
        alCerrar={() => setAbierta(false)}
        acciones={
          <>
            <Boton variante="primario" tamano="52" onClick={() => void compartir()}>
              <Icono nombre="compartir" tamano={20} />
              Compartir
            </Boton>
            <Boton variante="secundario" tamano="52" onClick={() => setAbierta(false)}>
              Ahora no
            </Boton>
          </>
        }
      >
        <div className="cf-ano-previa">
          {imagen ? <img src={imagen.url} alt="" width={108} height={192} /> : null}
          <p>{TEXTO(t.anio)}</p>
        </div>
        {aviso ? <p role="status">{aviso}</p> : null}
      </HojaDecision>
    </>
  );
}

function Contenido({ t, otros }: { t: Tarjeta | null | undefined; otros?: number[] }) {
  if (t === undefined) return <Esqueleto forma="lista" />;
  if (t === null) return <p className="cf-ano-nota">Esta tarjeta no está. Vuelve a Mi Cofradar.</p>;
  return (
    <div className="cf-ano">
      <TarjetaAno t={t} />
      <Acciones t={t} />
      <p className="cf-ano-nota">Las horas que pasaste en la calle no salen: Cofradar no guarda dónde has estado.</p>
      {otros?.length ? (
        <section aria-labelledby="ano-otros">
          <h3 id="ano-otros" className="cf-ano-rotulo">
            Otros años
          </h3>
          <nav className="cf-mi-grupo">
            {otros.map((a) => (
              <Link key={a} className="cf-mi-fila cf-ano-otro" to={`${RUTA}/${a}`}>
                <span className="cf-ano-otro-nombre">Semana Santa {a}</span>
                <Icono nombre="chevronDerecha" tamano={20} />
              </Link>
            ))}
          </nav>
        </section>
      ) : null}
    </div>
  );
}

/** 26 · 30 · La del último año, con las de antes al pie. */
export function TuSemanaSanta({ estado }: { estado: EstadoJornada }) {
  const { usuario } = useSesion();
  const anios = useAnos();
  const anio = anios?.[0] ?? null;
  const t = useTarjeta(anio);
  useEffect(() => {
    if (usuario && t) apuntarTarjetaVista(usuario.id, t.anio);
  }, [usuario, t]);
  if (usuario === null || (anios && !anios.length)) return <Navigate to="/mi-cofradar" replace />;
  return (
    <PantallaSecundaria
      registro="editorial"
      titulo="Tu Semana Santa"
      vuelta={{ etiqueta: "Mi Cofradar", ruta: "/mi-cofradar" }}
      accion={estado.activa ? <DarFe /> : undefined}
    >
      <Contenido t={anio === null ? undefined : t} otros={anios?.slice(1)} />
    </PantallaSecundaria>
  );
}

/** 30b · La de un año anterior. */
export function SemanaSantaDe({ estado }: { estado: EstadoJornada }) {
  const { usuario } = useSesion();
  const anio = Number(useParams().anio);
  const t = useTarjeta(Number.isInteger(anio) ? anio : null);
  if (usuario === null) return <Navigate to="/mi-cofradar" replace />;
  return (
    <PantallaSecundaria
      registro="editorial"
      titulo={`Semana Santa ${anio}`}
      vuelta={{ etiqueta: "Tu Semana Santa", ruta: RUTA }}
      accion={estado.activa ? <DarFe /> : undefined}
    >
      <Contenido t={t} />
    </PantallaSecundaria>
  );
}
