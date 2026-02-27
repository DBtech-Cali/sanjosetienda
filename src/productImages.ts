const BASE = 'https://cuglaresqulcbrnmbdjl.supabase.co/storage/v1/object/public/joyas/tienda';

const IMAGE_MAP: Record<string, string> = {
  agua: `${BASE}/agua.jpg`,
  aguagas: `${BASE}/gas.jpg`,
  chocolategrande: `${BASE}/big.jpg`,
  chocolatejet: `${BASE}/jet.jpg`,
  chocolatepequeno: `${BASE}/small.jpg`,
  bombom: `${BASE}/bom.jpg`,
  cafenegro: `${BASE}/cafe.jpg`,
  cafe: `${BASE}/cafe.jpg`,
  chocobreak: `${BASE}/choco.jpg`,
  bigcola: `${BASE}/coke.jpg`,
  dorito: `${BASE}/dorito.jpg`,
  doritos: `${BASE}/dorito.jpg`,
  energy: `${BASE}/energy.jpg`,
  fruna: `${BASE}/fruna.jpg`,
  cafeconleche: `${BASE}/milk.jpg`,
  menta: `${BASE}/mint.jpg`,
  papitas: `${BASE}/papa.jpg`,
  papas: `${BASE}/papa.jpg`,
  platanos: `${BASE}/platano.jpg`,
  platanitos: `${BASE}/platano.jpg`,
  gaseosa: `${BASE}/soda.jpg`,
  te: `${BASE}/te.jpg`,
  detodito: `${BASE}/todo.jpg`,
  yupi: `${BASE}/yupi.jpg`,
  bunuelo: `${BASE}/bunu.jpg`,
  aborrajado: `${BASE}/aborrajado.jpg`,
  pan: `${BASE}/pan.jpg`,
  dedito: `${BASE}/dedo.jpg`,
  empanada: `${BASE}/empanada.jpg`,
  paparellena: `${BASE}/papar.jpg`,
};

function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/ñ/g, 'n')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function getProductImageUrl(productName: string): string | undefined {
  const key = normalizeName(productName);
  return IMAGE_MAP[key];
}
