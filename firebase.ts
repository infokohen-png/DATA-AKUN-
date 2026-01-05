
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAOAf-kxpVVV4XMZl3DdFd02_LeTrpYOSg",
  authDomain: "olah-data-f30c7.firebaseapp.com",
  projectId: "olah-data-f30c7",
  storageBucket: "olah-data-f30c7.firebasestorage.app",
  messagingSenderId: "427010174214",
  appId: "1:427010174214:web:3827bb22f84b73f7fd0287",
  measurementId: "G-M0BGNPVGR3"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
// Inisialisasi storage dengan bucket spesifik
export const storage = getStorage(app, "gs://olah-data-f30c7.firebasestorage.app");
