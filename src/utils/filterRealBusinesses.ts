const SEED_OR_TEST_NAMES = [
  'test',
  'demo',
  'sample',
  'placeholder',
  'dummy',
  'unregistered'
];

export const FALLBACK_BUSINESSES: any[] = [];

export const filterRealBusinesses = (list: any[]) => {
  if (!Array.isArray(list) || list.length === 0) return [];
  const filtered = list.filter((biz) => {
    if (!biz || !biz.id) return false;
    if (typeof biz.id === 'string' && (biz.id.startsWith('demo-') || biz.id.startsWith('partner-facility-') || biz.id.includes('dummy'))) return false;
    
    // Allow pending/active/draft to show up for now so user can see them, but hide suspended
    if (biz.status === 'suspended') return false;

    const dummyNamesSet = new Set(["Glamour Hounds", "Waggy Tails Daycare Club", "new", "Urban Strides Pet Care", "Splash Dog Pool", "Splash Paws Swimming Pool", "Luxe Pet Spa & Grooming", "Cozy Nook Pet Sitters", "new pet", "Smart Paws Tricks & Treats", "Cozy Pet Daycare", "Aqua Paws Hydrotherapy", "Home Sweet Home Pet Sitting", "Paws & Bubbles Grooming", "Alpha Dog Training Academy", "Pro Dog Training Academy", "The Barking Lot", "Furry Friends Companion", "Happy Tails Walking", "The Fluffy Bubble", "Happy Tails Dog Walking", "pets grooming"]);

    const bizName = (biz.name || '').trim();
    const bizNameLower = bizName.toLowerCase();
    
    if (!bizName || dummyNamesSet.has(bizName) || SEED_OR_TEST_NAMES.some(n => bizNameLower === n || bizNameLower.startsWith(n + ' '))) {
      return false;
    }

    // Relax the address requirement so newly registered partners without full addresses still show up
    const addrStr = typeof biz.address === 'string' ? biz.address : (biz.address?.city || biz.address?.street || '');
    if (addrStr === '[object Object]' || addrStr.includes('[object Object]')) {
      return false; // Only filter out broken code addresses
    }

    return true;
  });
  return filtered;
};
