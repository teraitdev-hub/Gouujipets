import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';

// Check if we already have an app initialized to prevent duplicate app errors
const serviceAccount = JSON.parse(readFileSync('./serviceAccountKey.json', 'utf8'));

if (process.argv.includes('--init')) {
  initializeApp({
    credential: cert(serviceAccount)
  });
} else {
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();

const products = [
  {
    name: "Premium Royal Canin Golden Retriever Adult Dry Dog Food",
    category: "Food",
    price: 35.99,
    rating: 4.8,
    image: "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&q=80&w=600"
  },
  {
    name: "Interactive Puzzle Toy for Dogs",
    category: "Toys",
    price: 15.50,
    rating: 4.5,
    image: "https://images.unsplash.com/photo-1576201836106-db1758fd1c97?auto=format&fit=crop&q=80&w=600"
  },
  {
    name: "Comfort Orthopedic Pet Bed",
    category: "Accessories",
    price: 45.00,
    rating: 4.9,
    image: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&q=80&w=600"
  }
];

const conversations = [
  {
    participants: ["user_demo_1", "partner_dr_sarah"],
    lastMessage: "Your test results are ready.",
    updatedAt: new Date(),
    senderName: "Dr. Sarah Jenkins",
    avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=150",
    online: true,
    unread: 2
  },
  {
    participants: ["user_demo_1", "partner_downtown"],
    lastMessage: "See you tomorrow at 2 PM! We have prepared everything for Bella.",
    updatedAt: new Date(Date.now() - 86400000), // yesterday
    senderName: "Downtown Groomers",
    avatar: "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&q=80&w=150",
    online: false,
    unread: 0
  },
  {
    participants: ["user_demo_1", "partner_city_pet"],
    lastMessage: "Bella is doing great today, ate all her food and played with the other dogs.",
    updatedAt: new Date(Date.now() - 172800000), // 2 days ago
    senderName: "City Pet Boarding",
    avatar: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&q=80&w=150",
    online: true,
    unread: 0
  }
];

async function seed() {
  console.log("Seeding products...");
  for (const product of products) {
    await db.collection("products").add({
      ...product,
      created_at: new Date().toISOString()
    });
  }

  console.log("Seeding conversations...");
  for (const conv of conversations) {
    await db.collection("conversations").add({
      ...conv,
      created_at: new Date().toISOString()
    });
  }

  console.log("Done seeding features!");
  process.exit(0);
}

seed().catch(console.error);
