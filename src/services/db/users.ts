import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";
import type { UserProfile } from "../../types/user";

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const docRef = doc(db, "users", uid);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    return docSnap.data() as UserProfile;
  }
  return null;
};

export const updateUserProfile = async (uid: string, data: Partial<UserProfile>): Promise<void> => {
  const docRef = doc(db, "users", uid);
  await updateDoc(docRef, data);
};

export const searchUsersByEmail = async (email: string): Promise<UserProfile[]> => {
  const q = query(collection(db, "users"), where("email", "==", email));
  const querySnapshot = await getDocs(q);
  const users: UserProfile[] = [];
  querySnapshot.forEach((doc) => {
    users.push(doc.data() as UserProfile);
  });
  return users;
};
