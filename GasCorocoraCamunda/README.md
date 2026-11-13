# GAS COROCORA S.A. E.S.P. – Automatización de procesos con Camunda 7 + Spring Boot

Proyecto de Software 1 (2.ª entrega – *Standalone Execution*).
Integrantes: Marlon Santofimio (160004837), Brayan Acosta (160004800), Santiago Chavarro (160004913).

Se automatizan los **3 procesos seleccionados en la sección 10 del documento "GAS COROCORA – BPM: Identificación de procesos"**, cada uno con todos los elementos que pide la rúbrica, sobre la misma arquitectura de los ejemplos de clase (*CamundaEmbedded* y *SwI-L09 – Several service tasks SpringBoot*).

> **Versión:** Camunda 7.21.0 + Spring Boot 3.2.0 (el ejemplo de clase usa 7.20.0 + 3.1.1). Se subió de versión porque la Tasklist de Camunda 7.20.0 no muestra los Camunda Forms (ver sección 8).

---

## 1. Procesos extraídos del documento

| # | Proceso (portafolio) | Imp / Salud / Fact | Problema que se automatiza | Dueño |
|---|---|---|---|---|
| P1 | **Gestión de Medición y Facturación** (P4) | 5 / 4 / 4 | ~1 de cada 10 facturas genera reclamo por errores de lectura manual. Se valida la lectura automáticamente (desviación > 30 % ⇒ verificación en terreno), se liquida con subsidios/contribuciones por estrato (DMN), se envía la factura y se controla el pago o la mora. | Gerente Comercial |
| P2 | **Atención al Usuario y PQRS** (P6) | 4 / 5 / 4 | El cumplimiento de términos legales cae en los picos posteriores a la facturación (riesgo de sanción de la SSPD). Se radica, se calcula el término de 15 días hábiles (art. 158 Ley 142/94), se enruta con DMN, se alerta antes de vencer (timer no interruptor) y se gestiona el recurso de reposición/apelación. | Jefe de Servicio al Cliente |
| P3 | **Gestión de Conexión de Nuevos Usuarios** (P2) | 4 / 4 / 4 | El ciclo de conexión supera lo esperado por demoras en viabilidad técnica y radicación de documentos. Se digitaliza la solicitud, la viabilidad se decide con DMN, diseño y contrato corren en paralelo, y la obra tiene un plazo controlado por timer. | Gerente Comercial |

## 2. Modelado BPMN

Cada proceso está modelado como **colaboración**: un pool ejecutable con lanes por rol y pools externos colapsados (usuario, banco, SSPD) unidos por *message flows*. Los archivos están en `src/main/resources/static/bpmn/` y se abren directamente en Camunda Modeler 5.x (plataforma Camunda 7.21). En `docs/diagramas/` hay una vista previa PNG de cada uno.

### P1 – `Proceso_MedicionFacturacion` (`ProcesoMedicionFacturacion.bpmn`)
- **Pool:** GAS COROCORA – Gestión de Medición y Facturación · **Pools externos:** Usuario / Suscriptor; Entidad recaudadora.
- **Lanes:** Analista de facturación · Lector de campo · Sistema comercial.
- **Inicio:** `StartEvent_CicloFacturacionIniciado` (Camunda Form `formIniciarCicloFacturacion`).
- **Tareas de usuario:** Registrar lectura del medidor · Verificar lectura en terreno · Revisar liquidación de la factura.
- **Tareas de servicio:** Calcular consumo y desviación (*Java Class*) · Determinar factor tarifario (*Business Rule – DMN*) · Liquidar factura (*Delegate Expression*) · Enviar factura al usuario (*External – JavaScript*) · Registrar pago y actualizar cartera (*Java Class*).
- **Compuertas:** XOR `¿Lectura consistente?` (con retorno a recalcular) · *Event-based* `¿Pago o vencimiento?`.
- **Eventos intermedios:** mensaje `Pago recibido` (catch) · timer `Plazo de pago vencido`.
- **Call Activity:** `Gestionar suspensión por mora` → `Proceso_SuspensionServicio` (generar orden, ejecutar suspensión en terreno, XOR ¿ejecutada?, registrar fecha con *Expression* `${now()}`).
- **Fin:** Factura pagada · Suspensión por mora gestionada.

