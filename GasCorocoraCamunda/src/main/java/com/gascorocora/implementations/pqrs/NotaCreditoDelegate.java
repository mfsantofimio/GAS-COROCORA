package com.gascorocora.implementations.pqrs;

import org.camunda.bpm.engine.delegate.DelegateExecution;
import org.camunda.bpm.engine.delegate.JavaDelegate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.gascorocora.implementations.comun.VariablesUtil;

/**
 * Service Task "Aplicar nota credito" del subproceso Proceso_AjusteFactura
 * (Delegate Expression #{notaCreditoDelegate}).
 */
@Service("notaCreditoDelegate")
public class NotaCreditoDelegate implements JavaDelegate {

    private static final Logger LOG = LoggerFactory.getLogger(NotaCreditoDelegate.class);

    @Override
    public void execute(DelegateExecution execution) throws Exception {
        String numeroNotaCredito = VariablesUtil.generarCodigo("NC");
        double valorAjuste = VariablesUtil.getDouble(execution, "valorAjuste", 0);

        execution.setVariable("numeroNotaCredito", numeroNotaCredito);
        execution.setVariable("estadoAjuste", "APLICADO");

        LOG.info("[Ajuste] Nota credito {} por ${} aplicada a la cuenta {} (radicado {})",
                numeroNotaCredito, valorAjuste, execution.getVariable("numeroCuenta"),
                execution.getVariable("numeroRadicado"));
    }
}
