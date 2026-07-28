import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc, collection, getDocs, deleteDoc } from "firebase/firestore";
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

async function approvePartner() {
  const auth = getAuth(app);
  await signInWithEmailAndPassword(auth, "admin@gouujipets.com", "Admin@123456");

  console.log("Updating businesses for partner 8157502f-ca02-4488-9db5-15a7f7990d42 to active...");
  
  // 1. Update the business document 8157502f-ca02-4488-9db5-15a7f7990d42 to active
  const docRef1 = doc(db, "businesses", "8157502f-ca02-4488-9db5-15a7f7990d42");
  await updateDoc(docRef1, { status: "active" });
  console.log("- Updated business 8157502f-ca02-4488-9db5-15a7f7990d42 to active");

  // 2. Delete the duplicate/suspended business EWdStoq4uRsxkpWbxfpG to avoid confusion
  const docRef2 = doc(db, "businesses", "EWdStoq4uRsxkpWbxfpG");
  await deleteDoc(docRef2);
  console.log("- Deleted duplicate/suspended business EWdStoq4uRsxkpWbxfpG");

  console.log("Successfully approved partner!");
  process.exit(0);
}

approvePartner();