### P2 – `Proceso_AtencionPqrs` (`ProcesoAtencionPqrs.bpmn`)
- **Pool:** GAS COROCORA – Atención al Usuario y PQRS · **Pools externos:** Usuario / Peticionario; SSPD.
- **Lanes:** Agente de servicio al cliente · Analista de PQRS · Sistema CRM.
- **Inicio:** `StartEvent_PqrsRecibida` (Camunda Form `formRadicarPqrs`).
- **Tareas de usuario:** Responder en primer contacto · Analizar caso y proyectar respuesta · Resolver recurso de reposición.
- **Tareas de servicio:** Radicar PQRS y calcular término legal (*Java Class*) · Clasificar ruta de atención (*DMN*) · Enviar alerta de vencimiento al jefe (*Delegate Expression*) · Notificar respuesta al usuario (*External – JavaScript*).
- **Compuertas:** XOR `¿Ruta de atención?` · XOR de unión · XOR `¿Procede ajuste a la factura?` · XOR de unión · *Event-based* `¿Usuario interpone recurso?` · XOR `¿Se confirma la decisión?`.
- **Eventos:** timer **no interruptor** en frontera `Término legal próximo a vencer` · mensaje `Recurso de reposición recibido` (catch) · timer `Término para recurso vencido` · mensaje `Remitir expediente a la SSPD` (**throw**).
- **Call Activity:** `Ajustar factura` → `Proceso_AjusteFactura` (aprobar ajuste, XOR, aplicar nota crédito).
- **Fin:** Alerta enviada · PQRS cerrada en firme · Recurso resuelto a favor · Expediente en apelación.

### P3 – `Proceso_ConexionNuevosUsuarios` (`ProcesoConexionNuevosUsuarios.bpmn`)
- **Pool:** GAS COROCORA – Gestión de Conexión de Nuevos Usuarios · **Pool externo:** Usuario solicitante.
- **Lanes:** Asesor comercial · Ingeniería de redes · Sistema comercial.
- **Inicio:** `StartEvent_SolicitudRecibida` (Camunda Form `formSolicitudConexion`).
- **Tareas de usuario:** Revisar documentos del predio · Realizar visita técnica · Elaborar diseño de acometida · Escalar incumplimiento del contratista.
- **Tareas de servicio:** Registrar solicitud · Notificar devolución · Notificar no viabilidad · Generar contrato de condiciones uniformes (*Java Class*) · Evaluar viabilidad técnica (*DMN*) · Calcular cotización · Matricular usuario (*Delegate Expression*) · Enviar cotización y contrato (*External – JavaScript*).
- **Compuertas:** XOR `¿Documentos completos?` · XOR `¿Es viable?` · **AND** (split/join) para diseño ∥ contrato.
- **Eventos:** mensaje `Contrato firmado por el usuario` (catch) · timer **interruptor** en frontera `Plazo de obra vencido` sobre la Call Activity.
- **Call Activity:** `Construir acometida e instalación interna` → `Proceso_ConstruccionAcometida` (ejecutar obra, inspeccionar, XOR ¿conforme? con retorno, emitir certificado).
- **Fin:** Solicitud devuelta · Solicitud no viable · Obra escalada por incumplimiento · Usuario conectado y habilitado.

### Tablas DMN (`src/main/resources/static/dmn/`)
| Decisión | Entradas | Salida | Hit policy |
|---|---|---|---|
| `Decision_FactorTarifario` | tipoUsuario, estrato | `porcentajeAjuste` (E1 −50, E2 −40, E3 −15, E4 0, E5–6 +20, comercial +20, industrial 0) | UNIQUE |
| `Decision_RutaAtencionPqrs` | tipoSolicitud, valorReclamado | `rutaAtencion` (RESPUESTA_INMEDIATA / ANALISIS_TECNICO) | FIRST |
| `Decision_ViabilidadTecnica` | capacidadRedSuficiente, distanciaRedMetros, tipoPredio | `viabilidad` (VIABLE / VIABLE_CON_EXTENSION / NO_VIABLE) | FIRST |

