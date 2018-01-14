package com.alvexcore.repo.registers.api;

import com.alvexcore.repo.registers.AlvexRegistersContentModel;
import java.io.InputStream;
import java.io.Serializable;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Date;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Properties;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.sql.DataSource;
import org.alfresco.error.AlfrescoRuntimeException;
import org.alfresco.model.ContentModel;
import org.alfresco.repo.dictionary.constraint.ListOfValuesConstraint;
import org.alfresco.repo.i18n.MessageService;
import org.alfresco.service.ServiceRegistry;
import org.alfresco.service.cmr.dictionary.AspectDefinition;
import org.alfresco.service.cmr.dictionary.AssociationDefinition;
import org.alfresco.service.cmr.dictionary.ConstraintDefinition;
import org.alfresco.service.cmr.dictionary.DictionaryService;
import org.alfresco.service.cmr.dictionary.PropertyDefinition;
import org.alfresco.service.cmr.dictionary.TypeDefinition;
import org.alfresco.service.cmr.model.FileFolderService;
import org.alfresco.service.cmr.repository.AssociationRef;
import org.alfresco.service.cmr.repository.ChildAssociationRef;
import org.alfresco.service.cmr.repository.ContentService;
import org.alfresco.service.cmr.repository.MalformedNodeRefException;
import org.alfresco.service.cmr.repository.NodeRef;
import org.alfresco.service.cmr.repository.NodeService;
import org.alfresco.service.cmr.repository.StoreRef;
import org.alfresco.service.cmr.search.SearchService;
import org.alfresco.service.cmr.security.AccessStatus;
import org.alfresco.service.cmr.security.AuthenticationService;
import org.alfresco.service.cmr.security.AuthorityService;
import org.alfresco.service.cmr.security.PermissionService;
import org.alfresco.service.cmr.security.PersonService;
import org.alfresco.service.cmr.site.SiteService;
import org.alfresco.service.cmr.workflow.WorkflowService;
import org.alfresco.service.namespace.NamespaceService;
import org.alfresco.service.namespace.QName;
import org.alfresco.service.namespace.RegexQNamePattern;
import org.apache.commons.lang.text.StrSubstitutor;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.joda.time.format.DateTimeFormatter;
import org.joda.time.format.ISODateTimeFormat;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.beans.factory.annotation.Required;
import org.springframework.extensions.webscripts.AbstractWebScript;


public abstract class AbstractRegistryWebScript extends AbstractWebScript implements InitializingBean{

    public static final List<QName> SYSTEM_FIELDS = new ArrayList<>();
    static {
        SYSTEM_FIELDS.add(AlvexRegistersContentModel.PROP_ALVEX_REGISTER_ITEM_DISPLAY_NAME_CONFIG);
    }

    protected ServiceRegistry serviceRegistry;
    protected WorkflowService workflowService;
    protected FileFolderService fileFolderService;
    protected ContentService contentService;
    protected PersonService personService;
    protected NodeService nodeService;
    protected SiteService siteService;
    protected SearchService searchService;
    protected NamespaceService namespaceService;
    protected DictionaryService dictionaryService;
    protected MessageService messageService;
    protected AuthenticationService authenticationService;
    protected AuthorityService authorityService;
    protected PermissionService permissionService;

    protected DataSource dataSource;

    private final Log logger = LogFactory.getLog(AbstractRegistryWebScript.class);

    @Required
    public void setServiceRegistry(ServiceRegistry serviceRegistry) {
        this.serviceRegistry = serviceRegistry;
    }

    @Required
    public void setDataSource(DataSource dataSource) {
        this.dataSource = dataSource;
    }

    @Override
    public void afterPropertiesSet() throws Exception {
        workflowService = serviceRegistry.getWorkflowService();
        fileFolderService = serviceRegistry.getFileFolderService();
        contentService = serviceRegistry.getContentService();
        personService = serviceRegistry.getPersonService();
        siteService = serviceRegistry.getSiteService();
        nodeService = serviceRegistry.getNodeService();
        searchService = serviceRegistry.getSearchService();
        namespaceService = serviceRegistry.getNamespaceService();
        dictionaryService = serviceRegistry.getDictionaryService();
        messageService = serviceRegistry.getMessageService();
        authenticationService = serviceRegistry.getAuthenticationService();
        authorityService = serviceRegistry.getAuthorityService();
        permissionService = serviceRegistry.getPermissionService();
    }

    protected JSONArray getConstraintDescriptionJSON(QName constraintName)
    {
        ConstraintDefinition constraintDef = dictionaryService.getConstraint(constraintName);
        return getConstraintDescriptionJSON(constraintDef);
    }

