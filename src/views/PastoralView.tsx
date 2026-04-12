import { useState, useEffect, FormEvent } from 'react';
import { Calendar, FileText, DollarSign, PlusCircle, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import { db } from '../firebase';
import {
  collection,
  onSnapshot,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  doc,
  deleteDoc,
} from 'firebase/firestore';
import { PastoralExpense } from '../types';

export default function PastoralView() {
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [items, setItems] = useState<PastoralExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setFirestoreError((prev) => prev ?? 'La conexión tardó demasiado. Puede ser un problema temporal.');
    }, 20000);

    const q = query(collection(db, 'pastoral_expenses'), orderBy('timestamp', 'desc'), limit(100));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        clearTimeout(timeoutId);
        setItems(snapshot.docs.map((d) => ({ ...d.data(), id: d.id } as PastoralExpense)));
        setLoading(false);
        setFirestoreError(null);
      },
      (err) => {
        clearTimeout(timeoutId);
        console.error('Firestore pastoral_expenses:', err);
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
    if (!description.trim() || amount <= 0) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'pastoral_expenses'), {
        date,
        description: description.trim(),
        amount,
        timestamp: serverTimestamp(),
      });
      setDescription('');
      setAmount(0);
    } catch (error) {
      console.error('Error guardando gasto pastoral:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este registro de gasto pastoral?')) return;
    setDeletingId(id);
    try {
      await deleteDoc(doc(db, 'pastoral_expenses', id));
    } catch (error) {
      console.error('Error eliminando:', error);
    } finally {
      setDeletingId(null);
    }
  };

  if (firestoreError) {
    return (
      <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 mx-4">
        <p className="font-medium">No se pudieron cargar los gastos pastorales</p>
        <p className="text-sm mt-1">{firestoreError}</p>
        <button
          type="button"
          onClick={() => {
            setFirestoreError(null);
            setLoading(true);
            setRetryCount((c) => c + 1);
          }}
          className="mt-3 flex items-center gap-2 px-4 py-2 bg-amber-200 hover:bg-amber-300 rounded-lg font-medium text-amber-900 transition-colors"
        >
          <RefreshCw size={18} />
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="pb-10 px-4 md:px-6 lg:px-8">
      <section className="pt-6 pb-2 md:pt-8 md:pb-4">
        <h1 className="text-slate-900 text-[24px] md:text-[28px] font-extrabold leading-tight tracking-tight">
          Gestión pastoral
        </h1>
        <p className="text-slate-500 text-sm md:text-base max-w-2xl">
          Registre compras o gastos de la pastoral. En Reportes → Global se restan de la utilidad neta de la tienda.
        </p>
      </section>

      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-5 py-4 md:py-6 max-w-3xl">
        <div className="flex flex-col w-full">
          <label className="text-slate-700 text-sm font-semibold pb-1.5 ml-1">Fecha</label>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              required
              className="block w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-primary text-base"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col w-full">
          <label className="text-slate-700 text-sm font-semibold pb-1.5 ml-1">Ítem o concepto del gasto</label>
          <div className="relative">
            <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              required
              className="block w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-primary text-base"
              placeholder="Ej. útiles, transporte, donación…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-col w-full">
          <label className="text-slate-700 text-sm font-semibold pb-1.5 ml-1">Monto (COP)</label>
          <div className="relative">
            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              required
              min={1}
              className="block w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-primary text-base font-bold"
              type="number"
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-primary hover:bg-primary/90 text-slate-900 font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
        >
          {submitting ? <Loader2 className="animate-spin" size={20} /> : <PlusCircle size={20} />}
          Registrar gasto
        </button>
      </form>

      <section className="mt-8 max-w-3xl">
        <h3 className="text-slate-900 text-lg md:text-xl font-bold mb-4">Registros recientes</h3>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-primary" size={32} />
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-slate-400 py-8">Aún no hay gastos pastorales registrados.</p>
        ) : (
          <div className="space-y-3">
            {items.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between gap-3 p-4 bg-white rounded-xl border border-slate-100 shadow-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-slate-900">{row.description}</p>
                  <p className="text-xs text-slate-500">
                    {row.date} · ${row.amount.toLocaleString('es-CO')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(row.id)}
                  disabled={deletingId === row.id}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors shrink-0 disabled:opacity-50"
                  aria-label="Eliminar"
                >
                  {deletingId === row.id ? <Loader2 className="animate-spin" size={18} /> : <Trash2 size={18} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
