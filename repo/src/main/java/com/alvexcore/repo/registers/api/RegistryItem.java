package com.alvexcore.repo.registers.api;

import org.json.JSONObject;
import org.springframework.extensions.webscripts.WebScriptRequest;
import org.springframework.extensions.webscripts.WebScriptResponse;

import java.io.IOException;
import org.alfresco.service.cmr.repository.NodeRef;
import org.alfresco.service.cmr.repository.StoreRef;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;


public class RegistryItem extends AbstractRegistryWebScript {
    
    private final Log logger = LogFactory.getLog(RegistryItem.class);

    @Override
    public void execute(WebScriptRequest webScriptRequest, WebScriptResponse webScriptResponse) throws IOException
    {
        // Used by portal to retrive single POV record
        String itemId = webScriptRequest.getServiceMatch().getTemplateVars().get("itemid");
        NodeRef itemRef = new NodeRef(StoreRef.STORE_REF_WORKSPACE_SPACESSTORE, itemId);
        JSONObject resp = getRecordJSON(itemRef);
        if(resp != null) {
            webScriptResponse.setContentEncoding("UTF-8");
            webScriptResponse.setContentType("application/json");
            webScriptResponse.getWriter().write(resp.toString());
        } else {
            webScriptResponse.setStatus(404);
        }
    }
}