    protected JSONArray getConstraintDescriptionJSON(ConstraintDefinition constraintDef)
    {
        QName constraintName = constraintDef.getName();
        String constraintType = constraintDef.getConstraint().getType();

        JSONObject resp = new JSONObject();
        JSONArray options = new JSONArray();
        try {
            resp.put("name", constraintName.toPrefixString(namespaceService));
            resp.put("type", constraintType);

            if(ListOfValuesConstraint.CONSTRAINT_TYPE.equalsIgnoreCase(constraintType)) {
                ListOfValuesConstraint lovc = (ListOfValuesConstraint)constraintDef.getConstraint();
                for(String key : lovc.getAllowedValues()) {
                    JSONObject option = new JSONObject();
                    option.put("value", key);
                    option.put("label", lovc.getDisplayLabel(key, messageService));
                    options.put(option);
                }
                resp.put("options", options);
            }
        } catch (JSONException e) {
            //
        }
        return options;
    }

    protected String getTypeDisplayNameConfig(QName typeName)
    {
        return getTypeDisplayNameConfig(dictionaryService.getType(typeName));
    }

    protected String getTypeDisplayNameConfig(TypeDefinition typeDef)
    {
        Map<String, String> defaultModel = new HashMap<>();
        defaultModel.put("firstName", ContentModel.PROP_FIRSTNAME.toPrefixString(namespaceService));
        defaultModel.put("lastName", ContentModel.PROP_LASTNAME.toPrefixString(namespaceService));
        defaultModel.put("nodeTitle", ContentModel.PROP_TITLE.toPrefixString(namespaceService));
        defaultModel.put("nodeName", ContentModel.PROP_NAME.toPrefixString(namespaceService));

        Map<QName, PropertyDefinition> props = typeDef.getProperties();
        PropertyDefinition alvexConfigProp = props.getOrDefault(
                AlvexRegistersContentModel.PROP_ALVEX_REGISTER_ITEM_DISPLAY_NAME_CONFIG, null);
        if(alvexConfigProp != null) {
            return alvexConfigProp.getDefaultValue();
        } else if (ContentModel.TYPE_PERSON.equals(typeDef.getName())) {
            return StrSubstitutor.replace("$${${firstName}} $${${lastName}}", defaultModel);
        } else if (typeDef.getDefaultAspectNames().contains(ContentModel.ASPECT_TITLED)) {
            return StrSubstitutor.replace("$${${nodeTitle}}", defaultModel);
        } else {
            return StrSubstitutor.replace("$${${nodeName}}", defaultModel);
        }
    }

    protected Map<QName, PropertyDefinition> getAllProperties(QName typeName)
    {
        return getAllProperties(dictionaryService.getType(typeName));
    }

    protected Map<QName, PropertyDefinition> getAllProperties(TypeDefinition typeDef)
    {
        Map<QName, PropertyDefinition> props = new HashMap<>();
        props.putAll(typeDef.getProperties());

        List<AspectDefinition> aspects = typeDef.getDefaultAspects(true);
        for(AspectDefinition aspect : aspects) {
            props.putAll(aspect.getProperties());
        }

        props.keySet().removeAll(SYSTEM_FIELDS);
        return props;
    }

    protected Map<QName, AssociationDefinition> getAllAssociations(QName typeName)
    {
        return getAllAssociations(dictionaryService.getType(typeName));
    }

    protected Map<QName, AssociationDefinition> getAllAssociations(TypeDefinition typeDef)
    {
        Map<QName, AssociationDefinition> assocs = new HashMap<>();
        assocs.putAll(typeDef.getAssociations());

        List<AspectDefinition> aspects = typeDef.getDefaultAspects(true);
        for(AspectDefinition aspect : aspects) {
            assocs.putAll(aspect.getAssociations());
        }

        assocs.keySet().removeAll(SYSTEM_FIELDS);
        return assocs;
    }

    protected JSONObject getPropertyDescriptionJSON(QName propQName)
    {
        try {
            JSONObject propObj = new JSONObject();
            propObj.put("name", propQName.toPrefixString(namespaceService));
            PropertyDefinition propDef = dictionaryService.getProperty(propQName);
            propObj.put("title", propDef.getTitle(messageService));

            ConstraintDefinition targetConstraintDef = null;
            for(ConstraintDefinition constraintDef : propDef.getConstraints()) {
                if(constraintDef.getConstraint().getType().equalsIgnoreCase(ListOfValuesConstraint.CONSTRAINT_TYPE))
                    targetConstraintDef = constraintDef;
            }
            propObj.put("constraint", (targetConstraintDef != null 
                    ? getConstraintDescriptionJSON(targetConstraintDef) 
                    : JSONObject.NULL));
            propObj.put("type", (targetConstraintDef != null 
                    ? ListOfValuesConstraint.CONSTRAINT_TYPE 
                    : propDef.getDataType().getName().toPrefixString(namespaceService)));
            propObj.put("multiple", propDef.isMultiValued());
            return propObj;
        } catch (JSONException e) {
            return null;
        }
    }

