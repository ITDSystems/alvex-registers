package com.alvexcore.repo.registers.api;

import java.io.IOException;
import org.alfresco.service.cmr.repository.NodeRef;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.springframework.extensions.webscripts.WebScriptRequest;
import org.springframework.extensions.webscripts.WebScriptResponse;


public class DeleteItems extends AbstractRegistryWebScript {

    private final Log logger = LogFactory.getLog(DeleteItems.class);

    @Override
    public void execute(WebScriptRequest webScriptRequest, WebScriptResponse webScriptResponse) throws IOException {

        String data = webScriptRequest.getContent().getContent();
        try {
            JSONObject json = new JSONObject(data);
            JSONArray nodes = json.getJSONArray("nodeRefs");
            for(int i = 0; i < nodes.length(); i++) {
                String nodeRefStr = nodes.getString(i);
                if(nodeRefStr == null || nodeRefStr.isEmpty())
                    continue;
                logger.trace(String.format("Deleting node {}", nodeRefStr));
                NodeRef nodeRef = new NodeRef(nodeRefStr);
                nodeService.deleteNode(nodeRef);
                logger.trace(String.format("Deleted node {}", nodeRefStr));
            }
        } catch (JSONException ex) {
            logger.error("Can not delete nodes!", ex);
        }

        webScriptResponse.setContentEncoding("UTF-8");
        webScriptResponse.setContentType("application/json");
        webScriptResponse.getWriter().write("{}");
    }
}