import type { Service } from '@/types';

const normalizeServiceName = (name: string) => name.toLocaleLowerCase('uk-UA');

const isKayakService = (service: Service) => {
  const name = normalizeServiceName(service.name);
  return name.includes('каяк') || name.includes('kayak');
};

const isSupService = (service: Service) => {
  const name = normalizeServiceName(service.name);
  return name.includes('sup') || name.includes('сап');
};

export const putKayaksBeforeSup = (services: Service[]) => {
  const ordered = [...services];
  const kayakIndex = ordered.findIndex(isKayakService);
  const supIndex = ordered.findIndex(isSupService);

  if (kayakIndex !== -1 && supIndex !== -1 && supIndex < kayakIndex) {
    [ordered[supIndex], ordered[kayakIndex]] = [ordered[kayakIndex], ordered[supIndex]];
  }

  return ordered;
};
