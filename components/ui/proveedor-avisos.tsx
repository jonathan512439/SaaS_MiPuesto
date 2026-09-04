"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

import {
  DURACION_AVISO,
  INTERVALO_AVISO,
  reducirCola,
  type Aviso,
} from "./cola-avisos";
import { Toast, type VarianteToast } from "./toast";
import styles from "./ui.module.css";

type SolicitudAviso = {
  titulo: string;
  mensaje?: string;
  variante?: VarianteToast;
};

type ContextoAvisos = {
  mostrarAviso: (solicitud: SolicitudAviso) => void;
  cerrarAviso: (id: string) => void;
};

const Contexto = createContext<ContextoAvisos | null>(null);

export function useAvisos() {
  const contexto = useContext(Contexto);

  if (!contexto) {
    throw new Error("useAvisos necesita estar dentro de ProveedorAvisos.");
  }

  return contexto;
}

function suscribirInmutable() {
  return () => {};
}

function esUrgente(variante: VarianteToast) {
  return variante === "advertencia" || variante === "error";
}

export function ProveedorAvisos({ children }: { children: ReactNode }) {
  const [avisos, despachar] = useReducer(reducirCola, [] as Aviso[]);
  const [pausado, setPausado] = useState(false);
  /* El portal necesita document, que no existe al renderizar en el servidor.
     useSyncExternalStore da esa distinción sin encender estado en un efecto. */
  const montado = useSyncExternalStore(suscribirInmutable, () => true, () => false);

  const mostrarAviso = useCallback(
    ({ titulo, mensaje, variante = "informacion" }: SolicitudAviso) => {
      despachar({
        tipo: "mostrar",
        aviso: {
          id: crypto.randomUUID(),
          titulo,
          mensaje,
          variante,
          restante: DURACION_AVISO,
        },
      });
    },
    [],
  );

  const cerrarAviso = useCallback((id: string) => despachar({ tipo: "cerrar", id }), []);

  useEffect(() => {
    if (pausado || avisos.length === 0) return;

    const intervalo = setInterval(
      () => despachar({ tipo: "transcurrir", ms: INTERVALO_AVISO }),
      INTERVALO_AVISO,
    );

    return () => clearInterval(intervalo);
  }, [avisos.length, pausado]);

  const valor = useMemo(() => ({ mostrarAviso, cerrarAviso }), [cerrarAviso, mostrarAviso]);

  /* Las dos regiones vivas viven en el contenedor y no en cada aviso: un
     role="status" insertado junto con su texto no se anuncia de forma fiable.
     Por eso los Toast se renderizan con anunciar={false}. */
  const pila = (
    <div
      className={styles.pilaAvisos}
      onBlur={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onPointerEnter={() => setPausado(true)}
      onPointerLeave={() => setPausado(false)}
    >
      {(["polite", "assertive"] as const).map((cortesia) => (
        <div aria-live={cortesia} className={styles.regionAvisos} key={cortesia}>
          {avisos
            .filter((aviso) => esUrgente(aviso.variante) === (cortesia === "assertive"))
            .map((aviso) => (
              <Toast
                anunciar={false}
                key={aviso.id}
                mensaje={aviso.mensaje}
                onCerrar={() => cerrarAviso(aviso.id)}
                titulo={aviso.titulo}
                variante={aviso.variante}
              />
            ))}
        </div>
      ))}
    </div>
  );

  return (
    <Contexto.Provider value={valor}>
      {children}
      {montado ? createPortal(pila, document.body) : null}
    </Contexto.Provider>
  );
}
