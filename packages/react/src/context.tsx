'use client';

import React, { createContext, useContext, useMemo, type ReactNode } from 'react';
import type {
  TenantRegistry,
  ResolvedTenant,
  NormalizedMarket,
  EnvironmentName,
} from '@multitenant/core';

export interface TenantContextValue {
  registry: TenantRegistry;
  tenant: ResolvedTenant;
  environment?: EnvironmentName;
}

const TenantContext = createContext<TenantContextValue | null>(null);

export interface TenantProviderProps {
  registry: TenantRegistry;
  tenant: ResolvedTenant;
  environment?: EnvironmentName;
  children: ReactNode;
}

export function TenantProvider({
  registry,
  tenant,
  environment,
  children,
}: TenantProviderProps) {
  const value = useMemo<TenantContextValue>(
    () => ({ registry, tenant, environment }),
    [registry, tenant, environment],
  );
  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenantContext(): TenantContextValue {
  const ctx = useContext(TenantContext);
  if (!ctx) {
    throw new Error('[multitenant] useTenant() must be used within TenantProvider');
  }
  return ctx;
}
