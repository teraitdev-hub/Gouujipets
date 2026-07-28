import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, orderBy, query } from "firebase/firestore";

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

async function checkRecent() {
  console.log("Checking businesses in Firestore...");
  const snap = await getDocs(collection(db, "businesses"));
  for (const d of snap.docs) {
    const data = d.data();
    console.log(`- Biz: "${data.name}" | Email: "${data.email || data.contact_email}" | Status: "${data.status}" | Owner: "${data.owner_id}"`);
  }
  process.exit(0);
}

checkRecent();
