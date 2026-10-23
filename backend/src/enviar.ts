import { createHash } from "node:crypto";
import type { Request, Response } from "express";

/**
 * Enviar un JSON que ya está guardado en memoria (BUL-212, prueba de carga de la Madrugá).
 *
 * En la Madrugá, miles de teléfonos piden lo mismo cada 30 segundos: el mapa de la jornada (unos 50 KB),
 * su estado, la lista de cofradías. Los datos ya se guardaban en memoria, pero cada petición los volvía
 * a convertir a texto y Express les calculaba la huella (ETag) otra vez: con 5.000 personas, eso dejaba
 * al servidor parado varios segundos. Aquí el texto y su huella se calculan UNA vez por dato guardado
 * (la misma promesa) y se reparten tal cual.
 *
 * Con la huella puesta, Express responde 304 sin cuerpo a quien ya lo tiene (If-None-Match).
 */
const textos = new WeakMap<Promise<unknown>, Promise<{ cuerpo: string; etag: string }>>();

export async function enviarGuardado(_peticion: Request, respuesta: Response, datos: Promise<unknown>): Promise<void> {
  let texto = textos.get(datos);
  if (!texto) {
    texto = datos.then((d) => {
      const cuerpo = JSON.stringify(d);
      return { cuerpo, etag: `W/"${createHash("sha1").update(cuerpo).digest("base64url")}"` };
    });
    textos.set(datos, texto);
  }
  const { cuerpo, etag } = await texto;
  respuesta.setHeader("ETag", etag);
  respuesta.type("json").send(cuerpo);
}
