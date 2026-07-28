import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB1COW2uZ9YP-sYosaESXgRX1AOs6LVknE",
  authDomain: "gouujipets.firebaseapp.com",
  projectId: "gouujipets",
  storageBucket: "gouujipets.firebasestorage.app",
  messagingSenderId: "591158355137",
  appId: "1:591158355137:web:83e6ecd166cd8cf522a040"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function testAuth() {
  const testEmail = `test_partner_${Date.now()}@example.com`;
  const testPassword = "Password123!";

  console.log(`Testing with email: ${testEmail}`);
  
  try {
    console.log("1. Creating user...");
    const userCred = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
    console.log("User created! UID:", userCred.user.uid);

    console.log("2. Signing out...");
    await auth.signOut();
    console.log("Signed out.");

    console.log("3. Signing in with exact same credentials...");
    const signInCred = await signInWithEmailAndPassword(auth, testEmail, testPassword);
    console.log("Sign in successful! UID:", signInCred.user.uid);
    
    console.log("Auth flow is working perfectly.");
  } catch (error) {
    console.error("Auth flow failed!");
    console.error("Error Code:", error.code);
    console.error("Error Message:", error.message);
  }
  process.exit(0);
}

testAuth();
