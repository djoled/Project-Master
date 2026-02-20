
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAVCV3ByVIMLd4acgxV22_swj80BLtgr48",
  authDomain: "project-master-101.firebaseapp.com",
  projectId: "project-master-101",
  storageBucket: "project-master-101.firebasestorage.app",
  messagingSenderId: "805917410561",
  appId: "1:805917410561:web:33a509f01571fe7ce0c700",
  measurementId: "G-16PCF9JGDZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