Los porcentajes y tarifas son **supuestos académicos** (topes del art. 99 de la Ley 142 de 1994); se cambian en la DMN o en `application.yaml` sin tocar código.

---

## 3. Arquitectura del proyecto (misma de los ejemplos de clase)

```
GasCorocoraCamunda/
├── pom.xml                         ← misma estructura del ejemplo: Spring Boot 3.2.0 + Camunda BOM 7.21.0 (+ jdbc, validation)
├── workers/                        ← External Tasks en JavaScript (camunda-external-task-client-js)
│   ├── EnviarFacturaWorker.js           topic EnviarFactura
│   ├── NotificarRespuestaPqrsWorker.js  topic NotificarRespuestaPqrs
│   ├── EnviarContratoConexionWorker.js  topic EnviarContratoConexion
│   ├── TodosLosWorkers.js / configuracion.js / package.json
├── docs/diagramas/                 ← vista previa de los 6 BPMN
└── src/main/
    ├── java/com/gascorocora/
    │   ├── Application.java                ← @SpringBootApplication + @EnableProcessApplication
    │   ├── config/                         ← ProcesosConstantes, PlazosProceso (bean "plazosProceso" usado en los timers)
    │   ├── controllers/                    ← REST: inicia procesos y correlaciona mensajes
    │   ├── services/                       ← casos de uso; únicos que usan RuntimeService / HistoryService
    │   ├── dto/                            ← records de entrada/salida con validación
    │   └── implementations/                ← JavaDelegates (paquete "implementations" como en la guía L09)
    │       ├── comun/VariablesUtil.java
    │       ├── facturacion/  pqrs/  conexion/
    └── resources/
        ├── application.yaml                ← usuario demo/demo, filtro "All tasks", plazos y tarifas
        ├── META-INF/processes.xml          ← additionalResourceSuffixes: form, dmn, bpmn
        └── static/ bpmn/  dmn/  forms/     ← 6 BPMN, 3 DMN, 17 Camunda Forms
```

**Tipos de implementación de Service Task usados (guía L09):** Java Class (`camunda:class`), Delegate Expression (`#{bean}` con `@Service("bean")`), Expression (`${now()}`), External (topic + worker JS). El message *throw* event también usa Java Class.

---

## 4. Cómo ejecutar

Requisitos: Java 17+, Maven, Node.js 18+.

```bash
# 1) Motor Camunda + aplicación
mvn spring-boot:run
#    Cockpit / Tasklist: http://localhost:8080/camunda   (usuario demo / clave demo)

# 2) En otra terminal: los workers JavaScript
cd workers
npm install
npm start                # o:  node .\EnviarFacturaWorker.js  (uno por uno, como en la guía)
```

### Paso a paso en Windows (doble clic)
1. Descomprima el zip y entre a la carpeta `GasCorocoraCamunda` (la que tiene `pom.xml`).
2. **Cierre cualquier otro Camunda** que tenga abierto (Camunda Run, el ejemplo de clase, otra ventana de este proyecto): todos usan el puerto 8080.
3. Doble clic en **`1-iniciar-camunda.bat`**. Verifica Java, Maven y el puerto, y arranca. Espere el mensaje `Started Application` (la primera vez descarga dependencias).
4. Abra http://localhost:8080/camunda → usuario `demo`, clave `demo`. En Cockpit deben aparecer **6 procesos y 3 decisiones**.
5. Doble clic en **`2-iniciar-workers.bat`**. Instala las dependencias de Node la primera vez, espera a que Camunda responda y deja escuchando los 3 topics.
6. Siga la guía de prueba de la sección 5.

> Sin Maven instalado: abra la carpeta en VS Code (Extension Pack for Java) o IntelliJ, espere a que importe el proyecto Maven y ejecute `Application.java` con **Run**, igual que el ejemplo `CamundaEmbedded` de clase.

> **¿Y el Camunda 7 que ya tengo instalado (Camunda Run / Camunda Platform)?** No hace falta: este proyecto **trae su propio motor Camunda 7** dentro de Spring Boot (como el ejemplo de la profesora), con Cockpit, Tasklist y la API REST. Si se despliegan los `.bpmn` en un Camunda Run aparte, las tareas `Java Class` y `Delegate Expression` fallan porque ese servidor no tiene las clases Java del proyecto. Por eso el Camunda instalado debe estar **cerrado** mientras corre este.

