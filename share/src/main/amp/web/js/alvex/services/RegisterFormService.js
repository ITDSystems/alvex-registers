define(["dojo/_base/declare",
    "alfresco/core/Core",
    "alfresco/services/BaseService",
    "alfresco/core/CoreXhr",
    "alfresco/core/UrlUtilsMixin",
    "alfresco/core/topics",
    "alfresco/enums/urlTypes",
    "alfresco/services/_NavigationServiceTopicMixin",
    "service/constants/Default",
    "dojo/_base/lang",
    "dojo/_base/array",
    "alfresco/core/NodeUtils",
    "alfresco/documentlibrary/_AlfDocumentListTopicMixin"
  ],
  function(declare, Core, BaseService, AlfCoreXhr, UrlUtilsMixin, topics, urlTypes, _NavigationServiceTopicMixin, AlfConstants, lang, array, NodeUtils, _AlfDocumentListTopicMixin) {

    return declare([BaseService, Core, AlfCoreXhr, _AlfDocumentListTopicMixin], {

      i18nRequirements: [{
        i18nFile: "./i18n/RegisterFormService.properties"
      }],

      constructor: function alvex_services_RegisterFormService__constructor(args) {
        lang.mixin(this, args);
        this.alfSubscribe("CREATE_REGISTER_ITEM_FORM", lang.hitch(this, this.onCreateRegisterItemForm));
        this.alfSubscribe("EDIT_REGISTER_ITEM_FORM", lang.hitch(this, this.onEditRegisterItemForm));
        this.alfSubscribe("SAVE_CREATE_FORM", lang.hitch(this, this.onSaveCreateForm));
        this.alfSubscribe("SAVE_EDIT_FORM", lang.hitch(this, this.onSaveEditForm));
        //  this.alfSubscribe("REFRESH_DATALIST", lang.hitch(this, this.refreshRequest));
        //  this.alfSubscribe("UPLOAD_CHILD_FILES", lang.hitch(this, this.onUploadChildFiles));
        //  this.alfSubscribe("CLOSE_CREATE_FORM", lang.hitch(this, this.onCloseCreateForm));
      },

      onCreateRegisterItemForm: function alvex_services_RegisterFormService__onCreateRegisterItemForm(payload) {
        if (payload.alfDestination && payload.itemId) {
          config = {
            formConfig: {
              useDialog: true,
              formId: "NEW_REGISTER_ITEM_DIALOG",
              dialogTitle: "form.title.create",
              formSubmissionPayloadMixin: {
                responseScope: "ALVEX_REGISTER_"
              }
            },
            alfDestination: payload.alfDestination,
            itemId: payload.itemId,
            target: "CURRENT",
            itemKind: "type",
            mode: "create"
          }
          this.alfPublish(topics.REQUEST_FORM, config);
        }
      },

      onEditRegisterItemForm: function alvex_services_RegisterFormService__onEditRegisterItemForm(payload) {
        if (payload.itemId && payload.itemType) {
          config = {
            formConfig: {
              useDialog: false,
              formId: "EDIT_REGISTER_ITEM_DIALOG",
              formSubmissionPayloadMixin: {
                responseScope: "ALF_FORM_"
              }
            },
            itemType: payload.itemType,
            itemId: payload.itemId,
            target: "CURRENT",
            itemKind: "node",
            mode: "edit",
            alfSuccessTopic: "RETRIEVE_FORM"
          }
          this.alfPublish(topics.REQUEST_FORM, config);
        }
      }
    });
  });
