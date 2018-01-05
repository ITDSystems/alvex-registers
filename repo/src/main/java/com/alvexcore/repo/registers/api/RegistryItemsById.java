package com.alvexcore.repo.registers.api;

import org.json.JSONObject;
import org.springframework.extensions.webscripts.WebScriptRequest;
import org.springframework.extensions.webscripts.WebScriptResponse;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import org.alfresco.service.cmr.repository.NodeRef;
import org.alfresco.service.cmr.repository.StoreRef;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;


public class RegistryItemsById extends AbstractRegistryWebScript {
    
    private final Log logger = LogFactory.getLog(RegistryItemsById.class);

    @Override
    public void execute(WebScriptRequest webScriptRequest, WebScriptResponse webScriptResponse) throws IOException {

        String id = webScriptRequest.getServiceMatch().getTemplateVars().get("id");
        NodeRef targetListRef = new NodeRef(StoreRef.STORE_REF_WORKSPACE_SPACESSTORE, id);

        String startIndexStr = webScriptRequest.getParameter("startIndex");
        String pageSizeStr = webScriptRequest.getParameter("pageSize");
        Integer startIndex = (startIndexStr != null ? Integer.parseInt(startIndexStr) : -1);
        Integer pageSize = (pageSizeStr != null ? Integer.parseInt(pageSizeStr) : -1);

        Map<String,String> filters = new HashMap<>();
        for(String paramName : webScriptRequest.getParameterNames()) {
            if(paramName.startsWith("filter_")) {
                String paramValue = webScriptRequest.getParameter(paramName);
                if(paramValue != null && paramValue.isEmpty()) {
                    filters.put(paramName.replace("filter_", ""), paramValue);
                }
            }
        }

        String sortField = webScriptRequest.getParameter("sortField");
        String sortDirection = webScriptRequest.getParameter("sortDirection");
        sortDirection = (sortDirection != null ? sortDirection : "asc");

        JSONObject resp = getRegistryJSON(targetListRef, 
                startIndex, pageSize, filters, sortField, sortDirection);
        webScriptResponse.setContentEncoding("UTF-8");
        webScriptResponse.setContentType("application/json");
        webScriptResponse.getWriter().write(resp.toString());
    }
}