### Problemas comunes
| Síntoma | Causa | Solución |
|---|---|---|
| `Port 8080 was already in use` / `Web server failed to start` | Otro Camunda (Run o el ejemplo) está abierto | Ciérrelo. O cambie `server.port: 8081` en `application.yaml` y antes de los workers ejecute `set CAMUNDA_URL=http://localhost:8081/engine-rest` |
| `'mvn' no se reconoce como un comando` | Maven no está en el PATH | Ejecute `Application.java` desde el IDE o instale Maven |
| `invalid target release: 17` / `UnsupportedClassVersionError` | Java 8 u 11 | Instale JDK 17 o superior y verifique con `java -version` |
| `Database may be already in use` (H2) | Quedó otra ejecución abierta | Ciérrela, o borre la carpeta `h2/` para empezar desde cero |
| Cockpit no muestra los procesos | Se abrió la carpeta equivocada o falta `META-INF/processes.xml` | Ejecute desde la carpeta que contiene `pom.xml` |
| `Cannot use import statement outside a module` | Se ejecutó el worker fuera de la carpeta `workers` | Use `2-iniciar-workers.bat` o `cd workers` antes de `npm start` |
| `npm : ... la ejecución de scripts está deshabilitada` (PowerShell) | Política de ejecución de PowerShell | Use `npm.cmd install` / `npm.cmd start`, o el `.bat` |
| La tarea External queda detenida en Cockpit | Los workers no están corriendo | Inicie `2-iniciar-workers.bat` y la tarea se completa sola |
| `404 Ninguna instancia esta esperando este mensaje` | Número mal copiado, o el proceso aún no llega al evento | Consulte el número con `GET /api/procesos/{id}` o en Cockpit → Variables |
| Error `ENGINE-...` en una tarea de servicio | Incidente en Cockpit | Abra Cockpit → instancia → *Incidents*, copie el mensaje y revíselo |

Los plazos de los timers están cortos para la demo (`application.yaml → gascorocora.plazos`): pago 5 min, alerta PQRS 2 min, recurso 5 min, obra 10 min. Al lado de cada uno está el valor real de negocio.

## 5. Guía de prueba (capturas para la carpeta `docs`)

Todas las tareas de usuario están asignadas a `demo`, así que aparecen en Tasklist → *All tasks*. Los procesos se pueden iniciar desde **Tasklist → Start process** (formularios de inicio) o por la API REST.

**P1 – Facturación**
1. Start process → *Gestión de Medición y Facturación*. Ej.: estrato 2, residencial, promedio 20, lectura anterior 1000.
2. *Registrar lectura*: 1080 → desviación 300 % ⇒ aparece *Verificar lectura en terreno*. Corrija a 1021 y marque la verificación.
3. Revise la liquidación (subsidio −40 % aplicado por la DMN). El worker JS imprime la factura y el proceso queda esperando en el *event-based gateway*.
4. Pago (copie `numeroFactura` del Cockpit o de `GET /api/procesos/{id}`):
   ```bash
   curl -X POST http://localhost:8080/api/facturacion/facturas/FAC-20261113-1234/pagos \
        -H "Content-Type: application/json" -d '{"valorPagado":34110,"medioPago":"PSE"}'
   ```
   Si no paga en 5 min, gana el timer y se ejecuta la Call Activity de suspensión.

**P2 – PQRS**
1. Start process → *Atención al Usuario y PQRS*: tipo RECLAMO, valor 120000 ⇒ DMN = ANALISIS_TECNICO.
2. Deje la tarea *Analizar caso* abierta 2 min: el timer no interruptor ejecuta la alerta y la tarea sigue activa.
3. Complete marcando *procede ajuste* ⇒ Call Activity `Proceso_AjusteFactura` (aprobar).
4. El worker notifica la respuesta. Interponga el recurso antes de 5 min:
   ```bash
   curl -X POST http://localhost:8080/api/pqrs/PQRS-20261113-1234/recursos \
        -H "Content-Type: application/json" -d '{"motivoRecurso":"No estoy de acuerdo con el valor"}'
   ```
   En *Resolver recurso* marque *se confirma* ⇒ se lanza el mensaje a la SSPD.

