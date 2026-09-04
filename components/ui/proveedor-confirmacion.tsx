"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

import { Boton } from "./boton";
import { HojaModal } from "./hoja-modal";

type SolicitudConfirmacion = {
  titulo: string;
  descripcion?: string;
  detalle?: ReactNode;
  textoAccion: string;
  textoCancelar?: string;
  destructiva?: boolean;
};

type Pendiente = SolicitudConfirmacion & { resolver: (valor: boolean) => void };

const Contexto = createContext<((solicitud: SolicitudConfirmacion) => Promise<boolean>) | null>(
  null,
);

export function useConfirmacion() {
  const contexto = useContext(Contexto);

  if (!contexto) {
    throw new Error("useConfirmacion necesita estar dentro de ProveedorConfirmacion.");
  }

  return contexto;
}

export function ProveedorConfirmacion({ children }: { children: ReactNode }) {
  const [pendiente, setPendiente] = useState<Pendiente | null>(null);
  const referenciaCancelar = useRef<HTMLButtonElement>(null);

  const confirmar = useCallback(
    (solicitud: SolicitudConfirmacion) =>
      new Promise<boolean>((resolver) => setPendiente({ ...solicitud, resolver })),
    [],
  );

  /* El foco arranca en la salida segura, no en la acción destructiva: quien
     abre esto por error y pulsa Enter debe cancelar, no borrar. */
  useEffect(() => {
    if (pendiente) referenciaCancelar.current?.focus();
  }, [pendiente]);

  const responder = useCallback(
    (valor: boolean) => {
      pendiente?.resolver(valor);
      setPendiente(null);
    },
    [pendiente],
  );

  return (
    <Contexto.Provider value={confirmar}>
      {children}
      <HojaModal
        abierta={pendiente !== null}
        acciones={
          <>
            <Boton onClick={() => responder(false)} ref={referenciaCancelar} variante="secundario">
              {pendiente?.textoCancelar ?? "Cancelar"}
            </Boton>
            <Boton
              onClick={() => responder(true)}
              variante={pendiente?.destructiva ? "peligro" : "principal"}
            >
              {pendiente?.textoAccion ?? "Confirmar"}
            </Boton>
          </>
        }
        descripcion={pendiente?.descripcion}
        onCerrar={() => responder(false)}
        titulo={pendiente?.titulo ?? ""}
      >
        {pendiente?.detalle ?? null}
      </HojaModal>
    </Contexto.Provider>
  );
}
