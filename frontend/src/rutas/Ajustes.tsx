import { Link } from "react-router-dom";
import { Boton, Icono, PantallaSecundaria } from "../marco";
import type { NombreTrazo } from "../marco";
import { useUbicacion, type EstadoUbicacion } from "../datos/ubicacion";
import type { EstadoJornada } from "../fixture";
import { cambiarPreferencias, usePreferencias, type PreferenciaTema } from "../tema";
import { DarFe } from "./DarFe";

/**
 * P-25 Ajustes (7-mi-cofradar/ajustes y ajustes-ubicacion-bloqueada).
 *
 * Pantalla secundaria de Mi Cofradar, separada de Cuenta (P-23). Todo lo que
 * se elige aquí se guarda en el teléfono y vale sin cuenta:
 *
 *   Apariencia  tema Sistema / Claro / Oscuro y máximo contraste (§5, D16):
 *               cambian la app entera al momento y se recuerdan.
 *   Permisos    la ubicación con su estado REAL del navegador. «Permitir»
 *               lanza directamente el aviso del navegador, sin hoja previa
 *               (8-acceso: «desde Ajustes, Permitir lanza el aviso
 *               directamente»). Bloqueada, solo se explica dónde cambiarlo,
 *               sin pasos de ningún navegador concreto.
 *   Privacidad  la política de privacidad.
 */
const TEMAS: { valor: PreferenciaTema; etiqueta: string }[] = [
  { valor: "sistema", etiqueta: "Sistema" },
  { valor: "claro", etiqueta: "Claro" },
  { valor: "oscuro", etiqueta: "Oscuro" },
];

const UBICACION: Record<EstadoUbicacion, { texto: string; icono: NombreTrazo }> = {
  permitida: { texto: "Permitida", icono: "permitido" },
  "no-permitida": { texto: "No permitida", icono: "prohibido" },
  bloqueada: { texto: "Bloqueada en el navegador", icono: "candado" },
  "no-disponible": { texto: "Este navegador no la ofrece", icono: "prohibido" },
};

export function Ajustes({ estado }: { estado: EstadoJornada }) {
  const { tema, contraste } = usePreferencias();
  const ubicacion = useUbicacion();
  const estadoUbicacion = UBICACION[ubicacion.estado];

  return (
    <PantallaSecundaria
      titulo="Ajustes"
      vuelta={{ etiqueta: "Mi Cofradar", ruta: "/mi-cofradar" }}
      sangrado="lista"
      accion={estado.activa ? <DarFe /> : undefined}
    >
      <section className="cf-ajustes-grupo" aria-labelledby="ajustes-apariencia">
        <h2 id="ajustes-apariencia" className="cf-ajustes-titulo">
          Apariencia
        </h2>
        <div className="cf-ajustes-fila">
          <div className="cf-segmentado" role="radiogroup" aria-label="Tema">
            {TEMAS.map((t) => (
              <button
                key={t.valor}
                type="button"
                role="radio"
                aria-checked={tema === t.valor}
                onClick={() => cambiarPreferencias({ tema: t.valor })}
              >
                {tema === t.valor ? <Icono nombre="check" tamano={16} /> : null}
                {t.etiqueta}
              </button>
            ))}
          </div>
        </div>
        <div className="cf-ajustes-fila cf-ajustes-con-control">
          <div>
            <p className="cf-ajustes-nombre" id="ajustes-contraste">
              Máximo contraste
            </p>
            <p className="cf-ajustes-texto" id="ajustes-contraste-texto">
              Refuerza bordes, grosores y texto para leer mejor a pleno sol.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            className="cf-interruptor"
            aria-checked={contraste === "max"}
            aria-labelledby="ajustes-contraste"
            aria-describedby="ajustes-contraste-texto"
            onClick={() => cambiarPreferencias({ contraste: contraste === "max" ? "normal" : "max" })}
          />
        </div>
      </section>

      <section className="cf-ajustes-grupo" aria-labelledby="ajustes-permisos">
        <h2 id="ajustes-permisos" className="cf-ajustes-titulo">
          Permisos
        </h2>
        <div className="cf-ajustes-fila">
          <div className="cf-ajustes-permiso">
            <Icono nombre="ubicacion" tamano={24} />
            <div>
              <p className="cf-ajustes-nombre">Ubicación</p>
              <p className="cf-ajustes-estado" data-estado={ubicacion.estado} role="status">
                <Icono nombre={estadoUbicacion.icono} tamano={16} />
                {estadoUbicacion.texto}
              </p>
            </div>
            {ubicacion.estado === "no-permitida" ? (
              <Boton variante="secundario" cargando={ubicacion.pidiendo} onClick={ubicacion.pedir}>
                Permitir
              </Boton>
            ) : null}
          </div>
          <p className="cf-ajustes-texto">
            Para decirte a qué distancia te queda cada cofradía y para situar en el mapa lo que ves cuando das fe.
            Sin ella, Cofradar funciona igual y puedes dar fe.
          </p>
          {ubicacion.estado === "bloqueada" ? (
            <p className="cf-ajustes-aviso">
              <Icono nombre="informativo" tamano={20} />
              <span>Puedes cambiarlo en los permisos de tu navegador.</span>
            </p>
          ) : null}
        </div>
      </section>

      <section className="cf-ajustes-grupo" aria-labelledby="ajustes-privacidad">
        <h2 id="ajustes-privacidad" className="cf-ajustes-titulo">
          Privacidad
        </h2>
        <Link to="/mi-cofradar/ajustes/privacidad" className="cf-ajustes-fila cf-ajustes-enlace">
          <Icono nombre="documento" tamano={24} />
          <span>Política de privacidad</span>
          <Icono nombre="chevronDerecha" tamano={20} />
        </Link>
      </section>
    </PantallaSecundaria>
  );
}