    protected JSONObject getAssociationDescriptionJSON(QName assocQName)
    {
        JSONObject assocObj = new JSONObject();
        try {
            String name = assocQName.toPrefixString(namespaceService);
            AssociationDefinition assocDef = dictionaryService.getAssociation(assocQName);
            String title = assocDef.getTitle(messageService);

            QName targetClassQName = assocDef.getTargetClass().getName();
            Boolean isAttach = targetClassQName.equals(ContentModel.TYPE_CONTENT);
            Boolean isChild = assocDef.isChild();

            assocObj.put("name", name);
            assocObj.put("type", (isAttach ? "ATTACH" : (isChild ? "CHILD_OBJECT": "LINK_INTERNAL")));
            assocObj.put("title", title);
            assocObj.put("constraint", JSONObject.NULL);
            assocObj.put("multiple", assocDef.isTargetMany());
        } catch (JSONException e) {
            //
        }
        return assocObj;
    }

    protected JSONObject getRecordJSON(NodeRef itemRef)
    {
        if(itemRef == null)
            return null;

        JSONObject item = new JSONObject();
        try {
            QName type = nodeService.getType(itemRef);
            item.put("id", itemRef.getId());
            item.put("nodeRef", itemRef.toString());
            item.put("displayName", getDisplayName(itemRef));
            item.put("type", type.toPrefixString(namespaceService));
            item.put("typeDisplayName", dictionaryService.getType(type).getTitle(messageService));
            item.put("properties", getPropertiesJSON(itemRef));
            item.put("permissions", getUserPermissionsJSON(itemRef));
        } catch (JSONException e) {
            //
        }
        return item;
    }

    protected JSONObject getUserPermissionsJSON(NodeRef itemRef) throws JSONException
    {
        Map<String,String> permissionsToCheck = new HashMap<>();
        permissionsToCheck.put("create", "CreateChildren");
        permissionsToCheck.put("edit", "Write");
        permissionsToCheck.put("delete", "Delete");

        JSONObject userPermissionJSON = new JSONObject();
        JSONObject userAccess = new JSONObject();
        for (String publicPermission : permissionsToCheck.keySet()) {
            String userPermission = permissionsToCheck.get(publicPermission);
            boolean hasPermission = AccessStatus.ALLOWED.equals(permissionService.hasPermission(itemRef, userPermission));
            userAccess.put(publicPermission, hasPermission);
        }
        userPermissionJSON.put("userAccess", userAccess);
        return userPermissionJSON;
    }

    protected JSONObject getPropertiesJSON(NodeRef itemRef)
    {
        JSONObject properties = new JSONObject();
        try
        {
            // Properties
            Map<QName,Serializable> props = nodeService.getProperties(itemRef);
            DateTimeFormatter dateTimeFormatter = ISODateTimeFormat.dateTime();
            for(QName prop : props.keySet()) {
                Object value = props.get(prop);
                Object jsonValue = getValueJSON(prop, value, dateTimeFormatter);
                if(jsonValue != null) {
                    properties.put(prop.toPrefixString(namespaceService), jsonValue);
                }
            }

            // Associations
            Map<QName,List<NodeRef>> assocsData = getAllAssocs(itemRef);
            for(QName assoc : assocsData.keySet()) {
                AssociationDefinition assocDefinition = dictionaryService.getAssociation(assoc);
                if(assocDefinition == null)
                    continue;
                QName targetNodeClass = assocDefinition.getTargetClass().getName();
                JSONArray values = new JSONArray();
                for(NodeRef targetRef : assocsData.get(assoc)) {
                    JSONObject item;
                    try {
                        item = new JSONObject();
                        item.put("nodeRef", targetRef.toString());
                        item.put("type", nodeService.getType(targetRef).toPrefixString(namespaceService));
                        item.put("value", getDisplayName(targetRef));
                        values.put(item);
                    } catch (JSONException e) {
                        //
                    }
                }
                properties.put(assoc.toPrefixString(namespaceService), values);
            }
        } catch (JSONException e) {
            //
        }
        return properties;
    }

