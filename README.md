# Nombre del proyecto: Gas Corocora

Empresa modelada: **GAS COROCORA**. Cada proceso principal se modeló en BPMN 2.0, con reglas de negocio en DMN y formularios de usuario en Camunda Forms, y es ejecutable en Camunda 7.

## Integrantes del grupo

| Estudiante (nombre completo) | Proceso que asumió | Nombre de la carpeta en el repositorio |
|---|---|---|
| Marlon Fabian Santofimio Romero | Atención al Usuario y PQRS (incluye subproceso Ajuste de Factura) | `atencion-pqrs/` |
| Brayan Steven Acosta Vigoya | Gestión de Conexión de Nuevos Usuarios (incluye subproceso Construcción de Acometida e Instalación Interna) | `conexion-nuevos-usuarios/` |
| Andrés Santiago Chavarro Pardo | Gestión de Medición y Facturación (incluye subproceso Suspensión del Servicio por Mora) | `medicion-facturacion/` |

## Artefactos a desplegar en el motor

Todos los archivos de la tabla deben desplegarse juntos, porque los procesos principales invocan a los subprocesos mediante *call activity* y referencian a los formularios y decisiones por su identificador (`formRef` y `decisionRef`, con binding `latest`). Si falta alguno, el despliegue o la ejecución fallan.

### 1. Atención al Usuario y PQRS

| Tipo | Archivo | Identificador | Nombre visible en el motor |
|---|---|---|---|
| BPMN | `ProcesoAtencionPqrs.bpmn` | `Proceso_AtencionPqrs` | **Atención al Usuario y PQRS** (evento de inicio: «PQRS recibida») |
| BPMN | `SubprocesoAjusteFactura.bpmn` | `Proceso_AjusteFactura` | Ajuste de Factura (evento de inicio: «Ajuste solicitado») |
| DMN | `DecisionRutaAtencionPqrs.dmn` | `Decision_RutaAtencionPqrs` | Clasificar ruta de atención de la PQRS |
| Form | `formRadicarPqrs.form`, `formResponderPrimerContacto.form`, `formAnalizarCaso.form`, `formResolverRecurso.form`, `formAprobarAjuste.form` | mismo nombre sin extensión | – |

### 2. Gestión de Conexión de Nuevos Usuarios

| Tipo | Archivo | Identificador | Nombre visible en el motor |
|---|---|---|---|
| BPMN | `ProcesoConexionNuevosUsuarios.bpmn` | `Proceso_ConexionNuevosUsuarios` | **Gestión de Conexión de Nuevos Usuarios** (evento de inicio: «Solicitud de conexión recibida») |
| BPMN | `SubprocesoConstruccionAcometida.bpmn` | `Proceso_ConstruccionAcometida` | Construcción de Acometida e Instalación Interna (evento de inicio: «Obra asignada») |
| DMN | `DecisionViabilidadTecnica.dmn` | `Decision_ViabilidadTecnica` | Evaluar viabilidad técnica de la conexión |
| Form | `formSolicitudConexion.form`, `formRevisarDocumentos.form`, `formVisitaTecnica.form`, `formDisenarAcometida.form`, `formEscalarIncumplimiento.form`, `formEjecutarObra.form`, `formInspeccionarInstalacion.form` | mismo nombre sin extensión | – |

### 3. Gestión de Medición y Facturación

| Tipo | Archivo | Identificador | Nombre visible en el motor |
|---|---|---|---|
| BPMN | `ProcesoMedicionFacturacion.bpmn` | `Proceso_MedicionFacturacion` | **Gestión de Medición y Facturación** (evento de inicio: «Ciclo de facturación iniciado») |
| BPMN | `SubprocesoSuspensionServicio.bpmn` | `Proceso_SuspensionServicio` | Suspensión del Servicio por Mora (evento de inicio: «Mora detectada») |
| DMN | `DecisionFactorTarifario.dmn` | `Decision_FactorTarifario` | Determinar factor tarifario por estrato |
| Form | `formIniciarCicloFacturacion.form`, `formRegistrarLectura.form`, `formVerificarLectura.form`, `formRevisarLiquidacion.form`, `formEjecutarSuspension.form` | mismo nombre sin extensión | – |

### Resumen

Se despliegan **6 procesos BPMN**, **3 decisiones DMN** y **17 formularios**. Los tres procesos principales se inician desde Tasklist (*Start process*) con el nombre visible indicado en negrita; los tres subprocesos son ejecutables, pero normalmente los lanza el proceso principal.

## Cómo desplegar

1. Abrir Camunda Modeler y conectarse al motor (Camunda 7, por defecto `http://localhost:8080/`).
2. Desplegar cada `.bpmn`, `.dmn` y `.form` con *Deploy current diagram*, incluyendo los demás archivos en el mismo despliegue. La carpeta del repositorio de cada integrante contiene los suyos.
3. Entrar a Tasklist, pulsar *Start process* y elegir el proceso por su nombre visible.
