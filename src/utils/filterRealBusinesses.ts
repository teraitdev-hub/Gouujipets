import { SEED_BUSINESSES } from "../lib/seedData";

const DUMMY_OWNER_IDS = ['NsfsgoFIozLMldH1KBGqTlZWeDw2', 'partner_dr_sharma', 'partner_anita_rao'];
const SEED_OR_TEST_NAMES = ['test', 'demo', 'sample', 'placeholder', 'unregistered'];

export const filterRealBusinesses = (list: any[]) => {
  if (!list) return [];
  
  const seedIds = new Set(SEED_BUSINESSES.map((b: any) => b.id));
  const seedNames = new Set(SEED_BUSINESSES.map((b: any) => b.name));

  return list.filter(biz => {
    if (seedIds.has(biz.id) || seedIds.has(biz._id)) return false;
    if (seedNames.has(biz.name)) return false;
    if (DUMMY_OWNER_IDS.includes(biz.owner_id)) return false;
    const nameLower = (biz.name || '').toLowerCase();
    if (SEED_OR_TEST_NAMES.some(kw => nameLower.includes(kw))) return false;
    return true;
  });
};

