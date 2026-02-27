import { useState, useEffect } from 'react';
import { 
  Search, 
  Edit3, 
  Droplets, 
  Utensils, 
  IceCream, 
  Coffee,
  X,
  Plus,
  Trash2,
  Loader2,
  Save,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { Product, Category } from '../types';
import ProductImage from '../components/ProductImage';

export default function PricesView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCategory, setEditCategory] = useState<Category>('Bebida');
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
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
        setProducts(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product)));
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

  const startEditing = (product: Product) => {
    setEditingId(product.id);
    setEditName(product.name);
    setEditPrice(product.price.toString());
    setEditCategory(product.category);
    setIsAdding(false);
  };

  const saveProduct = async () => {
    if (!editName || !editPrice) return;
    
    try {
      const data = {
        name: editName,
        price: Number(editPrice),
        category: editCategory,
        icon: editCategory === 'Bebida' ? 'CupSoda' : 
              editCategory === 'Dulces' ? 'IceCream' : 'Utensils'
      };

      if (isAdding) {
        await addDoc(collection(db, 'products'), data);
        setIsAdding(false);
      } else if (editingId) {
        await updateDoc(doc(db, 'products', editingId), data);
        setEditingId(null);
      }
      
      setEditName('');
      setEditPrice('');
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  const deleteProduct = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      try {
        await deleteDoc(doc(db, 'products', id));
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

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
    <div className="p-4">
      <div className="flex flex-col items-center mb-4">
        <p className="text-xs text-primary font-semibold">Tienda Escolar San José</p>
      </div>

      {/* Search & Add */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-primary">
            <Search size={20} />
          </div>
          <input 
            className="w-full h-12 pl-12 pr-4 rounded-xl border-none bg-primary/10 text-slate-900 placeholder:text-primary/60 focus:ring-2 focus:ring-primary" 
            placeholder="Buscar producto..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button 
          onClick={() => {
            setIsAdding(true);
            setEditingId(null);
            setEditName('');
            setEditPrice('');
            setEditCategory('Bebida');
          }}
          className="bg-primary text-slate-900 size-12 rounded-xl flex items-center justify-center shadow-md active:scale-95"
        >
          <Plus size={24} />
        </button>
      </div>

      {/* Categories Scroll */}
      <div className="flex gap-3 mb-6 overflow-x-auto no-scrollbar pb-2">
        <button className="flex h-10 shrink-0 items-center justify-center rounded-xl bg-primary px-4 text-slate-900 font-bold shadow-md">
          Todos
        </button>
        {['Bebida', 'Mecato', 'Dulces', 'Sal'].map(cat => (
          <button key={cat} className="flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-xl bg-primary/10 px-4 text-slate-900 font-medium border border-primary/20">
            <span className="text-sm">{cat}</span>
          </button>
        ))}
      </div>

      {/* Add/Edit Form */}
      <AnimatePresence>
        {(isAdding || editingId) && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-6 bg-white p-4 rounded-xl shadow-md border-2 border-primary overflow-hidden"
          >
            <h4 className="text-sm font-bold mb-3 text-slate-700">{isAdding ? 'Nuevo Producto' : 'Editar Producto'}</h4>
            <div className="space-y-3">
              <input 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-primary" 
                placeholder="Nombre del producto"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
              <div className="flex gap-2">
                <input 
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-primary" 
                  placeholder="Precio"
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                />
                <select 
                  className="bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-primary"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as Category)}
                >
                  <option value="Bebida">Bebida</option>
                  <option value="Mecato">Mecato</option>
                  <option value="Dulces">Dulces</option>
                  <option value="Sal">Sal</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button 
                  onClick={saveProduct}
                  className="flex-1 bg-primary text-slate-900 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                >
                  <Save size={16} /> Guardar
                </button>
                <button 
                  onClick={() => { setIsAdding(false); setEditingId(null); }}
                  className="px-4 bg-slate-100 text-slate-500 py-2 rounded-lg font-bold text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product List */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-slate-900 text-base font-bold">Catálogo de Productos</h3>
        <span className="text-xs font-medium text-slate-500 bg-slate-200 px-2 py-1 rounded">{filteredProducts.length} Items</span>
      </div>

      <div className="space-y-3">
        {filteredProducts.map((product) => (
          <div key={product.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-slate-100">
                <ProductImage productName={product.name} className="w-full h-full rounded-lg" />
              </div>
              <div>
                <p className="font-bold text-slate-900">{product.name}</p>
                <p className="text-xs text-slate-500">{product.category}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-bold text-slate-900">${product.price.toLocaleString('es-CO')}</p>
                <button 
                  onClick={() => startEditing(product)}
                  className="mt-1 text-xs font-bold text-primary flex items-center justify-end gap-1 hover:underline"
                >
                  <Edit3 size={12} /> Editar
                </button>
              </div>
              <button 
                onClick={() => deleteProduct(product.id)}
                className="text-slate-300 hover:text-red-500 transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