    public Object getValueJSON(QName prop, Object value, DateTimeFormatter formatter)
    {
        if(value == null)
            return null;

        PropertyDefinition propDef = dictionaryService.getProperty(prop);
        if(propDef == null)
            return null;

        ConstraintDefinition targetConstraintDef = null;
        List<ConstraintDefinition> constraintDefs = propDef.getConstraints();
        for(ConstraintDefinition constraintDef : constraintDefs) {
            if(constraintDef.getConstraint().getType().equalsIgnoreCase(ListOfValuesConstraint.CONSTRAINT_TYPE))
                targetConstraintDef = constraintDef;
        }

        Boolean isMultiValued = propDef.isMultiValued();
        if(!isMultiValued) {
            if(value instanceof Date) {
                return formatter.print(((Date)value).getTime());
            } else if(targetConstraintDef != null) {
                // TODO: do we need this?
                // works for read only forms only! - returns label instead of value
                return ((ListOfValuesConstraint)targetConstraintDef.getConstraint()).getDisplayLabel((String)value, messageService);
            } else {
                return value.toString();
            }
        } else {
            List<Serializable> values = (List<Serializable>)value;
            JSONArray allValuesJSON = new JSONArray();
            for(Serializable singleValue : values) {
                if(singleValue == null)
                    continue;
                if(singleValue instanceof Date) {
                    allValuesJSON.put(formatter.print(((Date)singleValue).getTime()));
                } else if(targetConstraintDef != null) {
                    // TODO: do we need this?
                    // works for read only forms only! - returns label instead of value
                    allValuesJSON.put(((ListOfValuesConstraint)targetConstraintDef.getConstraint()).getDisplayLabel((String)value, messageService));
                } else {
                    allValuesJSON.put(singleValue.toString());
                }
            }
            return allValuesJSON;
        }
    }

    public String getDisplayName(NodeRef nodeRef)
    {
        DateTimeFormatter formatter = ISODateTimeFormat.date();
        QName nodeTypeQName = nodeService.getType(nodeRef);
        String displayNameString = getTypeDisplayNameConfig(nodeTypeQName);
        Map<QName,Serializable> props = nodeService.getProperties(nodeRef);

        Map<String, String> model = new HashMap<>();
        for(QName key : props.keySet()) {
            Serializable value = props.get(key);
            if(value == null)
                continue;
            if(value instanceof Date) {
                model.put(key.toPrefixString(namespaceService), formatter.print(((Date) value).getTime()));
            } else {
                model.put(key.toPrefixString(namespaceService), value.toString());
            }
        }

        return StrSubstitutor.replace(displayNameString, model);
    }

    protected JSONObject getRegistryJSON(NodeRef targetListRef, 
            Integer startIndex, Integer pageSize, Map<String,String> requestedFilters, 
            String sortField, String sortDirection)
    {
        JSONObject resp = new JSONObject();
        try {
            String listTypeShortNameData = (String)nodeService.getProperty(targetListRef, AlvexRegistersContentModel.PROP_ALVEX_REGISTER_ITEM_TYPE);
            QName dataTypeQName = null;
            if(listTypeShortNameData != null) {
                dataTypeQName = QName.resolveToQName(namespaceService, listTypeShortNameData);
            }
            resp.put("type", (listTypeShortNameData != null ? listTypeShortNameData : JSONObject.NULL));
            resp.put("id", targetListRef.getId());
            resp.put("nodeRef", targetListRef.toString());
            resp.put("title", nodeService.getProperty(targetListRef, ContentModel.PROP_TITLE));

            Map<QName,String> filters = new HashMap<>();
            List<Map<QName,String>> compositeFilters = new ArrayList<>();
            for(String filterKey : requestedFilters.keySet()) {
                String filterValue = requestedFilters.get(filterKey);
                logger.trace("Found filter: " + filterKey + " = " + filterValue);
                if(!filterValue.startsWith("(")) {
                    QName attrQName = QName.resolveToQName(namespaceService, filterKey);
                    filters.put(attrQName, filterValue);
                } else {
                    Map<QName,String> _subfilters = new HashMap<>();
                    filterValue = filterValue.substring(1, filterValue.length() - 1);
                    String[] subfilters = filterValue.split("\\|");
                    for(String subfilter : subfilters) {
                        String subfilterKey = subfilter.split("=")[0];
                        String subfilterValue = subfilter.split("=")[1];
                        logger.trace("Found subfilter: " + subfilterKey + " = " + subfilterValue);
                        QName attrQName = QName.resolveToQName(namespaceService, subfilterKey);
                        _subfilters.put(attrQName, subfilterValue);
                    }
                    compositeFilters.add(_subfilters);
                }
            }

            QName sortFieldQName;
            if(sortField != null) {
                sortFieldQName = QName.resolveToQName(namespaceService, sortField);
            } else {
                sortFieldQName = ContentModel.PROP_NAME;
            }
            logger.trace("Sorting by: " + sortFieldQName.toPrefixString(namespaceService) + " (" + sortDirection + ")");

            JSONArray items = new JSONArray();
            Map<NodeRef,String> responseItems;
            try {
                // Fast DB-backed search across Alfresco Repo, 
                // uses direct access to Alfresco DB, 
                // tested for Postgres only
                responseItems = findResponseItemsDB(targetListRef, dataTypeQName, 
                    filters, compositeFilters,
                    sortFieldQName, sortDirection, startIndex, pageSize,
                    resp);
            } catch (SQLException e) {
                logger.error("Can not execute SQL statement: "+ e.getMessage());
                e.printStackTrace();
                // Really slow Java-based search across Alfresco Repo
                // Failback for non-Postgres env
                responseItems = findResponseItemsJava(targetListRef, dataTypeQName, 
                    filters, compositeFilters,
                    sortFieldQName, sortDirection, startIndex, pageSize,
                    resp);
            }

            for(NodeRef itemRef : responseItems.keySet()) {
                JSONObject item = getRecordJSON(itemRef);
                items.put(item);
            }
            resp.put("items", items);

        } catch (JSONException e) {
            //
        }
        return resp;
    }
    