**P3 – Conexión**
1. Start process → *Gestión de Conexión de Nuevos Usuarios*. Documentos completos ✔, visita: 120 m, capacidad ✔ ⇒ VIABLE_CON_EXTENSION.
2. Diseño (usuario) y contrato (servicio) corren en paralelo; luego el worker envía el contrato.
3. Firma del contrato:
   ```bash
   curl -X POST http://localhost:8080/api/conexiones/solicitudes/CON-20261113-1234/firma-contrato \
        -H "Content-Type: application/json" -d '{"firmadoPor":"Ana Pérez","canalFirma":"WEB"}'
   ```
4. Complete *Ejecutar obra* e *Inspeccionar* dentro de 10 min ⇒ matrícula del usuario. Si espera más, el timer interruptor cancela la obra y crea *Escalar incumplimiento*.

### API REST propia
| Método | Ruta | Acción BPMN |
|---|---|---|
| POST | `/api/facturacion/ciclos` | Inicia P1 |
| POST | `/api/facturacion/facturas/{numeroFactura}/pagos` | Mensaje `MensajePagoRecibido` |
| POST | `/api/pqrs` | Inicia P2 |
| POST | `/api/pqrs/{numeroRadicado}/recursos` | Mensaje `MensajeRecursoReposicion` |
| POST | `/api/conexiones/solicitudes` | Inicia P3 |
| POST | `/api/conexiones/solicitudes/{numeroSolicitud}/firma-contrato` | Mensaje `MensajeContratoFirmado` |
| GET | `/api/procesos/{processInstanceId}` | Estado y variables (activo o finalizado) |

---

## 6. Checklist de la rúbrica (2nd delivery – Standalone Execution)

| Elemento de la rúbrica | P1 Medición y Facturación | P2 Atención al Usuario y PQRS | P3 Conexión de Nuevos Usuarios |
|---|---|---|---|
| Camunda Forms (10 %) | `formIniciarCicloFacturacion`, `formRegistrarLectura`, `formVerificarLectura`, `formRevisarLiquidacion`, `formEjecutarSuspension` | `formRadicarPqrs`, `formResponderPrimerContacto`, `formAnalizarCaso`, `formResolverRecurso`, `formAprobarAjuste` | `formSolicitudConexion`, `formRevisarDocumentos`, `formVisitaTecnica`, `formDisenarAcometida`, `formEscalarIncumplimiento`, `formEjecutarObra`, `formInspeccionarInstalacion` |
| DMN table (10 %) | `Decision_FactorTarifario` | `Decision_RutaAtencionPqrs` | `Decision_ViabilidadTecnica` |
| X-AND / X-OR (10 %) | XOR `Gateway_LecturaConsistente` | XOR `Gateway_RutaAtencion`, `Gateway_ProcedeAjuste`, `Gateway_DecisionRecurso` | **AND** `Gateway_InicioParalelo`/`Gateway_FinParalelo` + XOR `Gateway_DocumentosCompletos`, `Gateway_Viabilidad` |
| Call Activity (20 %) | `CallActivity_GestionarSuspension` → `Proceso_SuspensionServicio` | `CallActivity_AjustarFactura` → `Proceso_AjusteFactura` | `CallActivity_ConstruirAcometida` → `Proceso_ConstruccionAcometida` |
| Message event (10 %) | Catch `Event_PagoRecibido` | Catch `Event_RecursoPresentado` + **Throw** `Event_RemitirExpedienteSspd` | Catch `Event_ContratoFirmado` |
| Event-based gateway / timer (20 %) | **Event-based** `Gateway_EsperarPago` (mensaje vs timer) | **Event-based** `Gateway_EsperarRecurso` + timer **no interruptor** `Event_AlertaTerminoLegal` | Timer **interruptor** `Event_PlazoObraVencido` |
| External Task JavaScript (20 %) | `EnviarFactura` → `EnviarFacturaWorker.js` | `NotificarRespuestaPqrs` → `NotificarRespuestaPqrsWorker.js` | `EnviarContratoConexion` → `EnviarContratoConexionWorker.js` |

