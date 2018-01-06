function getRegistersServices() {
  return [{
      id: "LOGGING_SERVICE",
      name: "alfresco/services/LoggingService",
      config: {
        loggingPreferences: {
          enabled: true,
          all: true,
          warn: true,
          error: true
        }
      }
    },
    {
      id: "CRUD_SERVICE",
      name: "alfresco/services/CrudService"
    },
    {
      id: "LIGHTBOX_SERVICE",
      name: "alfresco/services/LightboxService"
    },
    {
      id: "REGISTER_SERVICE",
      name: "alvex/services/RegisterService"
    },
    {
      id: "DIALOG_SERVICE",
      name: "alfresco/services/DialogService"
    },
    {
      id: "DOCUMENT_SERVICE",
      name: "alfresco/services/DocumentService"
    },
    {
      id: "FORMS_RUNTIME_SERVICE",
      name: "alvex/services/FormsRuntimeService"
    },
    {
      id: "REGISTER_FORM_SERVICE",
      name: "alvex/services/RegisterFormService"
    },
    {
      id: "NODE_PREVIEW_SERVICE",
      name: "alfresco/services/NodePreviewService"
    },
    {
      id: "NOTIFICATION_SERVICE",
      name: "alfresco/services/NotificationService"
    },
    {
      id: "SEARCH_SERVICE",
      name: "alfresco/services/SearchService"
    },
    {
      id: "SITE_SERVICE",
      name: "alfresco/services/SiteService"
    },
    {
      id: "USER_SERVICE",
      name: "alfresco/services/UserService"
    },
    {
      id: "OPTIONS_SERVICE",
      name: "alfresco/services/OptionsService"
    }
  ];
}

function getRegisterList(config) {
  return {
    name: "alfresco/lists/AlfList",
    align: "sidebar",
    config: {
      loadDataPublishTopic: "ALVEX_GET_REGISTERS",
      loadDataPublishPayload: {
        siteId: config.siteId
      },
      itemsProperty: "items",
      widgets: [{
        name: "alfresco/lists/views/AlfListView",
        config: {
          widgets: [{
            name: "alfresco/lists/views/layouts/Row",
            config: {
              widgets: [{
                  name: "alfresco/lists/views/layouts/Cell",
                  config: {
                    additionalCssClasses: "mediumpad",
                    widgets: [{
                        name: "alfresco/renderers/PropertyLink",
                        config: {
                          propertyToRender: "node.properties.cm:title",
                          useCurrentItemAsPayload: false,
                          publishTopic: "ALVEX_GET_REGISTER_WIDGETS",
                          publishPayloadType: "PROCESS",
                          publishPayloadModifiers: ["processCurrentItemTokens"],
                          publishPayload: {
                            alfResponseTopic: "SHOW_REGISTER",
                            siteId: config.siteId,
                            fromMenu: true
                          },
                          publishPayloadItemMixin: true,
                          publishGlobal: true,
                          renderSize: "large",
                          renderOnNewLine: true
                        }
                      },
                      {
                        name: "alfresco/renderers/Property",
                        config: {
                          propertyToRender: "node.properties.cm:description",
                          renderOnNewLine: true
                        }
                      }
                    ]
                  }
                },
                {
                  name: "alfresco/lists/views/layouts/Cell",
                  config: {
                    widgets: [{
                        name: "alfresco/renderers/PublishAction",
                        config: {
                          renderFilter: [{
                            property: "node.permissions.user.Write",
                            renderOnAbsentProperty: false,
                            values: [true]
                          }],
                          iconClass: "edit-16",
                          propertyToRender: "title",
                          altText: "registers.edit-register.label",
                          onlyShowOnHover: true,
                          publishTopic: "ALF_CREATE_FORM_DIALOG_REQUEST",
                          publishPayloadType: "PROCESS",
                          publishPayloadModifiers: ["processCurrentItemTokens"],
                          publishPayload: {
                            dialogId: "ALVEX_REGISTER_EDIT_DIALOG",
                            dialogTitle: "registers.edit-register.title",
                            formSubmissionTopic: "ALVEX_UPDATE_REGISTER",
                            formSubmissionGlobal: true,
                            formSubmissionPayloadMixin: {
                              nodeRef: "{node.nodeRef}",
                              siteId: config.siteId,
                              fromMenu: true
                            },
                            widgets: [{
                                name: "alfresco/forms/controls/TextBox",
                                config: {
                                  label: "registers.register-title.label",
                                  value: "{node.properties.cm:title}",
                                  name: "title",
                                  requirementConfig: {
                                    initialValue: true
                                  }
                                }
                              },
                              {
                                name: "alfresco/forms/controls/TextArea",
                                config: {
                                  label: "registers.register-description.label",
                                  value: "{node.properties.cm:description}",
                                  name: "description"
                                }
                              }
                            ]
                          },
                          publishGlobal: true
                        }
                      },
                      {
                        name: "alfresco/renderers/PublishAction",
                        config: {
                          renderFilter: [{
                            property: "node.permissions.user.Delete",
                            renderOnAbsentProperty: false,
                            values: [true]
                          }],
                          iconClass: "delete-16",
                          propertyToRender: "title",
                          altText: "registers.delete-register.label",
                          onlyShowOnHover: true,
                          publishTopic: "ALVEX_DELETE_REGISTER",
                          publishPayloadType: "CURRENT_ITEM",
                          publishGlobal: true
                        }
                      }
                    ]
                  }
                }
              ]
            }
          }]
        }
      }]
    }
  };
}