    protected Map<NodeRef, String> findResponseItemsJava(NodeRef targetListRef, QName dataType,
            Map<QName,String> filters, List<Map<QName,String>> compositeFilters,
            QName sortFieldQName, String sortDirection, Integer startIndex, Integer pageSize,
            JSONObject resp) throws JSONException
    {
        List<ChildAssociationRef> itemAssocs = nodeService.getChildAssocs(targetListRef);

        // Ugly. Just ugly.
        Map<NodeRef,String> items = new HashMap();
        for(ChildAssociationRef itemAssoc : itemAssocs) {
            NodeRef itemRef = itemAssoc.getChildRef();

            Map<QName, Serializable> props = nodeService.getProperties(itemRef);
            Map<QName,List<NodeRef>> assocs = getAllAssocs(itemRef);

            Boolean filtersMatch = true;
            for(QName attrQName : filters.keySet()) {
                String attrValue = filters.get(attrQName);
                filtersMatch = filtersMatch && filterByAttr(props, assocs, attrQName, attrValue);
            }
            for(Map<QName,String> subfilters : compositeFilters) {
                Boolean subfiltersMatch = false;
                for(QName attrQName : subfilters.keySet()) {
                    String attrValue = subfilters.get(attrQName);
                    subfiltersMatch = subfiltersMatch || filterByAttr(props, assocs, attrQName, attrValue);
                }
                filtersMatch = filtersMatch && subfiltersMatch;
            }

            // Get sort string
            Serializable sortStringData = nodeService.getProperty(itemRef, sortFieldQName);
            DateTimeFormatter sortDateTimeFormatter = ISODateTimeFormat.dateTime();
            String sortString;
            if(sortStringData instanceof Date) {
                sortString = sortDateTimeFormatter.print(((Date)sortStringData).getTime());
            } else {
                sortString = sortStringData.toString();
            }
            // NodeRef is key, since we may have duplicate sortStrings
            if(filtersMatch) {
                items.put(itemRef, sortString);
            }
        }

        JSONObject paging = new JSONObject();
        Integer _startIndex = (startIndex >= 0 ? startIndex : 0);
        Integer _pageSize = (pageSize > 0 ? pageSize : items.size());
        paging.put("start", _startIndex);
        paging.put("size", _pageSize);
        paging.put("total", items.size());
        resp.put("paging", paging);

        // Correct it if necessary before real request
        if(_startIndex + _pageSize > items.size()) {
            _pageSize = items.size() - _startIndex;
        }

        Stream<Map.Entry<NodeRef,String>> itemsStream = items.entrySet().stream();
        itemsStream = ("desc".equalsIgnoreCase(sortDirection)
                ? itemsStream.sorted(Map.Entry.comparingByValue(Collections.reverseOrder()))
                : itemsStream.sorted(Map.Entry.comparingByValue()));

        return itemsStream.skip(_startIndex).limit(_pageSize)
            .collect(Collectors.toMap(
                Map.Entry::getKey,
                Map.Entry::getValue,
                (e1, e2) -> e1,
                LinkedHashMap::new
            ));
    }

