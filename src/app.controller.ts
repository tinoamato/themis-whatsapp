import { Controller, Get, Headers, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  health() {
    return { status: 'ok' };
  }

  // One-time seed endpoint — call once with ?key=<API_KEY>
  @Get('admin/seed')
  async seed(@Headers('x-api-key') apiKey: string) {
    if (apiKey !== process.env.API_KEY) throw new UnauthorizedException();

    const [etapaCount, temaCount] = await Promise.all([
      this.prisma.etapa.count(),
      this.prisma.faqTema.count(),
    ]);

    if (etapaCount > 0 && temaCount > 0) {
      return { message: 'Seed ya aplicado', etapas: etapaCount, temas: temaCount };
    }

    const etapas = [
      { orden: 1, nombre: 'Inicio del proceso', descripcion: 'El caso ha sido iniciado y se está recopilando documentación.', mensajeBot: '📁 *Tu caso fue iniciado exitosamente.*\n\nEstamos recopilando toda la documentación necesaria para preparar tu caso de la mejor manera posible.\n\n📌 *Próximo paso:* Presentación de la demanda\n⏳ *Estamos esperando:* Que la documentación esté completa', proximoPaso: 'Presentación de la demanda ante el juzgado', esperando: 'Documentación completa del cliente' },
      { orden: 2, nombre: 'Mediación prejudicial', descripcion: 'El caso se encuentra en etapa de mediación obligatoria.', mensajeBot: '🤝 *Tu caso está en etapa de mediación prejudicial.*\n\nAntes de iniciar el juicio, la ley exige intentar una mediación entre las partes. Tu abogado te representará en este proceso.\n\n📌 *Próximo paso:* Acuerdo de mediación o inicio del proceso judicial\n⏳ *Estamos esperando:* El resultado de la mediación', proximoPaso: 'Acuerdo de mediación o inicio del proceso judicial', esperando: 'Resultado de la mediación' },
      { orden: 3, nombre: 'Demanda presentada', descripcion: 'La demanda fue ingresada al juzgado.', mensajeBot: '⚖️ *La demanda fue presentada ante el juzgado.*\n\nYa ingresamos formalmente tu demanda. Ahora esperamos que el juzgado le asigne un número de expediente y lo sorteen a un juez.\n\n📌 *Próximo paso:* Notificación a la parte demandada\n⏳ *Estamos esperando:* Asignación de juzgado y número de expediente', proximoPaso: 'Notificación formal a la parte demandada', esperando: 'Asignación de juzgado y número de expediente' },
      { orden: 4, nombre: 'Traslado de la demanda', descripcion: 'El demandado fue notificado y tiene plazo para contestar.', mensajeBot: '📬 *El demandado fue notificado.*\n\nEl juzgado ya notificó a la otra parte. A partir de ahora tienen un plazo legal para contestar la demanda.\n\n📌 *Próximo paso:* Respuesta del demandado\n⏳ *Estamos esperando:* Contestación de demanda (15 a 30 días hábiles)', proximoPaso: 'Recibir la contestación de demanda', esperando: 'Contestación de demanda (15-30 días hábiles)' },
      { orden: 5, nombre: 'Apertura a prueba', descripcion: 'El expediente se encuentra en etapa probatoria.', mensajeBot: '🔬 *Tu expediente está en etapa de prueba.*\n\nAmbas partes presentan las pruebas que respaldan su posición: documentos, testigos, pericias, etc. Es una etapa clave del proceso.\n\n📌 *Próximo paso:* Producción y evaluación de pruebas\n⏳ *Estamos esperando:* Peritos, testigos y documentación de ambas partes', proximoPaso: 'Producción de todas las pruebas ofrecidas', esperando: 'Informes periciales, declaraciones y documentación' },
      { orden: 6, nombre: 'Pericia en curso', descripcion: 'Hay una pericia técnica en proceso.', mensajeBot: '🔎 *Hay una pericia técnica en proceso.*\n\nUn perito designado por el juez está analizando aspectos técnicos del caso. Su informe será fundamental para la sentencia.\n\n📌 *Próximo paso:* Presentación del informe pericial\n⏳ *Estamos esperando:* Que el perito finalice y presente su informe', proximoPaso: 'Presentación del informe pericial al juzgado', esperando: 'Informe del perito designado por el juez' },
      { orden: 7, nombre: 'Audiencia programada', descripcion: 'Hay una audiencia fijada próximamente.', mensajeBot: '📅 *Tenés una audiencia próximamente.*\n\nEl juez fijó una fecha de audiencia. Tu presencia puede ser requerida. Nos comunicaremos con todos los detalles: fecha, hora, lugar y qué necesitás llevar.\n\n📌 *Próximo paso:* Celebración de la audiencia\n⏳ *Estamos esperando:* La fecha de audiencia', proximoPaso: 'Celebración de la audiencia ante el juez', esperando: 'Fecha y confirmación de la audiencia' },
      { orden: 8, nombre: 'Alegatos', descripcion: 'Etapa final de argumentación antes de la sentencia.', mensajeBot: '📝 *Tu caso está en etapa de alegatos.*\n\nEsta es la última etapa antes de la sentencia. Tu abogado presentará los argumentos finales resumiendo todo lo probado en el juicio.\n\n📌 *Próximo paso:* Sentencia del juez\n⏳ *Estamos esperando:* Que el juez dicte sentencia tras analizar los alegatos', proximoPaso: 'Sentencia definitiva del juez', esperando: 'Resolución del juez tras los alegatos' },
      { orden: 9, nombre: 'Sentencia dictada', descripcion: 'El juez emitió su sentencia.', mensajeBot: '⚖️ *El juez dictó sentencia en tu caso.*\n\nYa tenemos la decisión judicial. Tu abogado está analizando la sentencia y te contactará para explicarte el resultado y los próximos pasos.\n\n📌 *Próximo paso:* Ejecución de sentencia o análisis de apelación\n⏳ *Estamos esperando:* Definir la estrategia a seguir con tu abogado', proximoPaso: 'Ejecución de la sentencia o presentación de apelación', esperando: 'Reunión con tu abogado para definir estrategia' },
      { orden: 10, nombre: 'En ejecución', descripcion: 'La sentencia está siendo ejecutada para hacer efectivo el cobro.', mensajeBot: '💼 *La sentencia está siendo ejecutada.*\n\nEstamos trabajando para hacer efectivo lo que te corresponde. Esto puede incluir embargos, intimaciones de pago y otras medidas legales.\n\n📌 *Próximo paso:* Cobro efectivo de lo dispuesto en la sentencia\n⏳ *Estamos esperando:* Cumplimiento del condenado o resultado de las medidas de embargo', proximoPaso: 'Cobro efectivo de lo dispuesto por el juez', esperando: 'Cumplimiento o resultado de medidas de ejecución' },
    ];

    const temas = [
      { titulo: 'Mi expediente', emoji: '📋', orden: 1, preguntas: [
        { orden: 1, pregunta: '¿Cómo sé en qué etapa está mi caso?', respuesta: 'Podés consultarlo en cualquier momento enviando tu DNI a este chat. Te mostraremos el estado actualizado de tu expediente con la etapa actual, qué estamos esperando y cuál es el próximo paso.' },
        { orden: 2, pregunta: '¿Cuánto tarda mi proceso judicial?', respuesta: 'Los tiempos varían según el tipo de proceso y el fuero. Un juicio civil o laboral puede durar entre 2 y 5 años en promedio. Los acuerdos o mediaciones pueden resolverse mucho antes. Tu abogado te dará una estimación más precisa según tu caso.' },
        { orden: 3, pregunta: '¿Puedo ver el expediente completo?', respuesta: 'Los expedientes judiciales son públicos. Podés consultarlos en la mesa de entradas del juzgado o, en muchos casos, a través del sistema de consulta online del Poder Judicial. Tu abogado puede orientarte sobre cómo acceder según el fuero de tu caso.' },
        { orden: 4, pregunta: '¿Qué significa "expediente en despacho"?', respuesta: '"En despacho" significa que el expediente está con el juez para que dicte una resolución. Puede ser un decreto simple o una decisión importante. Generalmente tarda entre algunos días y pocas semanas.' },
      ]},
      { titulo: 'El proceso judicial', emoji: '⚖️', orden: 2, preguntas: [
        { orden: 1, pregunta: '¿Qué es la mediación prejudicial?', respuesta: 'Es un paso obligatorio previo al juicio en muchos fueros. Un mediador imparcial intenta que las partes lleguen a un acuerdo sin necesidad de ir a juicio. Si no hay acuerdo, se puede iniciar la demanda judicial. Tiene un plazo de entre 1 y 3 meses aproximadamente.' },
        { orden: 2, pregunta: '¿Puedo llegar a un acuerdo en cualquier etapa?', respuesta: 'Sí. Las partes pueden llegar a un acuerdo en cualquier momento del proceso, incluso durante el juicio o después de la sentencia. Tu abogado siempre evaluará si un acuerdo propuesto es conveniente para vos antes de aceptarlo.' },
        { orden: 3, pregunta: '¿Qué es la apertura a prueba?', respuesta: 'Es la etapa donde ambas partes presentan y producen sus pruebas: documentos, testimonios de testigos, informes periciales, etc. El juez fija un plazo para producirlas. Es una etapa clave porque define qué quedará demostrado en el juicio.' },
        { orden: 4, pregunta: '¿Qué pasa si pierdo el juicio?', respuesta: 'Si la sentencia es desfavorable, tu abogado analizará si hay fundamentos para apelar ante una cámara de apelaciones. Una apelación puede revertir o modificar la sentencia. También podría haber posibilidad de llegar a un acuerdo en esa instancia.' },
      ]},
      { titulo: 'Honorarios y costas', emoji: '💰', orden: 3, preguntas: [
        { orden: 1, pregunta: '¿Cuándo se pagan los honorarios?', respuesta: 'Depende del acuerdo con el estudio. En muchos casos de daños y laborales, los honorarios se cobran al final del proceso, como un porcentaje de lo obtenido (honorarios de éxito). En otros casos puede haber pagos parciales durante el proceso. Consultá con tu abogado las condiciones específicas.' },
        { orden: 2, pregunta: '¿Qué son las costas del juicio?', respuesta: 'Las costas son los gastos del proceso judicial (tasa de justicia, honorarios de peritos, gastos de notificación, etc.). Generalmente las paga la parte que pierde el juicio. Si ganás, la otra parte deberá pagar tus costas.' },
        { orden: 3, pregunta: '¿Qué pasa si la otra parte no paga la sentencia?', respuesta: 'Si el condenado no paga voluntariamente, se inicia la etapa de ejecución de sentencia. El juez puede ordenar el embargo de sueldos, cuentas bancarias, bienes inmuebles u otros activos hasta cubrir la deuda. Tu abogado llevará adelante todas estas medidas.' },
      ]},
      { titulo: 'Documentación', emoji: '📄', orden: 4, preguntas: [
        { orden: 1, pregunta: '¿Qué documentos necesito presentar?', respuesta: 'Depende del tipo de caso. Generalmente se requieren: DNI, contratos, recibos de sueldo, facturas, informes médicos, fotografías, correos electrónicos u otros documentos que respalden los hechos. Tu abogado te indicará exactamente qué necesitás según tu caso.' },
        { orden: 2, pregunta: '¿Sirve una copia o necesito el original?', respuesta: 'Para muchos documentos alcanza con una copia simple o digital para empezar. Sin embargo, en etapa probatoria puede ser necesario presentar originales o copias certificadas. Guardá todos los originales en un lugar seguro y consultá a tu abogado antes de entregar documentos.' },
        { orden: 3, pregunta: '¿Cómo envío documentación al estudio?', respuesta: 'Podés acercarte al estudio en el horario de atención, enviarlo por correo postal certificado o por email si tu abogado te lo indicó. Para documentos importantes, siempre es mejor la entrega en persona con constancia de recepción.' },
      ]},
      { titulo: 'Contacto y atención', emoji: '📞', orden: 5, preguntas: [
        { orden: 1, pregunta: '¿Cómo me comunico con mi abogado?', respuesta: 'Podés contactar al estudio por teléfono, email o de forma presencial. Para consultas urgentes, este chat también puede derivarte con un asesor. Recordá que tu abogado tiene muchos clientes, por lo que es mejor agendar una reunión para temas complejos.' },
        { orden: 2, pregunta: '¿Puedo ir al estudio sin turno?', respuesta: 'Te recomendamos coordinar una visita con anticipación para garantizar la disponibilidad de tu abogado. Sin turno, es posible que tengas que esperar o que no puedan atenderte ese día. Contactanos para agendar una reunión conveniente para ambas partes.' },
        { orden: 3, pregunta: '¿Qué hago si hay una novedad urgente?', respuesta: 'Si recibís una cédula judicial, una carta documento, una notificación oficial o cualquier documento relacionado con tu caso, comunicate de inmediato con el estudio. Muchas notificaciones tienen plazos muy cortos para responder y perderlos puede afectar tu caso.' },
      ]},
    ];

    if (etapaCount === 0) {
      for (const e of etapas) await this.prisma.etapa.create({ data: e });
    }

    if (temaCount === 0) {
      for (const tema of temas) {
        const { preguntas, ...temaData } = tema;
        const created = await this.prisma.faqTema.create({ data: temaData });
        for (const p of preguntas) {
          await this.prisma.faqPregunta.create({ data: { ...p, temaId: created.id } });
        }
      }
    }

    return {
      message: 'Seed ejecutado correctamente',
      etapas: etapas.length,
      temas: temas.length,
    };
  }
}
