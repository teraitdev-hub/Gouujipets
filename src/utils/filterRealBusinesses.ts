import { SEED_BUSINESSES } from "../lib/seedData";

const SEED_OR_TEST_NAMES = [
  'test',
  'demo',
  'sample',
  'placeholder',
  'unregistered'
];

export const FALLBACK_BUSINESSES: any[] = SEED_BUSINESSES;

export const filterRealBusinesses = (list: any[]) => {
  return list || [];
};
