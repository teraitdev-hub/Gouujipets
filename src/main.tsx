import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { MapProvider } from './context/MapContext'

// FORCE WIPE DUMMY DATA SCRIPT & AUTO-FIX TIMESTAMPS
import { db } from './lib/firebase'
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore'
setTimeout(async () => {
  try {
    const snap = await getDocs(collection(db, 'businesses'));
    const dummyNames = ["Glamour Hounds", "Waggy Tails Daycare Club", "new", "Urban Strides Pet Care", "Splash Dog Pool", "Splash Paws Swimming Pool", "Luxe Pet Spa & Grooming", "Cozy Nook Pet Sitters", "new pet", "Smart Paws Tricks & Treats", "Cozy Pet Daycare", "Aqua Paws Hydrotherapy", "Home Sweet Home Pet Sitting", "Paws & Bubbles Grooming", "Alpha Dog Training Academy", "Pro Dog Training Academy", "The Barking Lot", "Furry Friends Companion", "Happy Tails Walking", "The Fluffy Bubble", "Happy Tails Dog Walking", "pets grooming"];
    
    for (const d of snap.docs) {
      const bizName = (d.data().name || "").trim();
      if (dummyNames.includes(bizName)) {
        await deleteDoc(doc(db, 'businesses', d.id));
        console.log('DELETED DUMMY:', bizName);
      } else {
        // If it's a real business but missing created_at, give it one so it appears in ordered queries
        if (!d.data().created_at) {
          await updateDoc(doc(db, 'businesses', d.id), { created_at: new Date().toISOString() });
          console.log('PATCHED MISSING TIMESTAMP:', bizName);
        }
      }
    }
  } catch(e) {}
}, 2000);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <MapProvider>
        <App />
      </MapProvider>
    </BrowserRouter>
  </StrictMode>,
)
