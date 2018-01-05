package com.alvexcore.repo.registers.api;

import org.json.JSONException;
import org.json.JSONObject;
import org.springframework.extensions.webscripts.WebScriptRequest;
import org.springframework.extensions.webscripts.WebScriptResponse;

import java.io.IOException;
import java.util.Map;
import org.alfresco.service.cmr.dictionary.AssociationDefinition;
import org.alfresco.service.cmr.dictionary.PropertyDefinition;
import org.alfresco.service.cmr.dictionary.TypeDefinition;
import org.alfresco.service.namespace.QName;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.json.JSONArray;


public class TypeDescription extends AbstractRegistryWebScript {

    private final Log logger = LogFactory.getLog(TypeDescription.class);

    @Override
    public void execute(WebScriptRequest webScriptRequest, WebScriptResponse webScriptResponse) throws IOException {

        String typeShortName = webScriptRequest.getServiceMatch().getTemplateVars().get("name");
        QName typeName = QName.resolveToQName(namespaceService, typeShortName);
        TypeDefinition typeDef = dictionaryService.getType(typeName);
        
        JSONObject resp = new JSONObject();
        
        try {
            resp.put("title", typeDef.getTitle(messageService));
            resp.put("type", typeDef.getName().toPrefixString(namespaceService));

            JSONArray fields = new JSONArray();

            Map<QName, PropertyDefinition> props = typeDef.getProperties();
            for(QName propQName : props.keySet()) {
                fields.put(getPropertyDescriptionJSON(propQName));
            }
            Map<QName, AssociationDefinition> assocs = typeDef.getAssociations();
            for(QName assocQName : assocs.keySet()) {
                fields.put(getAssociationDescriptionJSON(assocQName));
            }

            resp.put("fields", fields);
        } catch (JSONException e) {
            //
        }

        webScriptResponse.setContentEncoding("UTF-8");
        webScriptResponse.setContentType("application/json");
        webScriptResponse.getWriter().write(resp.toString());
    }
}