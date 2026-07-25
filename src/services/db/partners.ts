import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, GeoPoint } from "firebase/firestore";
import { db } from "../../lib/firebase";
import type { PartnerProfile } from "../../types/partner";

export const createPartnerProfile = async (uid: string, data: Partial<PartnerProfile>): Promise<void> => {
  const docRef = doc(db, "businesses", uid);
  await setDoc(docRef, { ...data, owner_id: uid, status: 'pending', createdAt: new Date().toISOString() });
};

export const getPartnerProfile = async (uid: string): Promise<PartnerProfile | null> => {
  const docRef = doc(db, "businesses", uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as PartnerProfile;
  }
  return null;
};

export const updatePartnerProfile = async (uid: string, data: Partial<PartnerProfile>): Promise<void> => {
  const docRef = doc(db, "businesses", uid);
  await updateDoc(docRef, data);
};

export const getActivePartnersByType = async (type: string): Promise<PartnerProfile[]> => {
  const q = query(collection(db, "businesses"), where("type", "==", type), where("status", "==", "active"));
  const querySnapshot = await getDocs(q);
  const partners: PartnerProfile[] = [];
  querySnapshot.forEach((doc) => {
    partners.push(doc.data() as PartnerProfile);
  });
  return partners;
};
