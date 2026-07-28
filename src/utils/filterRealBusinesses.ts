const SEED_OR_TEST_NAMES = [
  'test',
  'demo',
  'sample',
  'placeholder',
  'unregistered'
];

export const FALLBACK_BUSINESSES: any[] = [];

export const filterRealBusinesses = (list: any[]) => {
  if (!Array.isArray(list) || list.length === 0) return [];
  const filtered = list.filter((biz) => {
    if (!biz || !biz.id) return false;
    if (typeof biz.id === 'string' && biz.id.includes('dummy_broken')) return false;
    
    // Allow pending/active/draft to show up for now so user can see them, but hide suspended
    if (biz.status === 'suspended') return false;

    const bizName = (biz.name || '').trim();
    const bizNameLower = bizName.toLowerCase();
    
    if (!bizName || SEED_OR_TEST_NAMES.some(n => bizNameLower === n || bizNameLower.startsWith(n + ' '))) {
      return false;
    }

    const addrStr = typeof biz.address === 'string' ? biz.address : (biz.address?.city || biz.address?.street || '');
    if (addrStr === '[object Object]' || addrStr.includes('[object Object]')) {
      return false; // Only filter out broken code addresses
    }

    return true;
  });
  return filtered;
};
