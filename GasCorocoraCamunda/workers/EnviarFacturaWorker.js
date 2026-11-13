import { Client, Variables } from "camunda-external-task-client-js";
import { config, reportarFallo } from "./configuracion.js";

// Proceso: Gestion de Medicion y Facturacion
// Service Task "Enviar factura al usuario"  ->  topic: EnviarFactura
const client = new Client(config);

client.subscribe("EnviarFactura", async function ({ task, taskService }) {
  try {
    const email = task.variables.get("emailUsuario");
    const nombre = task.variables.get("nombreUsuario");
    const numeroFactura = task.variables.get("numeroFactura");
    const totalPagar = task.variables.get("totalPagar");
    const fechaLimitePago = task.variables.get("fechaLimitePago");

    console.log("** Enviando factura **" +
      "\nPara: " + email +
      "\nHola " + nombre + ", su factura " + numeroFactura +
      " por $" + totalPagar + " vence el " + fechaLimitePago + "." +
      "\nPague en el portal de recaudo o en bancos autorizados.");

    const processVariables = new Variables();
    processVariables.set("facturaEnviada", true);
    processVariables.set("fechaEnvioFactura", new Date().toISOString());
    processVariables.set("canalEnvioFactura", "EMAIL");

    await taskService.complete(task, processVariables);
  } catch (error) {
    await reportarFallo(taskService, task, error);
  }
});
