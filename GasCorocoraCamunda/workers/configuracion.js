import { logger } from "camunda-external-task-client-js";

// Misma configuracion del ejemplo de clase: el motor corre en Spring Boot (puerto 8080).
// Si cambian el puerto, ejecuten antes:  set CAMUNDA_URL=http://localhost:8081/engine-rest
export const config = {
  baseUrl: process.env.CAMUNDA_URL || "http://localhost:8080/engine-rest",
  use: logger,
  asyncResponseTimeout: 10000
};

// Reintentos cuando un worker falla (Camunda crea un incidente al llegar a 0)
export async function reportarFallo(taskService, task, error) {
  const reintentos = task.retries == null ? 3 : task.retries - 1;
  await taskService.handleFailure(task, {
    errorMessage: error.message,
    errorDetails: error.stack,
    retries: Math.max(reintentos, 0),
    retryTimeout: 10000
  });
}
