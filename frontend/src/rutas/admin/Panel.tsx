import { useCallback, useEffect, useState, type ReactNode } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { cabecerasSesion, useSesion } from "../../datos/sesion";
import { Boton, Icono, type NombreTrazo } from "../../marco";

/**
 * El panel de administración (fase 5, 9-admin/). Herramienta interna: vive en /admin, fuera del marco de
 * la app (sin barra, sin franja «Dar fe»), y se usa sobre todo en ordenador.
 *
 * P-27 Acceso: solo entra una cuenta del equipo. Lo decide el servidor (GET /api/admin/yo, backend/src/
 * admin.ts); aquí solo se pinta lo que contesta. Sin sesión, «Entrar con Google»; con una cuenta sin
 * permiso, «Esta cuenta no tiene acceso al panel» y «Entrar con otra cuenta».
 */
type Acceso = { estado: "comprobando" } | { estado: "dentro"; email: string } | { estado: "sin-permiso" } | { estado: "error" };

export function Panel() {
  const { usuario, entrar, salir } = useSesion();
  const [acceso, setAcceso] = useState<Acceso>({ estado: "comprobando" });

  const comprobar = useCallback(async () => {
    setAcceso({ estado: "comprobando" });
    try {
      const r = await fetch("/api/admin/yo", { headers: { Accept: "application/json", ...(await cabecerasSesion()) } });
      if (r.status === 403 || r.status === 401) return setAcceso({ estado: "sin-permiso" });
      if (!r.ok) return setAcceso({ estado: "error" });
      const d = (await r.json()) as { email: string | null };
      setAcceso({ estado: "dentro", email: d.email ?? usuario?.email ?? "" });
    } catch {
      setAcceso({ estado: "error" });
    }
  }, [usuario?.email]);

  const id = usuario?.id;
  useEffect(() => {
    if (id) void comprobar();
  }, [id, comprobar]);

  useEffect(() => {
    document.title = "Cofradar · Panel de administración";
    return () => {
      document.title = "Cofradar";
    };
  }, []);

  // Leyendo la sesión guardada: nada, para no enseñar «Entrar» un instante a quien ya ha entrado
  if (usuario === undefined) return <div className="cf-admin-acceso" />;

  if (usuario === null)
    return (
      <PantallaAcceso>
        <Boton variante="primario" tamano="52" onClick={() => void entrar("admin", "/admin")}>
          Entrar con Google
        </Boton>
      </PantallaAcceso>
    );

  if (acceso.estado === "comprobando") return <div className="cf-admin-acceso" aria-busy="true" />;

  if (acceso.estado === "sin-permiso")
    return (
      <PantallaAcceso>
        <p className="cf-admin-aviso" role="status">
          Esta cuenta no tiene acceso al panel.
        </p>
        <Boton
          variante="primario"
          tamano="52"
          onClick={async () => {
            await salir();
            await entrar("admin", "/admin");
          }}
        >
          Entrar con otra cuenta
        </Boton>
      </PantallaAcceso>
    );

  if (acceso.estado === "error")
    return (
      <PantallaAcceso>
        <p className="cf-admin-aviso" role="alert">
          No se ha podido comprobar el acceso. Inténtalo de nuevo en un momento.
        </p>
        <Boton variante="primario" tamano="52" onClick={() => void comprobar()}>
          Reintentar
        </Boton>
      </PantallaAcceso>
    );

  return <Dentro email={acceso.email} salir={salir} />;
}

function PantallaAcceso({ children }: { children: ReactNode }) {
  return (
    <main className="cf-admin-acceso">
      <div className="cf-admin-acceso-caja">
        <h1 className="cf-admin-logo">Cofradar</h1>
        <p className="cf-admin-sub">Panel de administración</p>
        {children}
      </div>
    </main>
  );
}

const SECCIONES: { ruta: string; nombre: string; icono: NombreTrazo; issue: string }[] = [
  { ruta: "jornada", nombre: "Jornada en curso", icono: "agenda", issue: "5.2" },
  { ruta: "datos", nombre: "Datos base", icono: "documento", issue: "5.3" },
  { ruta: "taxonomias", nombre: "Taxonomías", icono: "cofradias", issue: "5.4" },
  { ruta: "permisos", nombre: "Permisos y configuración", icono: "usuario", issue: "5.5" },
];

function Dentro({ email, salir }: { email: string; salir: () => Promise<void> }) {
  return (
    <div className="cf-admin">
      <nav className="cf-admin-menu" aria-label="Panel">
        <div className="cf-admin-menu-cab">
          <p className="cf-admin-logo">Cofradar</p>
          <p className="cf-admin-sub">Panel de administración</p>
        </div>
        <ul>
          {SECCIONES.map((s) => (
            <li key={s.ruta}>
              <NavLink to={`/admin/${s.ruta}`}>
                <Icono nombre={s.icono} tamano={20} />
                {s.nombre}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="cf-admin-menu-pie">
          <p>{email}</p>
          <button type="button" className="cf-admin-salir" onClick={() => void salir()}>
            Salir
          </button>
        </div>
      </nav>
      <div className="cf-admin-contenido">
        <Routes>
          <Route index element={<Navigate to="jornada" replace />} />
          {SECCIONES.map((s) => (
            <Route key={s.ruta} path={s.ruta} element={<PorHacer nombre={s.nombre} issue={s.issue} />} />
          ))}
          <Route path="*" element={<Navigate to="jornada" replace />} />
        </Routes>
      </div>
    </div>
  );
}

/** Andamio: la sección aún no está construida. Se va quitando según se hace cada issue. */
function PorHacer({ nombre, issue }: { nombre: string; issue: string }) {
  return (
    <>
      <header className="cf-admin-cab">
        <h1>{nombre}</h1>
      </header>
      <div className="cf-admin-cuerpo">
        <p className="cf-relleno">{issue} · por construir</p>
      </div>
    </>
  );
}