function getRegisterDisplay() {
  return {
    name: "alfresco/layout/DynamicWidgets",
    config: {
      subscriptionTopic: "SHOW_REGISTER",
      subscribeGlobal: true
    }
  };
}

function getContainer(config) {
  var container = null;
  var result = remote.call("/slingshot/doclib/doclist/all/site/" + config.siteId + "/registers/");
  if (result.status == 200) // jshint ignore:line
  {
    var response = JSON.parse(result);
    container = response.metadata.container;
  }
  return container;
}

function getListTypes() {
  var types = [];
  var result = remote.call("/api/classes/alvexreg_registerItem/subclasses");

  if (result.status == 200) // jshint ignore:line
  {
    var classes = JSON.parse(result);
    var subclass;

    for (var i = 0, ii = classes.length; i < ii; i++) {
      subclass = classes[i];
      if (subclass.name === "alvexreg:registerItem") {
        // Ignore abstract parent type
        continue;
      }

      types.push({
        value: subclass.name,
        label: subclass.title
      });
    }
  }

  return types;
}


function getNewRegisterButton(config) {
  return {
    name: "alfresco/buttons/AlfButton",
    align: "sidebar",
    config: {
      style: {
        marginTop: "10px"
      },
      additionalCssClasses: "call-to-action",
      label: "registers.new-register.label",
      publishTopic: "ALF_CREATE_FORM_DIALOG_REQUEST",
      publishPayload: {
        dialogId: "NEW_REGISTER_DIALOG",
        dialogTitle: "registers.new-register.label",
        formSubmissionTopic: "ALF_CRUD_CREATE",
        formSubmissionGlobal: false,
        formSubmissionPayloadMixin: {
          alf_destination: getContainer(config),
          url: "api/type/alvexreg%3Aregister/formprocessor"
        },
        widgets: [{
            name: "alfresco/forms/controls/Select",
            config: {
              name: "prop_alvexreg_registerItemType",
              label: "registers.register-type.label",
              optionsConfig: {
                fixed: getListTypes()
              }
            }
          },
          {
            name: "alfresco/forms/controls/TextBox",
            config: {
              name: "prop_cm_title",
              label: "registers.register-title.label"
            }
          },
          {
            name: "alfresco/forms/controls/TextArea",
            config: {
              name: "prop_cm_description",
              label: "registers.register-description.label"
            }
          }
        ]
      },
      publishGlobal: true
    }
  };
}


function getRegistersWidgets(config) {
  return {
    name: "alfresco/layout/AlfSideBarContainer",
    config: {
      initialSidebarWidth: 220,
      isResizable: false,
      widgets: [
        getNewRegisterButton(config),
        getRegisterList(config),
        getRegisterDisplay()
      ]
    }
  };
}
