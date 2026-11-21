// @build: 2026-09-30 | id: LEGAL-DISCLAIMER | desc: Footer con aviso legal obligatorio para desvinculación de INTT.
const AVISO_LEGAL = "Esta plataforma ofrece servicios privados de educación no formal, consultoría deportiva y tutorías de acompañamiento para el desarrollo de habilidades motoras. No somos una 'Escuela del Transporte' ni prestamos servicios conexos regulados por el Instituto Nacional de Transporte Terrestre (INTT). Las constancias emitidas por esta plataforma son de carácter privado, recreativo, y no poseen validez legal para la obtención de licencias de conducir, certificados de saberes o cualquier otro trámite ante las autoridades de tránsito del Estado venezolano.";

export default function LegalFooter({ compact = false }) {
  if (compact) {
    return (
      <details className="mt-2 px-1 text-center">
        <summary className="cursor-pointer list-none text-[10px] font-bold uppercase tracking-wider text-slate-400/80 transition-colors hover:text-slate-300">
          Aviso legal
        </summary>
        <p className="mt-2 text-[10px] leading-relaxed text-slate-400/90">
          {AVISO_LEGAL}
        </p>
      </details>
    );
  }

  return (
    <footer className="px-6 py-6 text-center border-t border-gray-200 mt-4">
      <p className="text-[10px] leading-relaxed text-gray-400">
        <strong className="font-bold">Aviso Legal:</strong> {AVISO_LEGAL}
      </p>
    </footer>
  );
}
