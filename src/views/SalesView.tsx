import { useState, useEffect } from 'react';
import {
  Receipt,
  Loader2,
  RefreshCw,
  Pencil,
  Trash2,
  ChevronRight,
  Save,
  X,
  Minus,
  Plus,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../firebase';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit,
  doc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { SaleRecord, CartItem } from '../types';
import ProductImage from '../components/ProductImage';

function formatDate(ts: any): string {
  if (!ts) return '—';
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SalesView() {
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [editingSale, setEditingSale] = useState<SaleRecord | null>(null);
  const [editItems, setEditItems] = useState<CartItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setFirestoreError(prev => prev ?? 'La conexión tardó demasiado. Puede ser un problema temporal.');
    }, 20000);

    const q = query(
      collection(db, 'sales'),
      orderBy('timestamp', 'desc'),
      limit(100)
    );
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        clearTimeout(timeoutId);
        const list = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as SaleRecord));
        setSales(list);
        setLoading(false);
        setFirestoreError(null);
      },
      (err) => {
        clearTimeout(timeoutId);
        console.error('Firestore sales:', err);
        setLoading(false);
        setFirestoreError(err.message || 'Error al conectar con Firestore.');
      }
    );
    return () => {
      clearTimeout(timeoutId);
      unsub();
    };
  }, [retryCount]);

  const startEdit = (sale: SaleRecord) => {
    setEditingSale(sale);
    setEditItems(sale.items.map(i => ({ ...i })));
    setSelectedSale(null);
  };

  const cancelEdit = () => {
    setEditingSale(null);
    setEditItems([]);
  };

  const updateEditQuantity = (index: number, delta: number) => {
    setEditItems(prev => {
      const next = prev.map((item, i) => {
        if (i !== index) return item;
        const q = Math.max(0, item.quantity + delta);
        if (q === 0) return null;
        return { ...item, quantity: q };
      });
      return next.filter(Boolean) as CartItem[];
    });
  };

  const removeEditItem = (index: number) => {
    setEditItems(prev => prev.filter((_, i) => i !== index));
  };

  const editTotal = editItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const saveEdit = async () => {
    if (!editingSale || editItems.length === 0) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'sales', editingSale.id), {
        items: editItems,
        total: editTotal,
      });
      cancelEdit();
    } catch (err) {
      console.error('Error al guardar venta:', err);
      alert('No se pudo guardar. Revisa la conexión.');
    } finally {
      setSaving(false);
    }
  };

  const deleteSale = async (sale: SaleRecord) => {
    if (!confirm('¿Eliminar esta venta? Esta acción no se puede deshacer.')) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, 'sales', sale.id));
      setSelectedSale(null);
      setEditingSale(null);
    } catch (err) {
      console.error('Error al eliminar venta:', err);
      alert('No se pudo eliminar. Revisa la conexión.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="animate-spin text-primary" size={40} />
        <p className="text-sm text-slate-500">Cargando ventas...</p>
      </div>
    );
  }

  if (firestoreError) {
    return (
      <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
        <p className="font-medium">No se pudieron cargar las ventas</p>
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

  // Modal / panel de edición
  if (editingSale) {
    return (
      <div className="p-4 pb-24">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Editar venta</h2>
          <button
            type="button"
            onClick={cancelEdit}
            className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
          >
            <X size={20} />
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-4">{formatDate(editingSale.timestamp)}</p>
        <div className="space-y-2 mb-4">
          {editItems.map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              className="flex items-center gap-2 p-3 bg-white rounded-xl border border-slate-100"
            >
              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-slate-100">
                <ProductImage productName={item.name} className="w-full h-full rounded-lg" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">{item.name}</p>
                <p className="text-xs text-slate-500">${item.price.toLocaleString('es-CO')} c/u</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => updateEditQuantity(index, -1)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  <Minus size={16} />
                </button>
                <span className="w-8 text-center font-semibold text-slate-900">{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => updateEditQuantity(index, 1)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
                >
                  <Plus size={16} />
                </button>
              </div>
              <span className="text-sm font-semibold text-slate-900 w-20 text-right">
                ${(item.price * item.quantity).toLocaleString('es-CO')}
              </span>
              <button
                type="button"
                onClick={() => removeEditItem(index)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
        {editItems.length === 0 && (
          <p className="text-sm text-slate-500 mb-4">Sin productos. Cancela y elimina la venta desde el detalle si ya no la necesitas.</p>
        )}
        <div className="flex items-center justify-between py-3 border-t border-slate-200">
          <span className="font-bold text-slate-900">Total</span>
          <span className="text-lg font-bold text-primary">${editTotal.toLocaleString('es-CO')}</span>
        </div>
        <div className="flex gap-3 mt-4">
          <button
            type="button"
            onClick={cancelEdit}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={saveEdit}
            disabled={saving || editItems.length === 0}
            className="flex-1 py-3 rounded-xl bg-primary text-slate-900 font-bold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            Guardar
          </button>
        </div>
      </div>
    );
  }

  // Detalle de venta seleccionada (ver + editar + eliminar)
  if (selectedSale) {
    const total = selectedSale.items.reduce((s, i) => s + i.price * i.quantity, 0);
    return (
      <div className="p-4 pb-24">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => setSelectedSale(null)}
            className="text-primary font-semibold text-sm flex items-center gap-1"
          >
            <ChevronRight className="rotate-180" size={18} />
            Volver
          </button>
        </div>
        <div className="mb-4">
          <p className="text-xs text-slate-500">{formatDate(selectedSale.timestamp)}</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">${selectedSale.total.toLocaleString('es-CO')}</p>
          <p className="text-sm text-slate-500">{selectedSale.items.length} producto(s)</p>
        </div>
        <div className="space-y-2 mb-6">
          {selectedSale.items.map((item, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-100">
              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-slate-100">
                <ProductImage productName={item.name} className="w-full h-full rounded-lg" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900">{item.name}</p>
                <p className="text-xs text-slate-500">{item.quantity} × ${item.price.toLocaleString('es-CO')}</p>
              </div>
              <p className="font-semibold text-slate-900 shrink-0">${(item.price * item.quantity).toLocaleString('es-CO')}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => startEdit(selectedSale)}
            className="flex-1 py-3 rounded-xl bg-primary/15 text-primary font-bold flex items-center justify-center gap-2"
          >
            <Pencil size={18} />
            Editar
          </button>
          <button
            type="button"
            onClick={() => deleteSale(selectedSale)}
            disabled={deleting}
            className="flex-1 py-3 rounded-xl bg-red-50 text-red-600 font-bold flex items-center justify-center gap-2 hover:bg-red-100 disabled:opacity-50"
          >
            {deleting ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
            Eliminar
          </button>
        </div>
      </div>
    );
  }

  // Listado de ventas
  return (
    <div className="p-4 pb-24">
      <h2 className="text-slate-900 text-lg font-bold mb-4">Registro de ventas</h2>
      {sales.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <Receipt size={48} className="mx-auto mb-3 opacity-50" />
          <p>No hay ventas registradas</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {sales.map((sale, index) => (
              <motion.button
                key={sale.id}
                type="button"
                onClick={() => setSelectedSale(sale)}
                className="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-slate-100 shadow-sm text-left hover:border-primary/30 transition-colors"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: index * 0.02 }}
              >
                <div className="flex items-center gap-3">
                  <div className="size-10 bg-primary/20 rounded-lg flex items-center justify-center text-primary">
                    <Receipt size={20} />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">${sale.total.toLocaleString('es-CO')}</p>
                    <p className="text-xs text-slate-500">{formatDate(sale.timestamp)} · {sale.items.length} producto(s)</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-slate-400" />
              </motion.button>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
