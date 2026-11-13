import { Client, Variables } from "camunda-external-task-client-js";
import { config, reportarFallo } from "./configuracion.js";

// Proceso: Atencion al Usuario y PQRS
// Service Task "Notificar respuesta al usuario"  ->  topic: NotificarRespuestaPqrs
const client = new Client(config);

client.subscribe("NotificarRespuestaPqrs", async function ({ task, taskService }) {
  try {
    const email = task.variables.get("emailUsuario");
    const numeroRadicado = task.variables.get("numeroRadicado");
    const respuesta = task.variables.get("respuestaUsuario");
    const procedeAjuste = task.variables.get("procedeAjuste");
    const estadoAjuste = task.variables.get("estadoAjuste");

    console.log("** Notificando respuesta de PQRS **" +
      "\nPara: " + email +
      "\nRadicado: " + numeroRadicado +
      "\nRespuesta: " + respuesta +
      "\nAjuste a la factura: " + (procedeAjuste ? (estadoAjuste || "NO APROBADO") : "NO APLICA") +
      "\nContra esta decision procede el recurso de reposicion y en subsidio el de apelacion ante la SSPD.");

    const processVariables = new Variables();
    processVariables.set("estadoPqrs", "RESPONDIDA");
    processVariables.set("fechaNotificacion", new Date().toISOString());

    await taskService.complete(task, processVariables);
  } catch (error) {
    await reportarFallo(taskService, task, error);
  }
});
