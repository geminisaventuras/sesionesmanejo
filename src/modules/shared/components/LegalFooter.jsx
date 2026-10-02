// @build: 2026-09-30 | id: LEGAL-DISCLAIMER | desc: Footer con aviso legal obligatorio para desvinculación de INTT.
export default function LegalFooter() {
  return (
    <footer className="px-6 py-6 text-center border-t border-gray-200 mt-4">
      <p className="text-[10px] leading-relaxed text-gray-400">
        <strong className="font-bold">Aviso Legal:</strong> Esta plataforma ofrece servicios privados de educación no formal, consultoría deportiva y tutorías de acompañamiento para el desarrollo de habilidades motoras. No somos una 'Escuela del Transporte' ni prestamos servicios conexos regulados por el Instituto Nacional de Transporte Terrestre (INTT). Las constancias emitidas por esta plataforma son de carácter privado, recreativo, y no poseen validez legal para la obtención de licencias de conducir, certificados de saberes o cualquier otro trámite ante las autoridades de tránsito del Estado venezolano.
      </p>
    </footer>
  );
}