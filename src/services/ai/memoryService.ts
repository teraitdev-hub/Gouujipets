import { db } from '../../lib/firebase';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import type {  AIMemory, AIConversation, AIContext  }   from '../../types/ai';

const MEMORY_COLLECTION = 'aiMemory';
const CONVERSATION_COLLECTION = 'aiConversations';

export async function saveMemory(memory: Omit<AIMemory, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const q = query(
    collection(db, MEMORY_COLLECTION),
    where('userId', '==', memory.userId),
    where('key', '==', memory.key)
  );

  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    // Update existing memory
    const docId = snapshot.docs[0].id;
    const docRef = doc(db, MEMORY_COLLECTION, docId);
    await updateDoc(docRef, {
      value: memory.value,
      category: memory.category,
      confidence: memory.confidence,
      source: memory.source,
      updatedAt: serverTimestamp()
    });
    return docId;
  } else {
    // Create new memory
    const docRef = await addDoc(collection(db, MEMORY_COLLECTION), {
      ...memory,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return docRef.id;
  }
}

export async function getMemories(userId: string, category?: string): Promise<AIMemory[]> {
  let q;
  if (category) {
    q = query(
      collection(db, MEMORY_COLLECTION),
      where('userId', '==', userId),
      where('category', '==', category)
    );
  } else {
    q = query(
      collection(db, MEMORY_COLLECTION),
      where('userId', '==', userId)
    );
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as AIMemory[];
}

export function extractMemories(message: string, context: AIContext): AIMemory[] {
  const lowerMsg = message.toLowerCase();
  const memories: AIMemory[] = [];
  const userId = context.user?.id || 'anonymous';

  if (userId === 'anonymous') return memories;

  // Extract Pet Name
  const myDogMatch = lowerMsg.match(/my dog (is named |is |named )?([a-z]+)/i);
  if (myDogMatch && myDogMatch[2]) {
    memories.push({
      id: '',
      userId,
      key: 'dog_name',
      value: myDogMatch[2],
      category: 'pet_info',
      confidence: 0.8,
      source: 'user_message',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  const myCatMatch = lowerMsg.match(/my cat (is named |is |named )?([a-z]+)/i);
  if (myCatMatch && myCatMatch[2]) {
    memories.push({
      id: '',
      userId,
      key: 'cat_name',
      value: myCatMatch[2],
      category: 'pet_info',
      confidence: 0.8,
      source: 'user_message',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  // Extract Breed
  const breedMatch = lowerMsg.match(/(is a|is an) ([a-z ]+)( breed| dog| cat)/i);
  if (breedMatch && breedMatch[2]) {
    memories.push({
      id: '',
      userId,
      key: 'pet_breed',
      value: breedMatch[2].trim(),
      category: 'pet_info',
      confidence: 0.7,
      source: 'user_message',
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  // Extract Food Preference
  const foodMatch = lowerMsg.match(/only eats (.*)|loves to eat (.*)/i);
  if (foodMatch) {
    const food = foodMatch[1] || foodMatch[2];
    if (food) {
      memories.push({
        id: '',
        userId,
        key: 'food_preference',
        value: food.trim(),
        category: 'preference',
        confidence: 0.8,
        source: 'user_message',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  }

  // Extract Location
  const locationMatch = lowerMsg.match(/live in (.*)|stay in (.*)/i);
  if (locationMatch) {
    const location = locationMatch[1] || locationMatch[2];
    if (location) {
      memories.push({
        id: '',
        userId,
        key: 'user_location',
        value: location.trim(),
        category: 'user_info',
        confidence: 0.9,
        source: 'user_message',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
  }

  return memories;
}

export async function saveConversation(conv: Omit<AIConversation, 'id'>): Promise<string> {
  const docRef = await addDoc(collection(db, CONVERSATION_COLLECTION), {
    ...conv,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return docRef.id;
}

export async function getConversations(userId: string): Promise<AIConversation[]> {
  const q = query(
    collection(db, CONVERSATION_COLLECTION),
    where('userId', '==', userId),
    orderBy('updatedAt', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as AIConversation[];
}

export async function updateConversation(id: string, updates: Partial<AIConversation>): Promise<void> {
  const docRef = doc(db, CONVERSATION_COLLECTION, id);
  await updateDoc(docRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
}

export async function deleteConversation(id: string): Promise<void> {
  const docRef = doc(db, CONVERSATION_COLLECTION, id);
  await deleteDoc(docRef);
}
