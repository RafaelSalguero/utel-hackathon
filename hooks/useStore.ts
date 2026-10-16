'use client';

import { useContext, useMemo } from 'react';
import { StoreContext, type StoreValue } from '@/state/StoreContext';
import type { State } from '@/state/reducer';
import { selectGroups, selectKpis } from '@/state/selectors';

export const useStore = (): StoreValue => {
  const store = useContext(StoreContext);
  if (store === null) throw new Error('useStore must be used inside <StoreProvider>');
  return store;
};

type Loaded = Extract<State, { status: 'listo' }>;

// For pages inside (app)/, whose layout guarantees that data is loaded.
export const useLoadedStore = (): { readonly state: Loaded; readonly dispatch: StoreValue['dispatch'] } => {
  const { state, dispatch } = useStore();
  if (state.status !== 'listo') throw new Error('useLoadedStore used without data');
  return { state, dispatch };
};

// Derived data is never stored: it is recomputed from the source data and memoized.
export const useGroups = () => {
  const { state } = useLoadedStore();
  return useMemo(() => selectGroups(state.data), [state.data]);
};

export const useKpis = () => {
  const { state } = useLoadedStore();
  const grupos = useGroups();
  return useMemo(() => selectKpis(state.data, grupos), [state.data, grupos]);
};
