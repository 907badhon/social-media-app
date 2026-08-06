import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAYAYidV_Qzhg2z5KIv2YXGnMigGbr4mz0",
  authDomain: "social-media-backend-af837.firebaseapp.com",
  projectId: "social-media-backend-af837",
  storageBucket: "social-media-backend-af837.firebasestorage.app",
  messagingSenderId: "918382625344",
  appId: "1:918382625344:web:ca1442a3aec9ac095995a5",
  measurementId: "G-C0WSM9JYNH",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
