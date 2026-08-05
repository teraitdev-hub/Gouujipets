import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB1COW2uZ9YP-sYosaESXgRX1AOs6LVknE",
  authDomain: "gouujipets.firebaseapp.com",
  projectId: "gouujipets",
  storageBucket: "gouujipets.firebasestorage.app",
  messagingSenderId: "591158355137",
  appId: "1:591158355137:web:83e6ecd166cd8cf522a040"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkBusinesses() {
  console.log("Checking businesses in Firestore...");
  try {
    const bizSnap = await getDocs(collection(db, "businesses"));
    console.log(`Found ${bizSnap.docs.length} businesses.`);
    for (const d of bizSnap.docs) {
      console.log(`- ${d.id}: ${d.data().name}`);
    }
  } catch(e) {
    console.error("Error:", e);
  }
  process.exit(0);
}

checkBusinesses();
