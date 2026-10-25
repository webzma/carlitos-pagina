const PREGUNTAS = [
  ["¿Cómo sé que el sorteo es real?", "Todos nuestros sorteos se realizan con los resultados de una lotería oficial, publicada en la fecha indicada. Además, transmitimos en vivo por Instagram."],
  ["¿Cuánto tiempo tengo para pagar mis boletos?", "Tus boletos quedan apartados apenas envías el formulario. Si el pago no se puede confirmar, la orden se anula y los números vuelven a estar disponibles."],
  ["¿Cómo verifico mis boletos?", "En la página de la rifa, ve a “Verificador” e ingresa tu número de teléfono o el número de tu boleto."],
  ["¿Cómo entregan los premios?", "Contactamos al ganador por WhatsApp el mismo día. Los premios en efectivo se pagan por Pago Móvil; los físicos se entregan en persona o por envío."],
  ["¿Cómo pago?", "Por Pago Móvil al Banco de Venezuela. Los datos están en la sección “Cuentas de pago”. Al comprar, sube la captura y escribe el número de referencia para validar tu pago más rápido."],
];

export function Faq() {
  return (
    <section className="section" id="preguntas" style={{ paddingTop: 0 }}>
      <div className="container">
        <h2 className="section-title">
          PREGUNTAS <span>FRECUENTES</span>
        </h2>
        <p className="section-sub">Todo lo que necesitas saber</p>
        <div className="faq">
          {PREGUNTAS.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
