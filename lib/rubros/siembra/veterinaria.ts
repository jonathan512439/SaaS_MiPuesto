import type { SiembraDeRubro } from "./tipos";

/* El rubro que valida el modelo entero: cuatro categorías de cosas y tres de
 * tiempo, en el mismo catálogo.
 *
 * Un alimento de 15 kg y una consulta de las 10:00 conviven en el mismo carrito
 * de WhatsApp, y el resumen los muestra a los dos. Ningún otro rubro obliga a que
 * las dos formas de vender funcionen juntas. */
export const VETERINARIA: SiembraDeRubro = {
  rubro: "veterinaria",
  patron: "cuidado",
  paletaSugerida: "altiplano",
  modalidadSugerida: "catalogo_cta",
  categorias: [
    {
      nombre: "Alimento",
      icono: "hueso",
      vende: "cosas",
      atributos: [
        {
          clave: "para",
          nombre: "Para",
          tipo: "opcion",
          opciones: ["Perro", "Gato", "Otro"],
          enTarjeta: true,
        },
        {
          clave: "etapa",
          nombre: "Etapa",
          tipo: "opcion",
          opciones: ["Cachorro", "Adulto", "Senior"],
          enTarjeta: true,
        },
        { clave: "peso", nombre: "Peso", tipo: "numero", unidad: "kg", enTarjeta: true },
        {
          clave: "raza",
          nombre: "Raza",
          tipo: "opcion",
          opciones: ["Pequeña", "Mediana", "Grande"],
        },
      ],
    },
    { nombre: "Higiene y cuidado", icono: "tina", vende: "cosas" },
    { nombre: "Medicamentos", icono: "pastilla", vende: "cosas" },
    { nombre: "Accesorios", icono: "perro", vende: "cosas" },
    {
      nombre: "Consultas",
      icono: "estetoscopio",
      vende: "tiempo",
      /* Dos consultorios, dos cupos por franja. La anticipación mínima existe
         para que nadie reserve las 10:00 a las 09:58. */
      agenda: {
        duracionMinutos: 30,
        cupo: 2,
        anticipacionHorasMinima: 2,
        diasHaciaAdelante: 30,
      franjas: [
        { dia: 1, desde: "08:30", hasta: "12:00" },
        { dia: 1, desde: "14:30", hasta: "18:30" },
        { dia: 2, desde: "08:30", hasta: "12:00" },
        { dia: 2, desde: "14:30", hasta: "18:30" },
        { dia: 3, desde: "08:30", hasta: "12:00" },
        { dia: 3, desde: "14:30", hasta: "18:30" },
        { dia: 4, desde: "08:30", hasta: "12:00" },
        { dia: 4, desde: "14:30", hasta: "18:30" },
        { dia: 5, desde: "08:30", hasta: "12:00" },
        { dia: 5, desde: "14:30", hasta: "18:30" },
        { dia: 6, desde: "09:00", hasta: "13:00" },
      ],
      },
      atributos: [
        { clave: "duracion", nombre: "Duración", tipo: "numero", unidad: "minutos", enTarjeta: true },
        {
          clave: "atiende",
          nombre: "Atiende",
          tipo: "opcion",
          opciones: ["Perros", "Gatos", "Todos"],
          enTarjeta: true,
        },
        { clave: "a_domicilio", nombre: "A domicilio", tipo: "si_no", enTarjeta: true },
      ],
    },
    {
      nombre: "Vacunación",
      icono: "jeringa",
      vende: "tiempo",
      agenda: {
        duracionMinutos: 20,
        cupo: 1,
        anticipacionHorasMinima: 2,
        diasHaciaAdelante: 30,
      franjas: [
        { dia: 1, desde: "08:30", hasta: "12:00" },
        { dia: 1, desde: "14:30", hasta: "18:30" },
        { dia: 2, desde: "08:30", hasta: "12:00" },
        { dia: 2, desde: "14:30", hasta: "18:30" },
        { dia: 3, desde: "08:30", hasta: "12:00" },
        { dia: 3, desde: "14:30", hasta: "18:30" },
        { dia: 4, desde: "08:30", hasta: "12:00" },
        { dia: 4, desde: "14:30", hasta: "18:30" },
        { dia: 5, desde: "08:30", hasta: "12:00" },
        { dia: 5, desde: "14:30", hasta: "18:30" },
        { dia: 6, desde: "09:00", hasta: "13:00" },
      ],
      },
    },
    {
      nombre: "Baño y peluquería",
      icono: "tijeras",
      vende: "tiempo",
      agenda: {
        duracionMinutos: 60,
        cupo: 1,
        anticipacionHorasMinima: 3,
        diasHaciaAdelante: 30,
      franjas: [
        { dia: 1, desde: "08:30", hasta: "12:00" },
        { dia: 1, desde: "14:30", hasta: "18:30" },
        { dia: 2, desde: "08:30", hasta: "12:00" },
        { dia: 2, desde: "14:30", hasta: "18:30" },
        { dia: 3, desde: "08:30", hasta: "12:00" },
        { dia: 3, desde: "14:30", hasta: "18:30" },
        { dia: 4, desde: "08:30", hasta: "12:00" },
        { dia: 4, desde: "14:30", hasta: "18:30" },
        { dia: 5, desde: "08:30", hasta: "12:00" },
        { dia: 5, desde: "14:30", hasta: "18:30" },
        { dia: 6, desde: "09:00", hasta: "13:00" },
      ],
      },
    },
  ],
};
