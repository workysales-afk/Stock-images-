// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDvd3f3JvoHEdnw46HNMHm13DZ392FL4NM",
  authDomain: "free-stock-images-9e7a0.firebaseapp.com",
  projectId: "free-stock-images-9e7a0",
  storageBucket: "free-stock-images-9e7a0.firebasestorage.app",
  messagingSenderId: "927985896075",
  appId: "1:927985896075:web:1c298e8c38e6dae1c0228e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);