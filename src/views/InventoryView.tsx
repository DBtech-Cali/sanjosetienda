import { useState, useEffect, FormEvent } from 'react';
import { 
  Calendar, 
  Tag, 
  Hash, 
  DollarSign, 
  PlusCircle,
  ChevronRight,
  PenLine,
  Eraser,
  Square,
  Loader2,
  Edit2,
  RefreshCw
} from 'lucide-react';
import { motion } from 'motion/react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, serverTimestamp, query, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { PurchaseRecord } from '../types';

export default function InventoryView() {
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [quantity, setQuantity] = useState<number>(0);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [recentEntries, setRecentEntries] = useState<PurchaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingEntry, setEditingEntry] = useState<PurchaseRecord | null>(null);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setFirestoreError(prev => prev ?? 'La conexión tardó demasiado. Puede ser un problema temporal.');
    }, 20000);

    const q = query(collection(db, 'purchases'), orderBy('timestamp', 'desc'), limit(10));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        clearTimeout(timeoutId);
        const entries = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as PurchaseRecord));
        setRecentEntries(entries);
        setLoading(false);
        setFirestoreError(null);
      },
      (err) => {
        clearTimeout(timeoutId);
        console.error('Firestore purchases:', err);
        setLoading(false);
        setFirestoreError(err.message || 'Error al conectar con Firestore.');
      }
    );
    return () => {
      clearTimeout(timeoutId);
      unsub();
    };
  }, [retryCount]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name || quantity <= 0 || unitCost <= 0) return;
    
    setIsSubmitting(true);
    try {
      const totalCost = quantity * unitCost;
      if (editingEntry) {
        await updateDoc(doc(db, 'purchases', editingEntry.id), {
          name,
          date,
          quantity,
          unitCost,
          totalCost,
        });
        setEditingEntry(null);
      } else {
        await addDoc(collection(db, 'purchases'), {
          name,
          date,
          quantity,
          unitCost,
          totalCost,
          timestamp: serverTimestamp(),
        });
      }
      setName('');
      setQuantity(0);
      setUnitCost(0);
    } catch (error) {
      console.error('Error saving purchase:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (entry: PurchaseRecord) => {
    setEditingEntry(entry);
    setName(entry.name);
    setDate(entry.date);
    setQuantity(entry.quantity);
    setUnitCost(entry.unitCost);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalCost = quantity * unitCost;

  if (firestoreError) {
    return (
      <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 mx-4">
        <p className="font-medium">No se pudieron cargar las compras</p>
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
    <div className="pb-10">
      <section className="px-4 pt-6 pb-2">
        <h1 className="text-slate-900 text-[24px] font-extrabold leading-tight tracking-tight">
          {editingEntry ? 'Editar Compra' : 'Compras e Insumos'}
        </h1>
        <p className="text-slate-500 text-sm">
          {editingEntry ? 'Modifique los detalles de la compra.' : 'Ingrese los detalles de la compra de suministros.'}
        </p>
      </section>

      <form onSubmit={handleSubmit} className="space-y-4 px-4 py-4">
        <div className="flex flex-col w-full">
          <label className="text-slate-700 text-sm font-semibold pb-1.5 ml-1">Nombre del Artículo</label>
          <div className="relative">
            <Tag className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              required
              className="block w-full pl-12 pr-4 py-4 rounded-xl border-none bg-white shadow-sm focus:ring-2 focus:ring-primary text-base placeholder:text-slate-300" 
              placeholder="Ej. Cuadernos, Esferos..." 
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col w-full">
          <label className="text-slate-700 text-sm font-semibold pb-1.5 ml-1">Fecha de Compra</label>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input 
              required
              className="block w-full pl-12 pr-4 py-4 rounded-xl border-none bg-white shadow-sm focus:ring-2 focus:ring-primary text-base" 
              type="date" 
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <label className="text-slate-700 text-sm font-semibold pb-1.5 ml-1">Cantidad</label>
            <div className="relative">
              <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                required
                className="block w-full pl-10 pr-4 py-4 rounded-xl border-none bg-white shadow-sm focus:ring-2 focus:ring-primary text-base text-center font-bold" 
                placeholder="0" 
                type="number"
                value={quantity || ''}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="flex flex-col">
            <label className="text-slate-700 text-sm font-semibold pb-1.5 ml-1">Costo Unitario (COP)</label>
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                required
                className="block w-full pl-10 pr-4 py-4 rounded-xl border-none bg-white shadow-sm focus:ring-2 focus:ring-primary text-base font-bold" 
                placeholder="0" 
                type="number"
                value={unitCost || ''}
                onChange={(e) => setUnitCost(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 flex justify-between items-center">
          <span className="text-slate-700 font-medium text-sm">Costo Total</span>
          <span className="text-slate-900 font-bold text-xl">${totalCost.toLocaleString('es-CO')}</span>
        </div>

        <div className="flex gap-2">
          {editingEntry && (
            <button 
              type="button"
              onClick={() => {
                setEditingEntry(null);
                setName('');
                setQuantity(0);
                setUnitCost(0);
              }}
              className="flex-1 bg-slate-200 text-slate-700 font-bold py-4 rounded-xl transition-all active:scale-95"
            >
              Cancelar
            </button>
          )}
          <button 
            type="submit"
            disabled={isSubmitting}
            className="flex-[2] bg-primary hover:bg-primary/90 text-slate-900 font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <PlusCircle size={20} />}
            {editingEntry ? 'Actualizar Registro' : 'Registrar Compra'}
          </button>
        </div>
      </form>

      <section className="mt-8 px-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-slate-900 text-lg font-bold">Entradas Recientes</h3>
          <button className="text-primary text-sm font-semibold flex items-center gap-1">
            Ver Todo <ChevronRight size={14} />
          </button>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : (
          <div className="space-y-3">
            {recentEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="size-10 bg-primary/20 rounded-lg flex items-center justify-center text-primary">
                    <PenLine size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-900">{entry.name}</p>
                    <p className="text-xs text-slate-500">{entry.date} • {entry.quantity} uds</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="font-bold text-sm text-slate-900">${entry.totalCost.toLocaleString('es-CO')}</p>
                    <p className="text-[10px] text-slate-400">${entry.unitCost.toLocaleString('es-CO')} c/u</p>
                  </div>
                  <button 
                    onClick={() => startEdit(entry)}
                    className="p-2 text-slate-400 hover:text-primary transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
