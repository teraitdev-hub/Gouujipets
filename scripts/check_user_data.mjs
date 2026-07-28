import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, getDoc } from "firebase/firestore";

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

async function checkUser() {
  console.log("Checking user Zz8ILWk3LZgKAxf4UnNowJEI7Z92...");
  const u = await getDoc(doc(db, "users", "Zz8ILWk3LZgKAxf4UnNowJEI7Z92"));
  if (u.exists()) {
    console.log("User data:", u.data());
  } else {
    console.log("User doc not found!");
  }

  console.log("\nChecking all users...");
  const snap = await getDocs(collection(db, "users"));
  for (const d of snap.docs) {
    const data = d.data();
    console.log(`- ID: ${d.id} | Email: ${data.email} | Name: ${data.full_name || data.name} | Role: ${data.role}`);
  }
  process.exit(0);
}

checkUser();