    protected Map<QName,List<NodeRef>> getAllAssocs(NodeRef itemRef)
    {
        Map<QName,List<NodeRef>> assocs = new HashMap<>();

        List<ChildAssociationRef> childAssocs = nodeService.getChildAssocs(itemRef);
        for(ChildAssociationRef childAssoc : childAssocs) {
            QName qname = childAssoc.getTypeQName();
            NodeRef nodeRef = childAssoc.getChildRef();
            if(!assocs.containsKey(qname)) {
                assocs.put(qname, new ArrayList<>());
            }
            assocs.get(qname).add(nodeRef);
        }
        List<AssociationRef> peerAssocs = nodeService.getTargetAssocs(itemRef, RegexQNamePattern.MATCH_ALL);
        for(AssociationRef peerAssoc : peerAssocs) {
            QName qname = peerAssoc.getTypeQName();
            NodeRef nodeRef = peerAssoc.getTargetRef();
            if(!assocs.containsKey(qname)) {
                assocs.put(qname, new ArrayList<>());
            }
            assocs.get(qname).add(nodeRef);
        }
        return assocs;
    }

    // TODO: ugly
    // TODO: not tested
    protected Boolean filterByAttr(Map<QName, Serializable> props, Map<QName,List<NodeRef>> assocs, QName attrQName, String attrString)
    {
        Boolean invert = attrString.startsWith("!");
        String attrValue = invert ? attrString.substring(1) : attrString;
        // Assoc filter
        if(assocs.containsKey(attrQName)) {
            Boolean assocSearchMatch = false;
            // NodeRef-based search
            try {
                for(NodeRef assocRef : assocs.get(attrQName)) {
                    NodeRef requestedNodeRef = new NodeRef(attrValue);
                    if(assocRef.equals(requestedNodeRef))
                        assocSearchMatch = true;
                }
            // DisplayName-based search
            } catch (MalformedNodeRefException e) {
                assocSearchMatch = false;
                /*for(NodeRef assocRef : assocs.get(attrQName)) {
                    String requestedName = attrValue.toLowerCase();
                    String assocName = getDisplayName(assocRef).toLowerCase();
                    String searchString = getSearchString(assocRef).toLowerCase();
                    if(requestedName.startsWith("^")) {
                        String _search = requestedName.substring(1);
                        assocSearchMatch = assocName.startsWith(_search) || searchString.contains(_search);
                    } else if(requestedName.endsWith("$")) {
                        String _search = requestedName.substring(0, requestedName.length() - 2);
                        assocSearchMatch = assocName.endsWith(_search) || searchString.endsWith(_search);
                    } else {
                        assocSearchMatch = assocName.contains(requestedName) || searchString.contains(requestedName);
                    }
                }*/
            }
            return (invert ? !assocSearchMatch : assocSearchMatch);
        }
        // Prop filter
        else if(props.containsKey(attrQName)) {
            Boolean propSearchMatch = true;
            String requestedValue = attrValue.toLowerCase();
            Serializable propValue = props.get(attrQName);
            if(propValue instanceof Date) {
                Date propDate = (Date)propValue;
                DateTimeFormatter dateTimeFormatter = ISODateTimeFormat.date();
                String[] parts = requestedValue.split("\\|");
                String startDateStr = (parts.length > 0 ? parts[0] : "");
                String endDateStr = (parts.length > 1 ? parts[1] : "");
                if(!startDateStr.isEmpty()) {
                    Date startDate = dateTimeFormatter.parseDateTime(startDateStr).toDate();
                    if(propDate.before(startDate))
                        propSearchMatch = false;
                }
                if(!endDateStr.isEmpty()) {
                    Date endDate = dateTimeFormatter.parseDateTime(endDateStr).toDate();
                    endDate.setHours(23);
                    endDate.setMinutes(59);
                    endDate.setSeconds(59);
                    if(propDate.after(endDate))
                        propSearchMatch = false;
                }
            } else {
                String stringValue = propValue.toString().toLowerCase();
                if(requestedValue.startsWith("^")) {
                    String _search = requestedValue.substring(1);
                    propSearchMatch = stringValue.startsWith(_search);
                } else if(requestedValue.endsWith("$")) {
                    String _search = requestedValue.substring(0, requestedValue.length() - 2);
                    propSearchMatch = stringValue.endsWith(_search);
                } else {
                    propSearchMatch = stringValue.contains(requestedValue);
                }
            }
            return (invert ? !propSearchMatch : propSearchMatch);
        }
        else {
            //(!assocs.containsKey(attrQName) && !props.containsKey(attrQName))
            return false;
        }
    }

