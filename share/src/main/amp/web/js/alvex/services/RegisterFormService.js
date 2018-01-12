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
        //  this.alfSubscribe("SAVE_EDIT_FORM", lang.hitch(this, this.onSaveEditForm));
        this.alfSubscribe("RENDER_CREATE_FORM", lang.hitch(this, this.onRenderCreateForm));
        //  this.alfSubscribe("REFRESH_DATALIST", lang.hitch(this, this.refreshRequest));
        //  this.alfSubscribe("UPLOAD_CHILD_FILES", lang.hitch(this, this.onUploadChildFiles));
        this.alfSubscribe("CLOSE_CREATE_FORM", lang.hitch(this, this.onCloseCreateForm));
      },

      onCreateRegisterItemForm: function alvex_services_RegisterFormService__onCreateRegisterItemForm(payload) {
        if (payload.alfDestination && payload.itemId && payload.siteId) {
          config = {
            formConfig: {
              useDialog: false,
              formId: "NEW_REGISTER_ITEM_FORM",
              formSubmissionPayloadMixin: {
                responseScope: "ALVEX_REGISTER_",
                siteId: payload.siteId,
                template: payload.template
              }
            },
            alfDestination: payload.alfDestination,
            itemId: payload.itemId,
            target: "CURRENT",
            itemKind: "type",
            mode: "create",
            alfSuccessTopic: "RENDER_CREATE_FORM"
          }
          this.alfPublish(topics.REQUEST_FORM, config);
        }
      },

      onEditRegisterItemForm: function alvex_services_RegisterFormService__onEditRegisterItemForm(payload) {
        if (payload.itemId && payload.itemType) {
          config = {
            formConfig: {
              useDialog: false,
              formId: "EDIT_REGISTER_ITEM_FORM",
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
      },

      onRenderCreateForm: function alvex_services_RegisterFormService__onRenderCreateForm(response) {
        var siteId = response.widgets[0].config.okButtonPublishPayload.siteId;
        //var registerRef = response.widgets[0].config.okButtonPublishPayload.alf_destination;
        response.widgets[0].config.showCancelButton = true;
        response.widgets[0].config.cancelButtonPublishGlobal = true;
        response.widgets[0].config.cancelButtonPublishTopic = "CLOSE_CREATE_FORM"
        response.widgets[0].config.pubSubScope = "";
        response.widgets[0].config.cancelButtonPublishPayload = {
          siteId: siteId,
        };
        response.widgets[0].config.okButtonPublishTopic = "SAVE_CREATE_FORM";
        response.widgets[0].config.okButtonPublishPayload.siteId = siteId;

        if (response.widgets[0].config.okButtonPublishPayload.template != null) {
          var formValue = {};
          for (var key in response.widgets[0].config.okButtonPublishPayload.template) {
            if (response.widgets[0].config.okButtonPublishPayload.template[key] instanceof Array) {
              var assocArray = "";
              for (var i = 0; i < response.widgets[0].config.okButtonPublishPayload.template[key].length; i++) {
                assocArray = assocArray + response.widgets[0].config.okButtonPublishPayload.template[key][i].nodeRef + ","
              };
              formValue["assoc_" + key.replace(":", "_")] = assocArray.substr(0, assocArray.length - 1);
            } else {
              var newkey = "prop_" + key.replace(":", "_");
              formValue[newkey] = response.widgets[0].config.okButtonPublishPayload.template[key];
            }
          }
          response.widgets[0].config.value = formValue;
        };
        this.alfPublish("SHOW_REGISTER", {
          widgets: [{
            name: "alfresco/layout/TitleDescriptionAndContent",
            config: {
              title: "form.title.create",
              widgets: response.widgets
            }
          }]
        });
      },

      onSaveCreateForm: function alvex_services_RegisterFormService__onSaveCreateForm(payload) {
        if (payload.alf_destination) {
          var url = payload.url;
          var successFunction = lang.hitch(this, this.onSaveCreateFormSuccess, payload.siteId);
          var data = payload;
          var config = {
            url: url,
            data: data,
            successCallback: successFunction,
            method: "POST",
            callbackScope: this
          };
          this.serviceXhr(config);
        }
      },

      onSaveCreateFormSuccess: function alvex_services_RegisterFormService__onSaveCreateFormSuccess(siteId, response) {
        if (siteId) {
          response.siteId = siteId;
          this.alfPublish("CLOSE_CREATE_FORM", response, true);
        } else {
          this.alfLog("warn", "A request was made to update Register but no 'siteId' attribute was provided in the payload", payload, this);
        }
      },

      onCloseCreateForm: function alvex_services_RegisterFormService__onCloseCreateForm(payload) {
        if (payload.siteId) {
          this.alfPublish("ALVEX_GET_REGISTERS", {
            siteId: payload.siteId,
            alfSuccessTopic: "ALVEX_GET_REGISTERS_SUCCESS",
            alfFailureTopic: "ALVEX_GET_REGISTERS_FAILURE",
            alfResponseTopic: "ALVEX_GET_REGISTERS",
            alfResponseScope: ""
          }, true);
        } else {
          this.alfLog("warn", "A request was made to update Register but no 'siteId' attribute was provided in the payload", payload, this);
        }
      }

    });
  });
