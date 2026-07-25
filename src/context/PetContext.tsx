import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, getDocs, addDoc, updateDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';

type Pet = {
  id: string;
  name: string;
  species: string;
  breed?: string;
  age?: number;
  age_months?: number;
  weight?: number;
  gender?: string;
  medical_history?: string;
  allergies?: string;
  behavior_notes?: string;
  food_preferences?: string;
  dob?: string;
  avatar_url?: string;
  photo_url?: string;
  status?: string;
  live_status_update?: string;
  created_at?: any;
  // Extended pet intake & security profile fields
  aggression_triggers?: string;
  calming_methods?: string;
  skin_details?: string;
  ideal_temperature?: string;
  vaccination_report?: string;
  next_vaccination_date?: string;
  security_measures?: string;
  vet_service_required?: boolean;
};

interface PetContextType {
  activePet: Pet | null;
  setActivePetId: (id: string) => void;
  pets: Pet[];
  addPet: (pet: Partial<Pet>) => Promise<void>;
  updatePet: (id: string, pet: Partial<Pet>) => Promise<void>;
  isLoading: boolean;
}

const PetContext = createContext<PetContextType | undefined>(undefined);

export const PetProvider = ({ children }: { children: ReactNode }) => {
  const { user, isAuthenticated } = useAuthStore();
  const [pets, setPets] = useState<Pet[]>([]);
  const [activePetId, setActivePetIdState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPets = async () => {
    if (!isAuthenticated || !user) return;
    setIsLoading(true);
    try {
      const q = query(
        collection(db, 'pets'),
        where('owner_id', '==', user.id)
      );
      
      const querySnapshot = await getDocs(q);
      const enrichedPets: Pet[] = [];
      
      querySnapshot.forEach((docSnap) => {
        const petData = docSnap.data();
        let extra: any = {};
        
        if (petData.behavior_notes && typeof petData.behavior_notes === 'string' && petData.behavior_notes.trim().startsWith('{')) {
          try {
            extra = JSON.parse(petData.behavior_notes);
          } catch (e) {}
        }
        
        const lsBackup = localStorage.getItem(`gouuji_pet_extra_${docSnap.id}`);
        if (lsBackup) {
          try { extra = { ...extra, ...JSON.parse(lsBackup) }; } catch (e) {}
        }
        
        enrichedPets.push({
          ...petData,
          id: docSnap.id,
          ...extra,
          behavior_notes: extra.general !== undefined ? extra.general : petData.behavior_notes
        } as Pet);
      });

      setPets(enrichedPets);
      if (enrichedPets.length > 0 && !activePetId) {
        setActivePetIdState(enrichedPets[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch pets:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    
    if (isAuthenticated && user) {
      fetchPets();
      
      const q = query(
        collection(db, 'pets'),
        where('owner_id', '==', user.id)
      );
      
      unsubscribe = onSnapshot(q, (snapshot) => {
        console.log('Realtime pet update:', snapshot.docs.length);
        fetchPets();
      });
    } else {
      setPets([]);
      setActivePetIdState(null);
    }
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [isAuthenticated, user]);

  const activePet = pets.find(p => p.id === activePetId) || pets[0] || null;

  const VALID_DB_COLUMNS = [
    'owner_id', 'name', 'species', 'breed', 'age', 'age_months', 
    'gender', 'status', 'live_status_update', 'avatar_url',
    'weight', 'medical_history', 'allergies', 'behavior_notes', 'food_preferences', 'dob'
  ];

  const stripInvalidColumns = (payload: any) => {
    const cleanPayload: any = {};
    for (const key of Object.keys(payload)) {
      if (VALID_DB_COLUMNS.includes(key)) {
        cleanPayload[key] = payload[key];
      }
    }
    return cleanPayload;
  };

  const addPet = async (newPetData: Partial<Pet>) => {
    if (!user) return;
    
    const fullPayload = { ...newPetData, owner_id: user.id };
    const dbPayload = stripInvalidColumns(fullPayload);
    
    const behaviorObj = {
      general: fullPayload.behavior_notes || '',
      aggression_triggers: fullPayload.aggression_triggers || '',
      calming_methods: fullPayload.calming_methods || '',
      skin_details: fullPayload.skin_details || '',
      ideal_temperature: fullPayload.ideal_temperature || '',
      vaccination_report: fullPayload.vaccination_report || '',
      next_vaccination_date: fullPayload.next_vaccination_date || '',
      security_measures: fullPayload.security_measures || '',
      vet_service_required: !!fullPayload.vet_service_required
    };
    dbPayload.behavior_notes = JSON.stringify(behaviorObj);
    dbPayload.created_at = new Date().toISOString();
    
    try {
      const docRef = await addDoc(collection(db, 'pets'), dbPayload);
      
      localStorage.setItem(`gouuji_pet_extra_${docRef.id}`, JSON.stringify({
        aggression_triggers: fullPayload.aggression_triggers || '',
        calming_methods: fullPayload.calming_methods || '',
        skin_details: fullPayload.skin_details || '',
        ideal_temperature: fullPayload.ideal_temperature || '',
        vaccination_report: fullPayload.vaccination_report || '',
        next_vaccination_date: fullPayload.next_vaccination_date || '',
        security_measures: fullPayload.security_measures || '',
        vet_service_required: !!fullPayload.vet_service_required
      }));

      const merged = { ...dbPayload, id: docRef.id, ...newPetData } as Pet;
      setPets(prev => [merged, ...prev]);
      setActivePetIdState(docRef.id);
    } catch (err) {
      console.error('Failed to add pet:', err);
      throw err;
    }
  };

  const updatePet = async (id: string, updatedData: Partial<Pet>) => {
    if (!user) return;
    
    const currentPet = pets.find(p => p.id === id) || {};
    const fullPayload = { ...currentPet, ...updatedData };
    
    const dbPayload = stripInvalidColumns(fullPayload);
    
    const behaviorObj = {
      general: fullPayload.behavior_notes || '',
      aggression_triggers: fullPayload.aggression_triggers || '',
      calming_methods: fullPayload.calming_methods || '',
      skin_details: fullPayload.skin_details || '',
      ideal_temperature: fullPayload.ideal_temperature || '',
      vaccination_report: fullPayload.vaccination_report || '',
      next_vaccination_date: fullPayload.next_vaccination_date || '',
      security_measures: fullPayload.security_measures || '',
      vet_service_required: !!fullPayload.vet_service_required
    };
    dbPayload.behavior_notes = JSON.stringify(behaviorObj);

    localStorage.setItem(`gouuji_pet_extra_${id}`, JSON.stringify({
      aggression_triggers: fullPayload.aggression_triggers || '',
      calming_methods: fullPayload.calming_methods || '',
      skin_details: fullPayload.skin_details || '',
      ideal_temperature: fullPayload.ideal_temperature || '',
      vaccination_report: fullPayload.vaccination_report || '',
      next_vaccination_date: fullPayload.next_vaccination_date || '',
      security_measures: fullPayload.security_measures || '',
      vet_service_required: !!fullPayload.vet_service_required
    }));

    try {
      await updateDoc(doc(db, 'pets', id), dbPayload);
      setPets(prev => prev.map(p => p.id === id ? { ...p, ...fullPayload } as Pet : p));
    } catch (err) {
      console.error('Failed to update pet:', err);
      setPets(prev => prev.map(p => p.id === id ? { ...p, ...fullPayload } as Pet : p));
    }
  };

  return (
    <PetContext.Provider value={{ activePet, setActivePetId: setActivePetIdState, pets, addPet, updatePet, isLoading }}>
      {children}
    </PetContext.Provider>
  );
};

export const usePet = () => {
  const context = useContext(PetContext);
  if (context === undefined) {
    throw new Error('usePet must be used within a PetProvider');
  }
  return context;
};
