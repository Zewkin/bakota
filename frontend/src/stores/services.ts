import { create } from 'zustand';
import type { Service, Product } from '@/types';
import { getServices } from '@/api/services';
import { getProducts } from '@/api/products';
import { putKayaksBeforeSup } from '@/utils/services';

interface ServicesState {
  services: Service[];
  products: Product[];
  activeServiceId: number | null;
  loading: boolean;
  fetchServices: () => Promise<void>;
  fetchProducts: () => Promise<void>;
  setActiveService: (id: number) => void;
}

export const useServicesStore = create<ServicesState>((set) => ({
  services: [],
  products: [],
  activeServiceId: null,
  loading: false,
  fetchServices: async () => {
    set({ loading: true });
    try {
      const res = await getServices();
      const services = putKayaksBeforeSup(res.data);
      set((s) => ({
        services,
        activeServiceId: s.activeServiceId ?? services[0]?.id ?? null,
      }));
    } finally {
      set({ loading: false });
    }
  },
  fetchProducts: async () => {
    const res = await getProducts({ active: 1 });
    set({ products: res.data });
  },
  setActiveService: (id) => set({ activeServiceId: id }),
}));
