import { useState, useEffect } from 'react';
import {
  CupSoda,
  Coffee,
  IceCream,
  Utensils,
  ShoppingCart,
  Trash2,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Product, Category, CartItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import ProductImage from '../components/ProductImage';
import { collection, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';

const CATEGORIES: { name: Category; icon: any }[] = [
  { name: 'Bebida', icon: CupSoda },
  { name: 'Mecato', icon: Utensils },
  { name: 'Dulces', icon: IceCream },
  { name: 'Sal', icon: Utensils },
];

export default function POSView() {
  const [selectedCategory, setSelectedCategory] = useState<Category>('Bebida');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setFirestoreError(prev => prev ?? 'La conexión tardó demasiado. Puede ser un problema temporal.');
    }, 20000);

    const unsub = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        clearTimeout(timeoutId);
        const prods = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
        setProducts(prods);
        setLoading(false);
        setFirestoreError(null);
      },
      (err) => {
        clearTimeout(timeoutId);
        console.error('Firestore products:', err);
        setLoading(false);
        setFirestoreError(err.message || 'Error al conectar con Firestore.');
      }
    );
    return () => {
      clearTimeout(timeoutId);
      unsub();
    };
  }, [retryCount]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const clearCart = () => setCart([]);

  const confirmSale = async () => {
    if (cart.length === 0) return;
    setIsConfirming(true);
    console.log('Iniciando confirmación de venta...', cart);

    try {
      const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

      // Añadimos un timeout para que no se quede cargando si Firebase no responde
      const salePromise = addDoc(collection(db, 'sales'), {
        items: cart,
        total,
        timestamp: serverTimestamp(),
      });

      // Update product stocks
      const stockUpdates = cart.map(item =>
        updateDoc(doc(db, 'products', item.id), {
          stock: increment(-item.quantity)
        })
      );

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Tiempo de espera agotado. Revisa tu conexión a Firebase.')), 10000)
      );

      await Promise.race([salePromise, Promise.all(stockUpdates), timeoutPromise]);

      console.log('Venta guardada exitosamente en Firebase');
      clearCart();
      alert('¡Venta confirmada exitosamente!');
    } catch (error: any) {
      console.error('Error detallado al confirmar venta:', error);
      alert(`Error: ${error.message || 'No se pudo conectar con Firebase. Revisa tus Secrets y las reglas de Firestore.'}`);
    } finally {
      setIsConfirming(false);
    }
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="animate-spin text-primary" size={40} />
        <p className="text-sm text-slate-500">Cargando productos...</p>
      </div>
    );
  }

  if (firestoreError) {
    return (
      <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
        <p className="font-medium">No se pudieron cargar los productos</p>
        <p className="text-sm mt-1">{firestoreError}</p>
        <button
          type="button"
          onClick={() => { setFirestoreError(null); setLoading(true); setRetryCount(c => c + 1); }}
          className="mt-3 flex items-center gap-2 px-4 py-2 bg-amber-200 hover:bg-amber-300 rounded-lg font-medium text-amber-900 transition-colors"
        >
          <RefreshCw size={18} />
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Categories */}
      <div className="mb-6 md:mb-8">
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 px-1">Categorías</h2>
        <div className="grid grid-cols-4 md:flex md:flex-wrap md:gap-3 gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setSelectedCategory(cat.name)}
              className={`flex flex-col items-center gap-1 rounded-xl p-3 md:px-4 transition-all border-2 ${selectedCategory === cat.name
                ? 'bg-primary/10 border-primary text-primary'
                : 'bg-white border-transparent text-slate-500 shadow-sm'
                }`}
            >
              <cat.icon size={20} />
              <span className="text-[10px] font-bold">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Products */}
      <div className="md:mt-2">
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">Productos: {selectedCategory}</h2>
          <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-full font-bold">
            {products.filter(p => p.category === selectedCategory).length} items
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {products.filter(p => p.category === selectedCategory).map((product) => (
            <motion.button
              whileTap={{ scale: 0.95 }}
              key={product.id}
              onClick={() => addToCart(product)}
              className="group relative flex flex-col gap-2 overflow-hidden rounded-xl bg-white p-2 shadow-sm border border-slate-200 transition-all"
            >
              <div className="aspect-square w-full rounded-lg overflow-hidden bg-slate-100">
                <ProductImage productName={product.name} imageUrl={product.imageUrl} className="w-full h-full rounded-lg" />
              </div>
              <div className="px-1 pb-1 text-center md:text-left">
                <p className="text-sm md:text-[15px] font-bold truncate text-slate-800">{product.name}</p>
                <div className="flex items-center justify-between mt-0.5">
                  <p className="text-xs md:text-sm text-primary font-bold">${product.price.toLocaleString('es-CO')}</p>
                  <p className="text-[10px] md:text-xs text-slate-500 font-medium">Stock: {product.stock || 0}</p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Cart Summary Floating */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-[88px] left-4 right-4 z-20 max-w-[calc(28rem-2rem)] mx-auto"
          >
            <div className="flex flex-col rounded-2xl bg-white p-4 md:p-5 shadow-2xl border border-primary/20 ring-1 ring-black/5 md:flex-row md:items-center md:justify-between md:gap-6">
              <div className="flex items-center justify-between mb-3 md:mb-0 md:flex-col md:items-start md:gap-2">
                <div className="flex items-center gap-2">
                  <ShoppingCart size={18} className="text-slate-400" />
                  <span className="text-sm font-bold text-slate-700">Carrito de Venta</span>
                  <span className="bg-primary/20 text-primary text-[10px] font-black px-1.5 py-0.5 rounded-md">{itemCount}</span>
                </div>
                <button
                  onClick={clearCart}
                  className="text-[10px] text-red-500 font-black uppercase tracking-widest flex items-center gap-1"
                >
                  <Trash2 size={12} /> Limpiar
                </button>
              </div>
              <div className="flex items-center justify-between mb-4 border-t border-slate-100 pt-3 md:border-none md:pt-0 md:mb-0 md:flex-col md:items-end md:gap-1">
                <span className="text-base font-bold text-slate-500">Total</span>
                <span className="text-2xl md:text-3xl font-black text-primary">${total.toLocaleString('es-CO')}</span>
              </div>
              <button
                onClick={confirmSale}
                disabled={isConfirming}
                className="w-full md:w-auto md:min-w-[220px] rounded-xl bg-primary py-4 px-6 text-center text-slate-900 font-black text-lg active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isConfirming && <Loader2 className="animate-spin" size={20} />}
                Confirmar Venta
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
