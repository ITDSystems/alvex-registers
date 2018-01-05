package com.alvexcore.repo.registers.api;

import java.io.IOException;
import org.alfresco.service.namespace.QName;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.extensions.webscripts.WebScriptRequest;
import org.springframework.extensions.webscripts.WebScriptResponse;


public class ConstraintOptions extends AbstractRegistryWebScript {

    private final Log logger = LogFactory.getLog(ConstraintOptions.class);

    @Override
    public void execute(WebScriptRequest webScriptRequest, WebScriptResponse webScriptResponse) throws IOException {

        String constraintShortName = webScriptRequest.getServiceMatch().getTemplateVars().get("name");
        QName constraintName = QName.resolveToQName(namespaceService, constraintShortName);

        webScriptResponse.setContentEncoding("UTF-8");
        webScriptResponse.setContentType("application/json");
        webScriptResponse.getWriter().write(getConstraintDescriptionJSON(constraintName).toString());
    }
}