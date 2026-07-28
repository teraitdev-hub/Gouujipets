import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, orderBy } from "firebase/firestore";

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

import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

async function listUsers() {
  const auth = getAuth(app);
  await signInWithEmailAndPassword(auth, "admin@gouujipets.com", "Admin@123456");
  
  const usersRef = collection(db, "users");
  const usersSnap = await getDocs(usersRef);
  console.log("--- ALL USERS IN FIRESTORE ---");
  usersSnap.forEach(d => {
    console.log(d.id, d.data());
  });

  const bizRef = collection(db, "businesses");
  const bizSnap = await getDocs(bizRef);
  console.log("\n--- ALL BUSINESSES IN FIRESTORE ---");
  bizSnap.forEach(d => {
    console.log(d.id, d.data());
  });

  process.exit(0);
}

listUsers();
