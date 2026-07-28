import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

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

async function listMail() {
  const auth = getAuth(app);
  await signInWithEmailAndPassword(auth, "admin@gouujipets.com", "Admin@123456");

  console.log("--- RECENT MAIL DOCUMENTS IN FIRESTORE ---");
  const mailRef = collection(db, "mail");
  const snap = await getDocs(mailRef);
  
  if (snap.empty) {
    console.log("No mail documents found in Firestore 'mail' collection.");
  } else {
    snap.forEach(d => {
      console.log(d.id, JSON.stringify(d.data(), null, 2));
    });
  }
  process.exit(0);
}

listMail();
