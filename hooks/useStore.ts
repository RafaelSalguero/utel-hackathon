'use client';

import { useContext, useMemo } from 'react';
import { StoreContext, type StoreValue } from '@/state/StoreContext';
import type { State } from '@/state/reducer';
import { selectChatDataset, selectEventPlans, selectGroups, selectKpis, selectPairs, selectToday } from '@/state/selectors';

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

export const useEventPlans = () => {
  const { state } = useLoadedStore();
  const grupos = useGroups();
  return useMemo(
    () => selectEventPlans(grupos, selectToday(state.data, new Date().toISOString().slice(0, 10))),
    [state.data, grupos],
  );
};

export const usePairs = () => {
  const { state } = useLoadedStore();
  const grupos = useGroups();
  return useMemo(() => selectPairs(state.data, grupos), [state.data, grupos]);
};

// Everything the AI features send to the server: per-product aggregates, pairs and dates.
export const useChatDataset = () => {
  const { state } = useLoadedStore();
  const grupos = useGroups();
  const kpis = useKpis();
  const eventos = useEventPlans();
  const parejas = usePairs();
  return useMemo(
    () => selectChatDataset(state.data, grupos, kpis, { parejas, eventos }),
    [state.data, grupos, kpis, parejas, eventos],
  );
};
