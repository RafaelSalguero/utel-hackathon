'use client';

import { createContext, useReducer, type Dispatch } from 'react';
import { initialState, reducer, type Action, type State } from './reducer';

export type StoreValue = { readonly state: State; readonly dispatch: Dispatch<Action> };

export const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { readonly children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
}
