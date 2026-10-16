import type { AiSummary, ChatMessage, PromoFormato, PromoTipo, WhatIfAi } from '@/lib/ai/schemas';
import type { StoreData } from '@/lib/domain/types';

export type Archivo = { readonly nombre: string; readonly tamano: number };

// The promotion form, handed from /promos to /promos/resultado.
export type PromoRequest = {
  readonly sku: string;
  readonly tipo: PromoTipo;
  readonly descuento: number | null;
  readonly formato: PromoFormato;
  readonly foto: string | null; // object URL; the photo never leaves the browser
  readonly tienda: string;
};

export type State =
  | { readonly status: 'vacio' }
  | {
      readonly status: 'listo';
      readonly archivo: Archivo;
      readonly data: StoreData;
      readonly resumen: AiSummary | null;
      readonly promo: PromoRequest | null;
      readonly chat: readonly ChatMessage[];
      readonly whatIf: WhatIfAi | null;
    };

export type Action =
  | { readonly type: 'cargar'; readonly data: StoreData; readonly archivo: Archivo }
  | { readonly type: 'resumen'; readonly resumen: AiSummary }
  | { readonly type: 'whatif'; readonly whatIf: WhatIfAi }
  | { readonly type: 'promo'; readonly promo: PromoRequest }
  | { readonly type: 'chat'; readonly mensaje: ChatMessage }
  | { readonly type: 'reiniciar' };

export const initialState: State = { status: 'vacio' };

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'cargar':
      return { status: 'listo', archivo: action.archivo, data: action.data, resumen: null, promo: null, chat: [], whatIf: null };
    case 'whatif':
      return state.status === 'listo' ? { ...state, whatIf: action.whatIf } : state;
    case 'resumen':
      return state.status === 'listo' ? { ...state, resumen: action.resumen } : state;
    case 'promo':
      return state.status === 'listo' ? { ...state, promo: action.promo } : state;
    case 'chat':
      return state.status === 'listo' ? { ...state, chat: [...state.chat, action.mensaje] } : state;
    case 'reiniciar':
      return { status: 'vacio' };
  }
};
