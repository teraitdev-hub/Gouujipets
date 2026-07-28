import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

async function checkAll() {
  console.log("=== ALL BUSINESSES IN FIRESTORE ===");
  const bSnap = await getDocs(collection(db, "businesses"));
  for (const doc of bSnap.docs) {
    const d = doc.data();
    console.log(`Biz ID: ${doc.id} | Name: "${d.name}" | Email: "${d.email || d.contact_email}" | Status: "${d.status}" | OwnerUID: "${d.owner_id}"`);
  }

  console.log("\n=== ALL USERS IN FIRESTORE ===");
  const uSnap = await getDocs(collection(db, "users"));
  for (const doc of uSnap.docs) {
    const d = doc.data();
    if (!d.email || !d.email.includes("gouuji") && !d.email.includes("paw") && !d.email.includes("in") && !d.email.includes("com")) {
      console.log(`User ID: ${doc.id} | Email: "${d.email}" | Name: "${d.full_name || d.name}" | Role: "${d.role}" | Phone: "${d.phone}"`);
    } else if (d.email && (d.email.includes("gmail") || d.email.includes("yahoo") || d.email.includes("outlook") || d.email.includes("test"))) {
      console.log(`User ID: ${doc.id} | Email: "${d.email}" | Name: "${d.full_name || d.name}" | Role: "${d.role}" | Phone: "${d.phone}"`);
    }
  }

  process.exit(0);
}

checkAll();
