import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, addDoc, setDoc, doc } from "firebase/firestore";

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
const db = getFirestore(app);

const SEED_PRODUCTS = [
  {
    id: "p1",
    name: "Premium Royal Canin Golden Retriever Adult Dry Dog Food",
    category: "Food",
    price: 35.99,
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&q=80&w=600"
  },
  {
    id: "p2",
    name: "Interactive Puzzle Toy for Dogs",
    category: "Toys",
    price: 15.50,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1576201836106-db1758fd1c97?auto=format&fit=crop&q=80&w=600"
  },
  {
    id: "p3",
    name: "Comfort Orthopedic Pet Bed",
    category: "Accessories",
    price: 45.00,
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&q=80&w=600"
  }
];

const SEED_CONVERSATIONS = [
  {
    id: "c1",
    participants: ["customer_priya", "partner_dr_sharma"],
    lastMessage: "Your test results are ready.",
    updatedAt: new Date().toISOString(),
    senderName: "Dr. Sarah Jenkins",
    avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=150",
    online: true,
    unread: 2,
    user_id: "customer_priya"
  },
  {
    id: "c2",
    participants: ["customer_priya", "partner_anita_rao"],
    lastMessage: "See you tomorrow at 2 PM! We have prepared everything for Bella.",
    updatedAt: new Date(Date.now() - 86400000).toISOString(), // yesterday
    senderName: "Downtown Groomers",
    avatar: "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&q=80&w=150",
    online: false,
    unread: 0,
    user_id: "customer_priya"
  },
  {
    id: "c3",
    participants: ["customer_priya", "partner_dr_sharma"],
    lastMessage: "Bella is doing great today, ate all her food and played with the other dogs.",
    updatedAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    senderName: "City Pet Boarding",
    avatar: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=150",
    online: true,
    unread: 0,
    user_id: "customer_priya"
  }
];

async function seed() {
  console.log("Authenticating...");
  await signInWithEmailAndPassword(auth, "admin@gouujipets.com", "Admin@123456");
  
  console.log("Seeding products...");
  for (const product of SEED_PRODUCTS) {
    await setDoc(doc(db, "products", product.id), product);
    console.log(` ✔ Seeded product: ${product.name}`);
  }

  console.log("Seeding conversations...");
  for (const conv of SEED_CONVERSATIONS) {
    await setDoc(doc(db, "conversations", conv.id), conv);
    console.log(` ✔ Seeded conversation with: ${conv.senderName}`);
  }

  console.log("Done seeding features!");
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
