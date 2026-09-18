// @build: 2026-09-17 | id: TEXTO-ENRIQUECIDO | desc: Renderiza texto plano con soporte para párrafos y viñetas
// Reglas:
//   - Líneas que empiezan con "- " o "• " → ítem de lista
//   - Líneas vacías → separan bloques
//   - Líneas normales → párrafos independientes
// Los datos se guardan como texto plano con \n reales en Firestore.

export default function TextoEnriquecido({ texto, className = '', classNameParrafo = '', classNameLista = '', classNameItem = '' }) {
  if (!texto || typeof texto !== 'string') return null;

  const lineas = texto.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lineas.length === 0) return null;

  const bloques = [];
  let listaActual = [];

  const cerrarLista = () => {
    if (listaActual.length > 0) {
      bloques.push({ tipo: 'lista', items: listaActual });
      listaActual = [];
    }
  };

  lineas.forEach(linea => {
    if (linea.startsWith('- ') || linea.startsWith('• ')) {
      listaActual.push(linea.replace(/^[-•]\s+/, ''));
    } else {
      cerrarLista();
      bloques.push({ tipo: 'parrafo', texto: linea });
    }
  });
  cerrarLista();

  return (
    <div className={className}>
      {bloques.map((b, i) => {
        if (b.tipo === 'lista') {
          return (
            <ul key={i} className={`space-y-1 mt-1.5 ${classNameLista}`}>
              {b.items.map((item, j) => (
                <li key={j} className={`flex items-start gap-2 ${classNameItem}`}>
                  <span className="text-current mt-0.5 shrink-0">•</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className={`mt-1.5 ${classNameParrafo}`}>
            {b.texto}
          </p>
        );
      })}
    </div>
  );
}