    public Map<NodeRef, String> findResponseItemsDB(NodeRef targetListRef, QName dataTypeQName,
            Map<QName,String> _filters, List<Map<QName,String>> _compositeFilters,
            QName sortFieldQName, String sortDirection, Integer startIndex, Integer pageSize,
            JSONObject resp) throws JSONException, SQLException
    {
        Map<NodeRef, String> responseItems = new LinkedHashMap<>();

        String totalItemsSql = "select count(uuid) as total from alf_node ";

        Boolean sortByCmData = sortFieldQName.getNamespaceURI().equalsIgnoreCase(NamespaceService.CONTENT_MODEL_1_0_URI);
        String sql;
        // 'Normal' search
        if(!sortByCmData) {
            sql = "select alf_node.uuid, alf_node_properties.string_value "
                    + "from alf_node "
                    + "left join alf_node_properties "
                + "on (alf_node_properties.node_id = alf_node.id "
                    + "and alf_node_properties.qname_id=(select id from alf_qname "
                        + "where ns_id=(select id from alf_namespace where uri='" + sortFieldQName.getNamespaceURI() + "') "
                        + "and local_name='" + sortFieldQName.getLocalName() + "') "
                    + ") ";
        // TODO: crazy hack, can not sort by cm:* props as below
        } else {
            sql = "select alf_node.uuid, alf_node.audit_created from alf_node ";
        }
        // Base search part: store, type, parent
        String baseSearch = "where alf_node.store_id=(select id from alf_store where protocol='workspace' and identifier='SpacesStore') "
                + "and alf_node.type_qname_id=(select id from alf_qname "
                    + "where ns_id=(select id from alf_namespace where uri='" + dataTypeQName.getNamespaceURI() + "') "
                    + "and local_name='" + dataTypeQName.getLocalName() + "') "
                + "and id in (select child_node_id from alf_child_assoc where "
                    + "parent_node_id = (select id from alf_node where uuid='" + targetListRef.getId() + "')) ";
        sql += baseSearch;
        totalItemsSql += baseSearch;

        List<String> filterSql = new ArrayList<>();
        for(QName attrQName : _filters.keySet()) {
            String uri = attrQName.getNamespaceURI();
            String name = attrQName.getLocalName();
            String value = _filters.get(attrQName);
            filterSql.add("(" + getSqlFilterForAttr(attrQName, value) + ")");
        }

        for(Map<QName,String> _subfilters : _compositeFilters) {
            List<String> subfilterSql = new ArrayList<>();
            for(QName attrQName : _subfilters.keySet()) {
                String uri = attrQName.getNamespaceURI();
                String name = attrQName.getLocalName();
                String value = _subfilters.get(attrQName);
                subfilterSql.add(getSqlFilterForAttr(attrQName, value));
            }
            // join subfilters with OR
            filterSql.add("(" + String.join(" union ", subfilterSql) + ")");
        }

        if(filterSql.size() > 0) {
            // join filters with AND
            sql += " and alf_node.id in (" + String.join(" intersect ", filterSql) + ")";
            totalItemsSql += " and alf_node.id in (" + String.join(" intersect ", filterSql) + ")";
        }
        // Normal sorting
        if(!sortByCmData) {
            sql += " order by alf_node_properties.string_value " + sortDirection;
        // Crazy sorting for cm:* props
        } else {
            sql += " order by alf_node.audit_created " + sortDirection;
        }
        if(pageSize > 0) {
            sql += " limit " + pageSize;
        }
        Integer _startIndex = (startIndex >= 0 ? startIndex : 0);
        sql += " offset " + _startIndex;

        logger.trace("Searching with: " + sql);
        logger.trace("Total with: " + totalItemsSql);

        Connection con = null;
        try {
            con = dataSource.getConnection();

            PreparedStatement statement = con.prepareStatement(sql);
            ResultSet res = statement.executeQuery();
            while (res.next()) {
                responseItems.put(new NodeRef(StoreRef.STORE_REF_WORKSPACE_SPACESSTORE, res.getString("uuid")), null);
            }

            JSONObject paging = new JSONObject();
            paging.put("start", _startIndex);
            paging.put("size", pageSize);
            PreparedStatement statement2 = con.prepareStatement(totalItemsSql);
            ResultSet res2 = statement2.executeQuery();
            while (res2.next()) {
                paging.put("total", res2.getLong("total"));
            }
            resp.put("paging", paging);
        } finally {
            if(con != null) {
                try {
                    con.close();
                } catch (SQLException e) {
                    logger.error("Can not close connection: "+ e.getMessage());
                }
            }
        }
        return responseItems;
    }

