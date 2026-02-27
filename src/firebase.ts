import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, setDoc, doc } from "firebase/firestore";
import { getDatabase } from "firebase/database";

// Configuración de Firebase (Realtime Database + Firestore)
// Puedes sobrescribir con variables de entorno en .env.local si lo prefieres
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCJvdh23_b4ypCq7xDI0wyRGmUdrC5JNSg",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "tienda-2e20c.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "tienda-2e20c",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "tienda-2e20c.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "625597045655",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:625597045655:web:4e0757f8ada39252df82d2"
};

const app = initializeApp(firebaseConfig);

// Firestore (usado por inventario, precios, POS, reportes)
export const db = getFirestore(app);

// Realtime Database (URL de tu base de datos)
const REALTIME_DB_URL = "https://tienda-2e20c-default-rtdb.firebaseio.com";
export const realtimeDb = getDatabase(app, REALTIME_DB_URL);

// Initial products data as requested
const INITIAL_PRODUCTS = [
  // Bebida
  { name: 'Gaseosa', price: 2500, category: 'Bebida', icon: 'CupSoda' },
  { name: 'Agua', price: 1500, category: 'Bebida', icon: 'CupSoda' },
  { name: 'Agua Gas', price: 1800, category: 'Bebida', icon: 'CupSoda' },
  { name: 'Café', price: 1000, category: 'Bebida', icon: 'Coffee' },
  { name: 'Café con leche', price: 2000, category: 'Bebida', icon: 'Coffee' },
  { name: 'Té', price: 2200, category: 'Bebida', icon: 'Coffee' },
  // Mecato
  { name: 'Papas', price: 3000, category: 'Mecato', icon: 'Utensils' },
  { name: 'Doritos', price: 3500, category: 'Mecato', icon: 'Utensils' },
  { name: 'De Todito', price: 4000, category: 'Mecato', icon: 'Utensils' },
  { name: 'Yupi', price: 2500, category: 'Mecato', icon: 'Utensils' },
  { name: 'Platanitos', price: 2800, category: 'Mecato', icon: 'Utensils' },
  // Dulces
  { name: 'Bom Bom', price: 500, category: 'Dulces', icon: 'IceCream' },
  { name: 'Menta', price: 200, category: 'Dulces', icon: 'IceCream' },
  { name: 'Chocolate pequeño', price: 1000, category: 'Dulces', icon: 'IceCream' },
  { name: 'Chocolate Jet', price: 1500, category: 'Dulces', icon: 'IceCream' },
  { name: 'Chocolate grande', price: 3000, category: 'Dulces', icon: 'IceCream' },
  { name: 'ChocoBreak', price: 300, category: 'Dulces', icon: 'IceCream' },
  { name: 'Fruna', price: 400, category: 'Dulces', icon: 'IceCream' },
  // Sal
  { name: 'Empanada', price: 2000, category: 'Sal', icon: 'Utensils' },
  { name: 'Dedito', price: 2500, category: 'Sal', icon: 'Utensils' },
  { name: 'Aborrajado', price: 3000, category: 'Sal', icon: 'Utensils' },
  { name: 'Papa Rellena', price: 3500, category: 'Sal', icon: 'Utensils' },
  { name: 'Pan', price: 1000, category: 'Sal', icon: 'Utensils' },
  { name: 'Buñuelo', price: 1200, category: 'Sal', icon: 'Utensils' },
];

export async function initializeProducts() {
  const productsCol = collection(db, 'products');
  const timeoutMs = 8000;
  const snapshot = await Promise.race([
    getDocs(productsCol),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout inicializando productos (Firestore)')), timeoutMs)
    ),
  ]);
  if (snapshot.empty) {
    console.log('Initializing products collection...');
    for (const p of INITIAL_PRODUCTS) {
      const newDoc = doc(productsCol);
      await setDoc(newDoc, { ...p, id: newDoc.id });
    }
  }
}