### Calidad de la solución
- **Nomenclatura:** IDs BPMN con prefijo por tipo (`Activity_`, `Gateway_`, `Event_`, `Flow_`, `CallActivity_`, `Lane_`), nombres de tareas en verbo + objeto, compuertas en forma de pregunta, eventos en participio. Variables en camelCase de negocio (`numeroFactura`, `fechaLimiteRespuesta`); mensajes `MensajeXxx`; delegates `XxxDelegate`; beans en lowerCamelCase iguales a la `delegateExpression`.
- **Separación de responsabilidades (Spring Boot):** `controllers` solo reciben HTTP y validan DTOs → `services` encapsulan el uso de `RuntimeService`/`HistoryService` (iniciar, correlacionar, consultar) → `implementations` contienen la lógica de cada tarea automática → `config` centraliza constantes y parámetros (`application.yaml`). Los workers JS viven fuera del backend, como en la guía.
- **Orquestación en Camunda:** las reglas de negocio están en DMN (no en `if` de Java), los plazos en timers parametrizados, la espera de actores externos en eventos de mensaje correlacionados por llave de negocio, la reutilización en Call Activities con `in/out variables="all"` y *business key*, y todos los procesos y decisiones tienen `historyTimeToLive` (obligatorio desde Camunda 7.20).

## 7. Notas
- Si cambian un BPMN en el Modeler, mantengan los IDs de proceso, mensaje, decisión y formulario porque el código los referencia (`ProcesosConstantes`).
- La base H2 se guarda en la carpeta `h2/`. Bórrenla para empezar desde cero.
- Para la entrega, agreguen en `docs/` los pantallazos de Tasklist y Cockpit y eliminen `target/` y `workers/node_modules/` antes de comprimir (lo pide la guía).

## 8. Verificación real (13/11/2026, Windows 10, Java 17, Maven 3.9.11, Node 24)

El proyecto se ejecutó en el computador del grupo y se probaron los 3 procesos de punta a punta:

| Prueba | Resultado |
|---|---|
| Despliegue | 6 BPMN, 3 DMN y 17 Camunda Forms desplegados sin errores |
| P1 Facturación | Lectura inconsistente → verificación → DMN (−40 % estrato 2) → worker JS envía factura → pago por mensaje → `COMPLETED`. Sin pago: el timer del event-based gateway lanza la Call Activity de suspensión |
| P2 PQRS | DMN → análisis técnico → Call Activity de ajuste (nota crédito) → worker JS → mensaje de recurso → mensaje *throw* a la SSPD → `COMPLETED`. Timer no interruptor: envía la alerta y la tarea sigue activa |
| P3 Conexión | DMN `VIABLE_CON_EXTENSION` → compuerta AND (diseño ∥ contrato) → worker JS → firma por mensaje → Call Activity de obra → matrícula → `COMPLETED`. Timer interruptor: cancela la obra y crea *Escalar incumplimiento* |
| Tasklist | Formularios de inicio y de tarea se ven y se envían con los tipos correctos |

**Ajustes que salieron de la ejecución real:**
1. `pom.xml`: se agregó `spring-boot-starter-jdbc`. Sin él, al usar H2 en archivo no se crea el `DataSource` y Camunda falla con *PlatformTransactionManager not found*.
2. DMN: en DMN 1.3 la descripción va en `<description>` (no `<documentation>`). Los 9 BPMN/DMN se validaron contra los XSD oficiales de Camunda.
3. Camunda **7.20.0 → 7.21.0** y Spring Boot **3.1.1 → 3.2.0** (par oficialmente compatible): la Tasklist de 7.20.0 no dibuja ningún Camunda Form (error de form-js `createElement '[object Module]'`, incluso con un formulario de un solo campo). Con 7.21.0 se ven y funcionan.
4. `1-iniciar-camunda.bat`: llama a Maven con su ruta completa; `call "mvn.cmd"` entre comillas no arranca en Windows 10.