    protected String getSqlFilterForAttr(QName attrQName, String attrString)
    {
        AssociationDefinition assocDef = dictionaryService.getAssociation(attrQName);
        Boolean invert = attrString.startsWith("!");
        String attrValue = invert ? attrString.substring(1).toLowerCase() : attrString.toLowerCase();
        // Prop filter
        if(dictionaryService.getProperty(attrQName) != null) {
            String uri = attrQName.getNamespaceURI();
            String name = attrQName.getLocalName();
            String propSqlBase = "select node_id from alf_node_properties "
                            + "where qname_id=(select id from alf_qname "
                                    + "where ns_id=(select id from alf_namespace where uri='" + uri + "') "
                                    + "and local_name='" + name + "') "
                            + "and ";
            // Date
            if(dictionaryService.getProperty(attrQName).getDataType().getName().getLocalName().equals("date")) {
                String[] parts = attrValue.split("\\|");
                String startDateStr = (parts.length > 0 ? parts[0] : "");
                String endDateStr = (parts.length > 1 ? parts[1] : "");
                String _search;
                if(!startDateStr.isEmpty() && !endDateStr.isEmpty()) {
                    _search = "between '" + startDateStr + "' and '" + endDateStr + "T23:59:59'";
                } else if(!startDateStr.isEmpty()) {
                    _search = ">= '" + startDateStr + "'";
                } else if(!endDateStr.isEmpty()) {
                    _search = "<= '" + endDateStr + "T23:59:59'";
                } else {
                    _search = "!= ''";
                }
                return propSqlBase + "string_value " + _search;
            // Int
            } else if(dictionaryService.getProperty(attrQName).getDataType().getName().getLocalName().equals("int")) {
                String _search;
                if(attrValue.startsWith("^") && attrValue.endsWith("$")) {
                    _search = attrValue.substring(1, attrValue.length() - 1);
                } else if(attrValue.startsWith("^")) {
                    _search = attrValue.substring(1);
                } else if(attrValue.endsWith("$")) {
                    _search = attrValue.substring(0, attrValue.length() - 1);
                } else {
                    _search = attrValue;
                }
                return propSqlBase + (invert ? "long_value != " + _search : "long_value = " + _search);
            // Not date, not int - consider it text
            } else {
                String _search;
                if(attrValue.startsWith("^") && attrValue.endsWith("$")) {
                    _search = "LIKE '" + attrValue.substring(1, attrValue.length() - 1).replaceAll("'", "''") + "'";
                } else if(attrValue.startsWith("^")) {
                    _search = "LIKE '" + attrValue.substring(1) + "%'";
                } else if(attrValue.endsWith("$")) {
                    _search = "LIKE '%" + attrValue.substring(0, attrValue.length() - 1).replaceAll("'", "''") + "'";
                } else {
                    _search = "LIKE '%" + attrValue.replaceAll("'", "''") + "%'";
                }
                return propSqlBase + (invert ? "lower(string_value) NOT " + _search : "lower(string_value) " + _search);
            }
        // Assoc filter
        } else if(assocDef != null) {
            String uri = attrQName.getNamespaceURI();
            String name = attrQName.getLocalName();
            try {
                // NodeRef-based search
                NodeRef requestedNodeRef = new NodeRef(attrValue);
                return "select source_node_id from alf_node_assoc "
                            + "where type_qname_id=(select id from alf_qname "
                                    + "where ns_id=(select id from alf_namespace where uri='" + uri + "') "
                                    + "and local_name='" + name + "') "
                            + "and target_node_id=(select id from alf_node where uuid='" + requestedNodeRef.getId() + "')";
            } catch (MalformedNodeRefException e) {
                // DisplayName-based search
                List<QName> fields = new ArrayList<>();
                String displayNameConfig = getTypeDisplayNameConfig(assocDef.getTargetClass().getName());
                Pattern p = Pattern.compile("\\{(.*?)\\}");
                Matcher m = p.matcher(displayNameConfig);
                while (m.find()) {
                    fields.add(QName.resolveToQName(namespaceService, m.group(1)));
                }
                String sqlBase = "select source_node_id from alf_node_assoc "
                            + "where type_qname_id=(select id from alf_qname "
                                    + "where ns_id=(select id from alf_namespace where uri='" + uri + "') "
                                    + "and local_name='" + name + "') "
                            + "and target_node_id in ";
                List<String> displayNameFilters = new ArrayList<>();
                for(QName field : fields) {
                    displayNameFilters.add(getSqlFilterForAttr(field, attrValue));
                }
                return sqlBase + "(" + String.join(" union ", displayNameFilters) + ")";
            }
        // Should never happen
        } else {
            throw new AlfrescoRuntimeException("Can not find attr for filtering: " + attrQName.toPrefixString(namespaceService));
        }
    }
}