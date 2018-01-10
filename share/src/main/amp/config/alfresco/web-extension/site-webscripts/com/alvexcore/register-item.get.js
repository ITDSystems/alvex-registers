<import resource="classpath:alfresco/site-webscripts/org/alfresco/share/imports/share-header.lib.js">
<import resource="classpath:alfresco/site-webscripts/org/alfresco/share/imports/share-footer.lib.js">

var headerServices = getHeaderServices();
var headerWidgets = getHeaderModel(msg.get("page.register-item.title"));

headerServices.push({
    id: "LIGHTBOX_SERVICE",
    name: "alfresco/services/LightboxService"
}, {
    id: "REGISTER_FORMS_RUNTIME_SERVICE",
    name: "alvex/services/RegisterFormsRuntimeService"
}, {
    id: "CRUD_SERVICE",
    name: "alfresco/services/CrudService"
}, {
    id: "DIALOG_SERVICE",
    name: "alfresco/services/DialogService"
}, {
    id: "NODE_PREVIEW_SERVICE",
    name: "alfresco/services/NodePreviewService"
}, {
    id: "SITE_SERVICE",
    name: "alfresco/services/SiteService"
}, {
    id: "USER_SERVICE",
    name: "alfresco/services/UserService"
}, {
    id: "REGISTER_SERVICE",
    name: "alvex/services/RegisterService"
}, {
    id: "REGISTER_FORM_SERVICE",
    name: "alvex/services/RegisterFormService"
}, {
    id: "DOCUMENT_SERVICE",
    name: "alfresco/services/DocumentService"
})

headerWidgets.push({
    name: "alfresco/layout/DynamicWidgets",
    config: {
        subscriptionTopic: "ALVEX_REGISTER_SHOW_BREADCRUMBTRAIL",
        subscribeGlobal: true
    }
}, {
    name: "alfresco/layout/HorizontalWidgets",
    config: {
        widgetMarginLeft: 10,
        widgetMarginRight: 10,
        widgets: [{
                name: "alfresco/layout/VerticalWidgets",
                config: {
                    widthPc: 80,
                    widgetMarginTop: 10,
                    widgetMarginBottom: 10,
                    widgets: [{
                        name: "alvex/registers/FormContainer"
                    }]
                }
            },
            {
                name: "alfresco/layout/VerticalWidgets",
                config: {
                    widgetMarginTop: 10,
                    widgetMarginBottom: 10,
                    widthPc: 20,
                    baseClass: "alfresco-layout-VerticalWidgets",
                    widgets: [{
                            name: "alfresco/layout/DynamicWidgets",
                            config: {
                                subscriptionTopic: "RIGHT_MENU_LINKS",
                                subscribeGlobal: true
                            }
                        }
                    ]
                }
            }
        ]
    }
});



model.jsonModel = getFooterModel(headerServices, headerWidgets);
model.jsonModel.groupMemberships = user.properties["alfUserGroups"];
