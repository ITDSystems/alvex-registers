package com.alvexcore.repo.registers.api;

import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.Reader;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;
import org.alfresco.model.ContentModel;
import org.alfresco.repo.content.MimetypeMap;
import org.alfresco.service.cmr.dictionary.AspectDefinition;
import org.alfresco.service.cmr.dictionary.PropertyDefinition;
import org.alfresco.service.cmr.repository.ChildAssociationRef;
import org.alfresco.service.cmr.repository.NodeRef;
import org.alfresco.service.namespace.QName;
import org.alfresco.service.namespace.RegexQNamePattern;
import org.apache.poi.ss.usermodel.CreationHelper;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.json.JSONArray;
import org.json.JSONObject;
import org.springframework.extensions.webscripts.Status;
import org.springframework.extensions.webscripts.WebScriptException;
import org.springframework.extensions.webscripts.WebScriptRequest;
import org.springframework.extensions.webscripts.WebScriptResponse;


public class RegistryAsXlsx extends AbstractRegistryWebScript {

    @Override
    public void execute(WebScriptRequest webScriptRequest, WebScriptResponse webScriptResponse) throws IOException {

        final String XLS_SHEET_NAME = "DataList";

        Reader reader = webScriptRequest.getContent().getReader();
        BufferedReader bufferReader = new BufferedReader(reader);

        String dataListNode = null;
        JSONObject jsonObj = new JSONObject();
        JSONArray nodesList = new JSONArray();
        JSONArray include;
        JSONArray exclude;
        List<String> siteNodes = new ArrayList<>();
        List<String> includeList = new ArrayList<>();
        List<String> excludeList = new ArrayList<>();

        try {
            jsonObj = new JSONObject(bufferReader.readLine());
            if (jsonObj.get("NodeRefs").getClass()==JSONArray.class) {
                nodesList = jsonObj.getJSONArray("NodeRefs");
                for(int i = 0; i < nodesList.length(); i++){
                    siteNodes.add(nodesList.get(i).toString());
                }
            }
            else {
                dataListNode = jsonObj.getString("NodeRefs");
            }
            if (jsonObj.has("include")) {
                include = jsonObj.getJSONArray("include");
                for (int i = 0; i < include.length(); i++) {
                    includeList.add(include.get(i).toString());
                }
            }
            else if ((jsonObj.has("exclude"))) {
                exclude = jsonObj.getJSONArray("exclude");
                for (int i = 0; i < exclude.length(); i++){
                    excludeList.add(exclude.get(i).toString());
                }
            }

            Workbook wb;

            for (String property: includeList){
                if (QName.resolveToQName(namespaceService, property)==null ||
                        dictionaryService.getProperty(QName.resolveToQName(namespaceService, property))==null){
                    webScriptResponse.setStatus(Status.STATUS_BAD_REQUEST);
                    throw new WebScriptException(Status.STATUS_BAD_REQUEST,
                            "ContentModel doesn't contain property: " + property);
                }
            }

            if (dataListNode==null) {
                List<NodeRef> itemsNodes = siteNodes.stream().map(NodeRef::new).collect(Collectors.toList());
                wb = createWorkbook(XLS_SHEET_NAME, includeList, excludeList, itemsNodes);
            }
            else {
                List<ChildAssociationRef> itemsNodesAssocs = nodeService.getChildAssocs(new NodeRef(dataListNode),
                        ContentModel.ASSOC_CONTAINS, RegexQNamePattern.MATCH_ALL);
                List<NodeRef> itemsNodes = itemsNodesAssocs.stream().map(ChildAssociationRef::getChildRef)
                        .collect(Collectors.toList());
                wb = createWorkbook(XLS_SHEET_NAME, includeList, excludeList, itemsNodes);
            }

            ByteArrayOutputStream baos = new ByteArrayOutputStream();
            wb.write(baos);

            webScriptResponse.setContentEncoding("UTF-8");
            webScriptResponse.setContentType(MimetypeMap.MIMETYPE_EXCEL);
            webScriptResponse.getOutputStream().write(baos.toByteArray());

        } catch (WebScriptException e) {
            webScriptResponse.setStatus(Status.STATUS_BAD_REQUEST);
            throw new WebScriptException(Status.STATUS_BAD_REQUEST, e.getMessage());
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * Returns workbook with datalist items
     * @return workbook
     */
    protected Workbook createWorkbook(String XLS_SHEET_NAME, List<String> includeList,
                                      List<String> excludeList, List<NodeRef> itemsNodes){

        Workbook wb = new XSSFWorkbook();

        CreationHelper createHelper = wb.getCreationHelper();
        Sheet sheet = wb.createSheet(XLS_SHEET_NAME);

        int rowNum = 0;

        if (includeList.toArray().length>0) {
            List<QName> headers = includeList.stream().map(x -> QName.resolveToQName(namespaceService, x))
                    .collect(Collectors.toList());
            List<String> values = new ArrayList<>();

            fillRows(itemsNodes, values,  headers, rowNum, createHelper, sheet);
        }
        else {
            QName typeDef = nodeService.getType(itemsNodes.get(0));
            Map<QName, PropertyDefinition> props = dictionaryService.getType(typeDef).getProperties();
            List<AspectDefinition> aspects = dictionaryService.getType(typeDef).getDefaultAspects(true);
            List<QName> headers = new ArrayList<>(props.keySet());
            List<String> values = new ArrayList<>();

            for(AspectDefinition aspect : aspects) {
                Map<QName, PropertyDefinition> aspectProps = aspect.getProperties();
                headers.addAll(aspectProps.keySet());
            }

            headers = headers.stream()
                    .filter(e -> !excludeList.contains(e.toPrefixString(namespaceService)))
                    .collect(Collectors.toList());

            fillRows(itemsNodes, values,  headers, rowNum, createHelper, sheet);
        }
        return wb;
    }

    private void fillRows(List<NodeRef> itemsNodes, List<String> values, List<QName> headers,
                          int rowNum, CreationHelper createHelper, Sheet sheet) {

        fillRowData(rowNum,
                headers.stream().map(x -> x.toPrefixString(namespaceService)).collect(Collectors.toList()),
                createHelper, sheet);
        rowNum++;

        for (NodeRef item : itemsNodes) {
            values.clear();
            for (QName header: headers){
                values.add(Objects.toString(nodeService.getProperty(item, header), ""));
            }
            fillRowData(rowNum, values, createHelper, sheet);
            rowNum++;
        }
    }

    private void fillRowData(int rowNum, List<String> values, CreationHelper createHelper, Sheet sheet)  {
        int cellNum = 0;
        Row row = sheet.createRow((short) rowNum);
        for (String value : values) {
            row.createCell(cellNum).setCellValue(createHelper.createRichTextString(value));
            cellNum++;
        }
    }
}