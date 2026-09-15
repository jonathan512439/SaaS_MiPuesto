import { describe, expect, it } from "vitest";

import { TRAZOS_CATALOGO } from "../../../components/iconos/catalogo";
import {
  MAXIMO_ATRIBUTOS,
  MAXIMO_EN_TARJETA,
  MAXIMO_OPCIONES,
  MINIMO_OPCIONES,
  LARGO_NOMBRE,
  LARGO_UNIDAD,
} from "../../catalogo/atributos";
import { RUBROS } from "../../negocios/rubros";
import { PALETAS } from "../../apariencia";
import { TIPOS_NEGOCIO } from "../../negocios/validacion";
import { SIEMBRAS, siembraDeRubro } from "./index";

/* La siembra corre **en el servidor y una sola vez**, al elegir el rubro. Si algo
 * está mal —un ícono que no existe, once campos donde la base admite diez— no
 * falla al desplegar ni al compilar: falla en la cara del primer cliente de ese
 * rubro, en el momento más caro posible, que es cuando acaba de decidir usar el
 * sistema.
 *
 * Esta prueba es barata y lo atrapa antes. Recorre las seis y comprueba contra
 * los mismos topes que hace cumplir el disparador de la base, no contra números
 * escritos acá: si la base cambia un límite, esto lo sigue.
 */
describe("las siembras de rubro", () => {
  it("son seis, sin rubros repetidos y todos válidos", () => {
    expect(SIEMBRAS).toHaveLength(6);
    expect(new Set(SIEMBRAS.map(({ rubro }) => rubro)).size).toBe(SIEMBRAS.length);
    for (const { rubro } of SIEMBRAS) {
      expect(RUBROS, `«${rubro}» no es un rubro del sistema`).toContain(rubro);
    }
  });

  /* Un ícono mal escrito no rompe nada: cae al predeterminado. Por eso hay que
     comprobarlo acá, porque en pantalla se ve una categoría con el ícono
     genérico y nadie sospecha que es un error de tipeo. */
  it("usan íconos que existen en el juego generado", () => {
    for (const { rubro, categorias } of SIEMBRAS) {
      for (const { nombre, icono } of categorias) {
        expect(
          Object.keys(TRAZOS_CATALOGO),
          `${rubro} · «${nombre}» pide el ícono «${icono}», que no existe`,
        ).toContain(icono);
      }
    }
  });

  it("sugieren una paleta y una modalidad que el sistema conoce", () => {
    for (const { rubro, paletaSugerida, modalidadSugerida } of SIEMBRAS) {
      expect(PALETAS, `${rubro} sugiere una paleta inexistente`).toContain(paletaSugerida);
      expect(TIPOS_NEGOCIO, `${rubro} sugiere una modalidad inexistente`).toContain(
        modalidadSugerida,
      );
    }
  });

  it("no pasan los topes que hace cumplir la base", () => {
    for (const { rubro, categorias } of SIEMBRAS) {
      for (const { nombre, atributos = [] } of categorias) {
        expect(
          atributos.length,
          `${rubro} · «${nombre}» declara ${atributos.length} campos`,
        ).toBeLessThanOrEqual(MAXIMO_ATRIBUTOS);

        const enTarjeta = atributos.filter((atributo) => atributo.enTarjeta).length;
        expect(
          enTarjeta,
          `${rubro} · «${nombre}» pone ${enTarjeta} campos en la tarjeta`,
        ).toBeLessThanOrEqual(MAXIMO_EN_TARJETA);
      }
    }
  });

  /* La clave viaja a la importación, a la exportación y a la IA. Una con tilde o
     con espacios rompe la columna del Excel y el esquema que se le manda al
     modelo, y eso se descubre recién importando. */
  it("usan claves en minúsculas, sin tildes ni espacios, y sin repetir", () => {
    for (const { rubro, categorias } of SIEMBRAS) {
      for (const { nombre, atributos = [] } of categorias) {
        const claves = atributos.map(({ clave }) => clave);
        expect(
          new Set(claves).size,
          `${rubro} · «${nombre}» repite una clave`,
        ).toBe(claves.length);

        for (const clave of claves) {
          expect(clave, `${rubro} · «${nombre}» tiene la clave «${clave}»`).toMatch(
            /^[a-z][a-z0-9_]*$/,
          );
        }
      }
    }
  });

  it("dan entre dos y veinticuatro opciones a cada campo de opción", () => {
    for (const { rubro, categorias } of SIEMBRAS) {
      for (const { nombre, atributos = [] } of categorias) {
        for (const atributo of atributos) {
          if (atributo.tipo !== "opcion") {
            expect(
              atributo.opciones,
              `${rubro} · «${nombre}» · «${atributo.nombre}» no es de opción y trae opciones`,
            ).toBeUndefined();
            continue;
          }
          const opciones = atributo.opciones ?? [];
          expect(
            opciones.length,
            `${rubro} · «${nombre}» · «${atributo.nombre}» tiene ${opciones.length} opciones`,
          ).toBeGreaterThanOrEqual(MINIMO_OPCIONES);
          expect(opciones.length).toBeLessThanOrEqual(MAXIMO_OPCIONES);
          expect(new Set(opciones).size, "hay opciones repetidas").toBe(opciones.length);
        }
      }
    }
  });

  it("respetan el largo de los nombres y las unidades", () => {
    for (const { rubro, categorias } of SIEMBRAS) {
      for (const { atributos = [] } of categorias) {
        for (const { nombre, unidad } of atributos) {
          expect(nombre.length, `«${nombre}» de ${rubro} es muy largo`).toBeLessThanOrEqual(
            LARGO_NOMBRE,
          );
          if (unidad !== undefined) {
            expect(unidad.length, `la unidad «${unidad}» de ${rubro} es muy larga`)
              .toBeLessThanOrEqual(LARGO_UNIDAD);
          }
        }
      }
    }
  });

  /* Una categoría de tiempo sin agenda queda sin horario, y el cliente abre el
     calendario y no encuentra un solo turno. Es el caso de la veterinaria, que
     es el único rubro sembrado que vende las dos cosas. */
  it("le dan agenda a toda categoría que vende tiempo, y solo a esas", () => {
    for (const { rubro, categorias } of SIEMBRAS) {
      for (const { nombre, vende, agenda } of categorias) {
        if (vende === "tiempo") {
          expect(agenda, `${rubro} · «${nombre}» vende tiempo y no tiene agenda`).toBeDefined();
          expect(agenda!.duracionMinutos).toBeGreaterThan(0);
          expect(agenda!.cupo).toBeGreaterThan(0);
          expect(agenda!.diasHaciaAdelante).toBeGreaterThan(0);
        } else {
          expect(agenda, `${rubro} · «${nombre}» no vende tiempo y trae agenda`).toBeUndefined();
        }
      }
    }
  });

  it("encuentra la siembra por su rubro, y nada más", () => {
    expect(siembraDeRubro("veterinaria")?.categorias).toHaveLength(7);
    /* Los cuatro sin sembrar devuelven nulo a propósito: se les arma la siembra
       cuando llegue el primer cliente de ese rubro, no antes. */
    expect(siembraDeRubro("belleza")).toBeNull();
    expect(siembraDeRubro("otro")).toBeNull();
    expect(siembraDeRubro("inventado")).toBeNull();
    expect(siembraDeRubro(null)).toBeNull();
  });
});
