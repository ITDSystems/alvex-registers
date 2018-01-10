define(["dojo/_base/declare",
    "alfresco/services/BaseService",
    "alfresco/core/CoreXhr",
    "alfresco/core/NodeUtils",
    "alfresco/core/topics",
    "dojo/_base/array",
    "dojo/_base/lang",
    "service/constants/Default",
    "jquery",
    "alfresco/util/hashUtils",
    // No call backs from here...
    "alfresco/layout/TitleDescriptionAndContent",
    "alfresco/lists/AlfList",
    "alfresco/lists/views/AlfListView",
    "alfresco/lists/views/layouts/Row",
    "alfresco/lists/views/layouts/Cell",
    "alfresco/lists/views/layouts/HeaderCell",
    "alfresco/renderers/Date",
    "alfresco/renderers/Property",
    "alvex/renderers/RegisterItemLink"
  ],
  function(declare, BaseService, CoreXhr, NodeUtils, topics, array, lang, AlfConstants, $, hashUtils) {

    return declare([BaseService, CoreXhr], {

      i18nRequirements: [{
        i18nFile: "./i18n/RegisterService.properties"
      }],

      registerSubscriptions: function alvex_services_RegisterService__registerSubscriptions() {
        this.alfSubscribe("ALVEX_DELETE_REGISTER", lang.hitch(this, this.onDeleteRegisterRequest));
        this.alfSubscribe("ALVEX_DELETE_REGISTER_CONFIRMATION", lang.hitch(this, this.onDeleteRegisterConfirmation));
        this.alfSubscribe("ALVEX_REGISTER_DELETE_ITEM", lang.hitch(this, this.onDeleteRegisterItemsRequest));
        this.alfSubscribe("ALVEX_REGISTER_DELETE_ITEM_CONFIRMATION", lang.hitch(this, this.onDeleteRegisterItemsConfirmation));
        this.alfSubscribe("ALVEX_GET_REGISTERS", lang.hitch(this, this.getRegisters));
        this.alfSubscribe("ALVEX_GET_REGISTERS_SUCCESS", lang.hitch(this, this.onShowInitialList));
        this.alfSubscribe("ALVEX_GET_REGISTER_ITEMS", lang.hitch(this, this.getRegisterItems));
        this.alfSubscribe("ALVEX_GET_REGISTER_WIDGETS", lang.hitch(this, this.getRegisterWidgets));
        this.alfSubscribe("ALVEX_UPDATE_REGISTER", lang.hitch(this, this.updateRegister));
        this.alfSubscribe("ALVEX_REGISTER_SAVE_COLUMNS_CONFIG", lang.hitch(this, this.onSaveColumnsConfig));
        this.alfSubscribe("ALVEX_REGISTER_SET_FILTERS_HASH_EMPTY", lang.hitch(this, this.onSetFiltersHashEmpty));
        this.alfSubscribe("ALVEX_REGISTERS_NAVIGATE_TO_PAGE_AND_SAVE_HASH", lang.hitch(this, this.onNavigateToPageAndSaveHash));
        /*  this.alfSubscribe("ALVEX_REGISTER_VIEW_RECORD_VERSIONS", lang.hitch(this, this.onViewRecordVersions));
          this.alfSubscribe("ALVEX_REGISTER_REVERT_RECORD_VERSION", lang.hitch(this, this.onRevertRecordVersion));*/
      },

      defaultDataTypeMappings: {
        "datetime": {
          name: "alfresco/renderers/Date",
          config: {
            simple: true,
            format: "dd.mm.yyyy"
          }
        },
        "date": {
          name: "alfresco/renderers/Date",
          config: {
            simple: true,
            format: "dd.mm.yyyy"
          }
        },
        "cm:content": {
          name: "alfresco/lists/AlfList",
          config: {
            style: {
              overflow: "hidden"
            },
            waitForPageWidgets: false,
            pubSubScope: "ALF_CONTENT_INFO_",
            noDataMessage: " ",
            widgets: [{
              name: "alfresco/lists/views/AlfListView",
              config: {
                widgets: [{
                  name: "alfresco/lists/views/layouts/Row",
                  config: {
                    widgets: [{
                        name: "alfresco/lists/views/layouts/Cell",
                        config: {
                          width: "20px",
                          widgets: [{
                            name: "alfresco/renderers/SmallThumbnail",
                            config: {
                              dimensions: {
                                w: "15px",
                                h: "15px",
                                margins: "2px"
                              },
                              itemKey: "nodeRef",
                              assumeRendition: true,
                              showDocumentPreview: true,
                              usePreviewService: true
                            }
                          }]
                        }
                      },
                      {
                        name: "alfresco/lists/views/layouts/Cell",
                        config: {
                          widgets: [{
                            name: "alfresco/renderers/Property",
                            config: {
                              propertyToRender: "value"
                            }
                          }]
                        }
                      }
                    ]
                  }
                }]
              }
            }]
          }
        }
      },
      defaultTypeMappings: {
        "association": {
          name: "alvex/renderers/RegisterItemLink",
          config: {
            isDatagridPage: true
          }
        }
      },

      userColumnConfiguration: "",

      onDeleteRegisterRequest: function alvex_services_RegisterService__onDeleteRegisterRequest(payload) {
        if (payload.node.nodeRef) {
          this.alfServicePublish(topics.REQUEST_CONFIRMATION_PROMPT, {
            confirmationTitle: this.message("delete.action.title") + payload.node.properties["cm:title"],
            confirmationPrompt: this.message("delete.action.text"),
            confirmationButtonLabel: "Yes",
            cancellationButtonLabel: "No",
            confirmationPublication: {
              publishTopic: "ALVEX_DELETE_REGISTER_CONFIRMATION",
              publishPayload: {
                nodeRef: payload.node.nodeRef
              },
              publishGlobal: true
            }
          });
        } else {
          this.alfLog("warn", "A request was made to delete a Register but no 'nodeRef' attribute was provided in the payload", payload, this);
        }
      },

      onDeleteRegisterConfirmation: function alvex_services_RegisterService__onDeleteRegisterConfirmation(payload) {
        var nodeRef = NodeUtils.processNodeRef(payload.nodeRef);
        this.serviceXhr({
          url: AlfConstants.PROXY_URI + "slingshot/doclib/action/folder/node/" + nodeRef.uri,
          method: "DELETE",
          nodeRef: payload.nodeRef,
          successCallback: this.onDeleteRegisterSuccess,
          failureCallback: this.onDeleteRegisterFailure,
          callbackScope: this
        });
      },

      onDeleteRegisterSuccess: function alvex_services_RegisterService__onDeleteRegisterSuccess(response, originalRequestConfig) {
        // TODO: May need a more specific scoped publication
        this.alfPublish(topics.RELOAD_DATA_TOPIC);

        // Publish a success topic...
        // this is done so that if the Data List items are currently being displayed they can be hidden...
        this.alfPublish("ALVEX_DELETE_REGISTER_SUCCESS", {
          nodeRef: originalRequestConfig.nodeRef
        });
      },

      onDeleteRegisterFailure: function alvex_services_RegisterService__onDeleteRegisterFailure(response, originalRequestConfig) {
        this.alfLog("error", "It was not possible to delete a Register", response, originalRequestConfig, this);
      },

      setColumnsConfiguration: function alvex_services_RegisterService__setColumnsConfiguration(value) {
        if (value) {
          this.userColumnConfiguration = value;
        } else {
          this.userColumnConfiguration = "";
        }
      },

      getRegisters: function alvex_services_RegisterService__getRegisters(payload) {
        if (payload.siteId) {
          var url = AlfConstants.PROXY_URI + "slingshot/doclib2/doclist/all/site/" + payload.siteId + "/registers/";
          var successFunction = lang.hitch(this, this.onGetRegistersSuccess, payload.siteId);
          var config = {
            url: url,
            successCallback: successFunction,
            method: "GET"
          };
          this.mergeTopicsIntoXhrPayload(payload, config);
          this.serviceXhr(config);
        } else {
          this.alfLog("warn", "A request was made to retrive Registers but no 'siteId' attribute was provided", payload, this);
        }
      },

      onGetRegistersSuccess: function alvex_services_RegisterService__onGetRegistersSuccess(siteId, response, originalRequestConfig) {
        var newResponse = response;
        newResponse.siteId = siteId;
        this.alfPublish("ALVEX_GET_REGISTERS_SUCCESS", {
          response: newResponse
        }, false, false, originalRequestConfig.alfResponseScope);
      },

      onShowInitialList: function alvex_services_RegisterService__onShowInitialList(response) {
        var hash = hashUtils.getHash();
        if (hash.list) {
          var result = $.grep(response.response.items, function(e) {
            return e.node.nodeRef == hash.list;
          });
          if (result.length == 1) {
            config = result[0];
            config.alfResponseTopic = "SHOW_REGISTER";
            config.siteId = response.response.siteId;
            this.alfPublish("ALVEX_GET_REGISTER_WIDGETS", config, true);
          }
        }
      },

      getRegisterItems: function alvex_services_RegisterService_getRegisterItems(payload) {
        if (payload.nodeRef) {
          var nodeRef = NodeUtils.processNodeRef(payload.nodeRef);
          var url = AlfConstants.PROXY_URI + "api/alvex/registers/" + nodeRef.id + "/items?noCache=" + new Date().getTime();
          if (payload.pageSize && payload.page) {
            var startIndex = payload.pageSize * (payload.page - 1);
            url += "&pageSize=" + payload.pageSize + "&startIndex=" + startIndex;
          }
          var sortDir = (payload.sortAscending !== null && payload.sortAscending === true) ? "asc" : "desc";
          if (payload.sortField && payload.sortField !== "cm:name") {
            url += "&sortField=" + encodeURIComponent(payload.sortField) + "&sortDirection=" + sortDir;
          }
          var hash = hashUtils.getHash();
          payload.dataFilters = [];
          for (var i in hash) {
            if (i.substr(0, 7) == "filter_") {
              payload.dataFilters.push({
                value: hash[i],
                name: i
              })
            }
          }
          if (payload.dataFilters && payload.dataFilters[0] && payload.dataFilters[0].value && payload.dataFilters[0].value.length != 0) {
            var filters = {};
            for (var i = 0; i < payload.dataFilters.length; i++) {
              if (payload.dataFilters[i].name.substr(0, 7) == "filter_") {
                if (payload.dataFilters[i].name.substr(7, 4) == "date") {
                  /*var filter = payload.dataFilters[i].name.substr(6);
                  if (filters[filter] == null) {
                    if (payload.dataFilters[i].name.substr(0, 5) == "date1") {
                      filters[payload.dataFilters[i].name.substr(6)] = payload.dataFilters[i].value + "|";
                    } else {
                      filters[payload.dataFilters[i].name.substr(6)] = "|" + payload.dataFilters[i].value;
                    }
                  } else {
                    var oldFilter = filters[filter];
                    if (payload.dataFilters[i].name.substr(0, 5) == "date1") {
                      filters[filter] = payload.dataFilters[i].value + oldFilter;
                    } else {
                      filters[filter] = oldFilter + payload.dataFilters[i].value;
                    }
                  }*/
                } else if (payload.dataFilters[i].value === "all") {

                } else {
                  filters[payload.dataFilters[i].name] = payload.dataFilters[i].value;
                }
                /*if (payload.dataFilters[i].name.substr(0, 6) == "date1_") {
                  url += "&filter_" + payload.dataFilters[i].name.substr(6) + "=" + payload.dataFilters[i].value + "%7C";
                } else if (payload.dataFilters[i].name.substr(0,6) == "date2_") {
                  if ( url.substr(url.length - 3, 3) != "%7C") {
                    url += "&filter_" + payload.dataFilters[i].name.substr(6) + "=%7C" + payload.dataFilters[i].value;
                  } else {
                    url += payload.dataFilters[i].value;
                  }
                } else {
                  url += "&filter_" + payload.dataFilters[i].name + "=" + payload.dataFilters[i].value;
                }*/
              }
            }
            for (var key in filters) {
              url += "&" + encodeURIComponent(key) + "=" + encodeURIComponent(filters[key]);
            }
          }
          var config = {
            url: url,
            method: "GET",
            alfTopic: payload.alfResponseTopic
          };
          this.serviceXhr(config);
        } else {
          this.alfLog("warn", "A request was made to retrive Register items the 'nodeRef' attribute was not provided", payload, this);
        }
      },

      getRegisterWidgets: function alvex_services_RegisterService__getRegisterWidgets(payload) {
        if (payload.node.nodeRef && payload.node.properties["alvexreg:registerItemType"] && payload.siteId) {
          var type = payload.node.properties["alvexreg:registerItemType"];
          payload.itemType = type;
          var hash = hashUtils.getHash();
          /*if (hash.mode && hash.mode == "create") {
            this.alfPublish("CREATE_REGISTER_ITEM_FORM", {
              alfDestination: payload.nodeRef,
              itemId: payload.itemType,
              itemKind: "type",
              mode: "create"
            });
            hashUtils.updateHash({
              mode: "view"
            });
          } else {*/
          if (payload.fromMenu == true) {
            hashUtils.setHash({
              list: payload.node.nodeRef
            }, true);
          } else {
            hashUtils.updateHash({
              list: payload.node.nodeRef
            });
          }
          var nodeRef = NodeUtils.processNodeRef(payload.node.nodeRef);
          this.alfServicePublish(topics.GET_PREFERENCE, {
            preference: "com.alvexcore.registers." + nodeRef.id,
            callback: this.setColumnsConfiguration,
            callbackScope: this
          });
          var url = AlfConstants.URL_SERVICECONTEXT + "com/alvexcore/registers/config/columns?itemType=" + type;
          var successFunction = lang.hitch(this, this.onColumnsRetrieved, payload.siteId)
          this.serviceXhr({
            url: url,
            data: payload,
            method: "GET",
            successCallback: successFunction,
            failureCallback: this.onColumnsFailed,
            callbackScope: this
          });
          //}
        } else {
          this.alfLog("warn", "A request was made to request Register data either the 'nodeRef' or 'itemType' data was missing", payload, this);
        }
      },

      onColumnsFailed: function alvex_services_RegisterService__onColumnsRetrieved( /*jshint unused:false*/ response, originalRequestConfig) {
        this.alfServicePublish(topics.DISPLAY_PROMPT, {
          title: this.message("registers.column.retrieval.failure.title"),
          message: this.message("registers.column.retrieval.failure.message")
        });
      },

      onColumnsRetrieved: function alvex_services_RegisterService__onColumnsRetrieved(siteId, response, originalRequestConfig) {
        var type = originalRequestConfig.data.itemType;
        var url = AlfConstants.PROXY_URI + "api/alvex/registers/model/type/" + type;
        var successFunction = lang.hitch(this, this.onTypeDescriptionRetrieved, siteId, response, originalRequestConfig);
        this.serviceXhr({
          url: url,
          method: "GET",
          successCallback: successFunction,
          callbackScope: this
        });
      },

      processSelectors: function(fields) {
        var temp = {};
        for (var i in fields) {
          if (fields.hasOwnProperty(i)) {
            if (fields[i]["constraint"] !== null) {
              temp[fields[i]["name"]] = fields[i]["constraint"];
              temp[fields[i]["name"]].unshift({
                label: this.message(registers.search.listconstraint.alloptions),
                value: "all"
              });
            }
          }
        }
        return temp;
      },

      onTypeDescriptionRetrieved: function alvex_services_RegisterService__onTypeDescriptionRetrieved(siteId, response, originalRequestConfig, payload) {
        var hash = hashUtils.getHash();
        var processedSelectors = this.processSelectors(payload.fields);
        var columns = lang.getObject("columns", false, response);
        if (columns) {
          var columnsToShow = [];
          var ConfigureFormValues = {};
          if (this.userColumnConfiguration === "") {
            for (var i = 0; i < columns.length; i++)
              if (columns[i].showByDefault === true) {
                columnsToShow.push(columns[i]);
                var label = columns[i].name;
                ConfigureFormValues[label] = true;
              }
          } else {
            var userPreference = this.userColumnConfiguration.split(',');
            for (var key in userPreference) {
              var result = $.grep(columns, function(e) {
                return e.name === userPreference[key];
              });
              if (result.length === 1) {
                columnsToShow.push(result[0]);
              }
              var label = userPreference[key];
              ConfigureFormValues[label] = true;
            }
          }
          var ColumnsConfigurationWidgets = [{
            name: "alfresco/forms/controls/CheckBox",
            config: {
              fieldId: "DELETE_COLUMNS_CONFIG_CHECKBOX",
              label: this.message("registers.columns.config.checkbox.default"),
              name: "default",
              value: false
            }
          }, {
            name: "alfresco/html/Spacer",
            config: {
              height: "20px"
            }
          }];
          for (var i = 0; i < columns.length; i++) {
            ColumnsConfigurationWidgets.push({
              name: "alfresco/forms/controls/CheckBox",
              config: {
                label: columns[i].label,
                name: columns[i].name,
                disablementConfig: {
                  initialValue: false,
                  rules: [{
                    targetId: "DELETE_COLUMNS_CONFIG_CHECKBOX",
                    is: [true]
                  }]
                }
              }
            });
          };
          var values = {};
          var widgetsForFilters = [];
          var filteringTopics = [];
          for (var key in columnsToShow) {
            if (hash[columnsToShow[key].name] !== null) {
              values[columnsToShow[key].name] = hash[columnsToShow[key].name]
            }
            /*else if (columnsToShow[key].dataType === "date") {
                         if (hash["date1_" + columnsToShow[key].name] !== null) {
                           values["date1_" + columnsToShow[key].name] = hash["date1_" + columnsToShow[key].name]
                         }
                         if (hash["date2_" + columnsToShow[key].name] !== null) {
                           values["date2_" + columnsToShow[key].name] = hash["date2_" + columnsToShow[key].name]
                         }
                       } */
            else {
              values[columnsToShow[key].name] = ""
            }
            if (columnsToShow[key].dataType === "text" || columnsToShow[key].dataType === "mltext" || columnsToShow[key].dataType === "cm:content" || columnsToShow[key].type === "association") {
              if (processedSelectors.hasOwnProperty(columnsToShow[key].name)) {
                widgetsForFilters.push({
                  name: "alfresco/forms/controls/Select",
                  config: {
                    fieldId: columnsToShow[key].name.replace(":", "_").toUpperCase(),
                    name: "filter_" + columnsToShow[key].name,
                    placeHolder: columnsToShow[key].label,
                    label: columnsToShow[key].label,
                    value: values[columnsToShow[key].name],
                    optionsConfig: {
                      fixed: processedSelectors[columnsToShow[key].name]
                    }
                  }
                });
              } else {
                widgetsForFilters.push({
                  name: "alfresco/forms/controls/TextBox",
                  config: {
                    fieldId: columnsToShow[key].name.replace(":", "_").toUpperCase(),
                    name: "filter_" + columnsToShow[key].name,
                    placeHolder: columnsToShow[key].label,
                    label: columnsToShow[key].label,
                    value: values[columnsToShow[key].name]
                  }
                });
              }
              filteringTopics.push("_valueChangeOf_" + columnsToShow[key].name.replace(":", "_").toUpperCase());
            } else if (columnsToShow[key].dataType === "date") {
              /*widgetsForFilters.push({
                name: "alvex/forms/controls/InlineDateTextBox",
                config: {
                  fieldId: columnsToShow[key].name.replace(":", "_").toUpperCase(),
                  name: "filter_date1_" + columnsToShow[key].name,
                  placeHolder: columnsToShow[key].label,
                  label: columnsToShow[key].label,
                  value: values["date1_" + columnsToShow[key].name]
                }
              });
              filteringTopics.push("_valueChangeOf_" + columnsToShow[key].name.replace(":", "_").toUpperCase());
              widgetsForFilters.push({
                name: "alvex/forms/controls/InlineDateTextBox",
                config: {
                  fieldId: columnsToShow[key].name.replace(":", "_").toUpperCase() + "2",
                  name: "filter_date2_" + columnsToShow[key].name,
                  label: "- ",
                  additionalCssClasses: "second",
                  value: values["date2_" + columnsToShow[key].name]
                }
              });
              filteringTopics.push("_valueChangeOf_" + columnsToShow[key].name.replace(":", "_").toUpperCase() + "2");*/
            }
          }
          this.continueOnColumnsRetrieved(siteId, ConfigureFormValues, ColumnsConfigurationWidgets, columnsToShow, widgetsForFilters, filteringTopics, originalRequestConfig);
        }
      },
      continueOnColumnsRetrieved: function alvex_services_RegisterService__continueOnColumnsRetrieved(siteId, ConfigureFormValues, ColumnsConfigurationWidgets, columnsToShow, widgetsForFilters, filteringTopics, originalRequestConfig) {
        var hash = hashUtils.getHash();
        var fields = [];
        var rowWidgets = [];
        var widgetsForHeader = [];
        var widgets = [{
          name: "alfresco/menus/AlfMenuBar",
          config: {
            widgets: [{
              name: "alfresco/documentlibrary/AlfSelectDocumentListItems",
              config: {
                itemKeyProperty: "nodeRef",
                pubSubScope: "ALVEX_REGISTER_"
              }
            }]
          }
        }];

        if (originalRequestConfig.data.node.permissions.user.CreateChildren === true) {
          widgets[0].config.widgets.push({
            name: "alfresco/menus/AlfMenuBarItem",
            config: {
              label: "registers.menu.new-item",
              iconClass: "alf-create-icon",
              publishTopic: "CREATE_REGISTER_ITEM_FORM",
              publishGlobal: true,
              publishPayload: {
                alfDestination: originalRequestConfig.data.node.nodeRef,
                itemId: originalRequestConfig.data.itemType,
                itemKind: "type",
                mode: "create"
              }
            }
          });
        }

        widgets[0].config.widgets.push({
          name: "alfresco/menus/AlfMenuBarItem",
          config: {
            label: "registers.menu.export-xls",
            iconClass: "alf-tableview-icon",
            publishTopic: "EXPORT_RECORDS_TO_EXCEL",
            publishPayload: {
              nodeRef: originalRequestConfig.data.node.nodeRef
            },
            publishGlobal: true
          }
        }, {
          name: "alfresco/menus/AlfMenuBarItem",
          config: {
            label: "registers.menu.columns",
            iconClass: "alf-configure-icon",
            publishTopic: "ALF_CREATE_FORM_DIALOG_REQUEST",
            publishPayload: {
              dialogTitle: "registers.menu.columns",
              dialogConfirmationButtonTitle: "registers.menu.columns.save",
              dialogCancellationButtonTitle: "registers.menu.columns.cancel",
              hideTopic: "ALF_CLOSE_DIALOG",
              formSubmissionTopic: "ALVEX_REGISTER_SAVE_COLUMNS_CONFIG",
              formSubmissionGlobal: true,
              formSubmissionPayloadMixin: {
                responseScope: "ALVEX_REGISTER_",
                nodeRef: originalRequestConfig.data.node.nodeRef,
                itemType: originalRequestConfig.data.itemType,
                siteId: siteId
              },
              formValue: ConfigureFormValues,
              widgets: ColumnsConfigurationWidgets
            }
          }
        });
        if (originalRequestConfig.data.node.permissions == null || originalRequestConfig.data.node.permissions.user.Delete == true) {
          widgets[0].config.widgets.push({
            name: "alvex/registers/SelectedItemsMenuBarPopup",
            config: {
              passive: false,
              itemKeyProperty: "nodeRef",
              label: "registers.menu.selected",
              widgets: [{
                name: "alfresco/menus/AlfMenuGroup",
                config: {
                  widgets: [{
                    name: "alfresco/menus/AlfSelectedItemsMenuItem",
                    config: {
                      label: "registers.action.export",
                      iconClass: "alf-tableview-icon",
                      clearSelectedItemsOnClick: false,
                      publishTopic: "EXPORT_RECORDS_TO_EXCEL"
                    }
                  }, {
                    name: "alfresco/menus/AlfSelectedItemsMenuItem",
                    config: {
                      label: "registers.action.delete",
                      iconClass: "alf-delete-icon",
                      clearSelectedItemsOnClick: true,
                      publishTopic: "ALVEX_REGISTER_DELETE_ITEM",
                      publishPayloadType: "PROCESS",
                      publishPayloadModifiers: ["processCurrentItemTokens"],
                      publishPayload: {
                        files: ["{nodeRef}"]
                      },
                      publishGlobal: true
                    }
                  }]
                }
              }]
            }
          });
        } else {
          widgets[0].config.widgets.push({
            name: "alvex/registers/SelectedItemsMenuBarPopup",
            config: {
              passive: true,
              itemKeyProperty: "nodeRef",
              pubSubScope: "ALVEX_REGISTER_",
              label: "registers.menu.selected",
              widgets: [{
                name: "alfresco/menus/AlfMenuGroup",
                config: {
                  widgets: [{
                    name: "alfresco/menus/AlfSelectedItemsMenuItem",
                    config: {
                      label: "registers.action.export",
                      iconClass: "alf-tableview-icon",
                      clearSelectedItemsOnClick: false,
                      publishTopic: "EXPORT_RECORDS_TO_EXCEL"
                    }
                  }]
                }
              }]
            }
          });

        }

        widgets.push({
          name: "alvex/lists/RegisterList",
          config: {
            pubSubScope: "ALVEX_REGISTER_",
            waitForPageWidgets: false,
            filteringTopics: ["APPLY_FILTER"],
            useHash: true,
            loadDataImmediately: true,
            loadDataPublishTopic: "ALVEX_GET_REGISTER_ITEMS",
            loadDataPublishPayload: {
              nodeRef: originalRequestConfig.data.node.nodeRef,
              fields: fields
            },
            dataFailureMessage: "registers.cannot.retrieve.records",
            fetchingDataMessage: "registers.loading",
            noDataMessage: "registers.empty",
            currentPageSize: 25,
            startIndexProperty: "paging.start",
            totalResultsProperty: "paging.total",
            usePagination: true,
            widgetsForFilters: [{
              name: "alfresco/forms/CollapsibleSection",
              config: {
                label: "registers.search.section",
                initiallyOpen: false,
                widgets: [{
                  name: "alfresco/forms/Form",
                  config: {
                    widgets: widgetsForFilters,
                    cancelButtonLabel: "registers.search.button.reset",
                    cancelButtonPublishTopic: "SET_FILTERS_HASH_EMPTY",
                    cancelButtonPublishGlobal: false,
                    cancelButtonPublishPayload: {
                      siteId: siteId
                    },
                    okButtonLabel: "Search",
                    okButtonPublishTopic: "ALVEX_REGISTER_APPLY_FILTER",
                    okButtonPublishGlobal: true
                  }
                }]
              }
            }],
            itemsProperty: "items",
            widgets: [{
              name: "alfresco/lists/views/AlfListView",
              config: {
                minHeight: "60px",
                additionalCssClasses: "bordered",
                widgetsForHeader: widgetsForHeader,
                widgets: [{
                  name: "alfresco/lists/views/layouts/Row",
                  config: {
                    widgets: rowWidgets
                  }
                }]
              }
            }]
          }
        }, {
          name: "alvex/lists/Paginator",
          config: {
            pageSizes: [10, 25, 50],
            pubSubScope: "ALVEX_REGISTER_"
          }
        });
        widgetsForHeader.push({
          name: "alfresco/lists/views/layouts/HeaderCell",
          config: {
            label: "",
            sortable: false
          }
        });
        rowWidgets.push({
          name: "alfresco/lists/views/layouts/Cell",
          config: {
            width: "30px",
            additionalCssClasses: "mediumpad",
            widgets: [{
              name: "alfresco/renderers/Selector",
              config: {
                itemKeyProperty: "nodeRef"
              }
            }]
          }
        });

        array.forEach(columnsToShow, function(column) {

          fields.push(column.name);
          if (column.type !== "association") {
            widgetsForHeader.push({
              name: "alfresco/lists/views/layouts/HeaderCell",
              config: {
                label: column.label,
                sortable: true,
                sortValue: column.name,
                useHash: true
              }
            });
          } else {
            widgetsForHeader.push({
              name: "alfresco/lists/views/layouts/HeaderCell",
              config: {
                label: column.label,
                sortable: false,
                useHash: true
              }
            });
          }

          // These are the attributes available to work with...
          // dataType, formsName, label, name, type

          var data;
          var widget = lang.getObject(column.name, false, this.defaultDataNameMappings);
          if (widget) {
            widget = lang.clone(widget);
            data = {
              config: {
                currentItemPropertyForDataItems: "properties." + column.name
              }
            };
            $.extend(true, widget, data);
          } else {
            widget = lang.getObject(column.dataType, false, this.defaultDataTypeMappings);
            if (widget) {
              widget = lang.clone(widget);
              if (column.dataType === "cm:content") {
                data = {
                  config: {
                    currentItemPropertyForDataItems: "properties." + column.name
                  }
                };
              } else {
                data = {
                  config: {
                    propertyToRender: "properties." + column.name
                  }
                };
              }
              $.extend(true, widget, data);
            } else {
              widget = lang.getObject(column.type, false, this.defaultTypeMappings);
              if (widget) {
                widget = lang.clone(widget);
                data = {
                  config: {
                    currentItemPropertyForDataItems: "properties." + column.name
                  }
                };
                $.extend(true, widget, data);
              } else {
                widget = {
                  name: "alfresco/renderers/Property",
                  config: {
                    propertyToRender: "properties." + column.name
                  }
                };
              }
            }
          }

          rowWidgets.push({
            name: "alfresco/lists/views/layouts/Cell",
            config: {
              additionalCssClasses: "mediumpad",
              widgets: [
                widget
              ]
            }
          });
        }, this);

        widgetsForHeader.push({
          name: "alfresco/lists/views/layouts/HeaderCell",
          config: {
            label: "registers.column.actions.title",
            sortable: false,
            width: "95px"
          }
        });

        rowWidgets.push({
          name: "alfresco/lists/views/layouts/Cell",
          config: {
            additionalCssClasses: "mediumpad",
            widgets: [{
                name: "alfresco/renderers/PublishAction",
                config: {
                  iconClass: "info-16",
                  altText: "registers.action.view",
                  publishTopic: "ALVEX_REGISTERS_NAVIGATE_TO_PAGE_AND_SAVE_HASH",
                  publishPayloadType: "PROCESS",
                  publishPayloadModifiers: ["processCurrentItemTokens"],
                  publishPayload: {
                    url: "/dp/ws/register-item#nodeRef={nodeRef}&form=view",
                    type: "SHARE_PAGE_RELATIVE",
                    target: "CURRENT"
                  },
                  publishGlobal: true
                }
              },
              {
                name: "alfresco/renderers/PublishAction",
                config: {
                  iconClass: "edit-16",
                  altText: "registers.action.edit",
                  publishTopic: "ALVEX_REGISTERS_NAVIGATE_TO_PAGE_AND_SAVE_HASH",
                  publishPayloadType: "PROCESS",
                  publishPayloadModifiers: ["processCurrentItemTokens"],
                  publishPayload: {
                    url: "/dp/ws/register-item#nodeRef={nodeRef}&form=edit",
                    type: "SHARE_PAGE_RELATIVE",
                    target: "CURRENT"
                  },
                  publishGlobal: true,
                  renderFilter: [{
                    property: "permissions.userAccess.edit",
                    values: [true]
                  }]
                }
              },
              /*{
                             name: "alfresco/renderers/PublishAction",
                             config: {
                               altText: "registers.new-item-from-template.label",
                               iconClass: "add-icon-16",
                               publishTopic: "CREATE_REGISTER_ITEM_FORM",
                               publishPayloadType: "PROCESS",
                               publishPayloadModifiers: ["processCurrentItemTokens"],
                               publishPayload: {
                                 alfDestination: originalRequestConfig.data.nodeRef,
                                 itemId: originalRequestConfig.data.itemType,
                                 itemKind: "type",
                                 mode: "create",
                                 template: "{properties}"
                               },
                               publishGlobal: true,
                               renderFilter: [{
                                 property: "permissions.userAccess.create",
                                 values: [true]
                               }]
                             }
                           }, {
                             name: "alfresco/renderers/PublishAction",
                             config: {
                               altText: "registers.action.export",
                               iconClass: "export-light",
                               publishTopic: "EXPORT_RECORDS_TO_EXCEL",
                               publishPayloadType: "PROCESS",
                               publishPayloadModifiers: ["processCurrentItemTokens"],
                               publishPayload: {
                                 nodeRef: "{nodeRef}"
                               },
                               publishGlobal: true
                             }
                           }, */
              {
                name: "alfresco/renderers/PublishAction",
                config: {
                  iconClass: "delete-16",
                  altText: "registers.action.delete",
                  publishTopic: "ALVEX_REGISTER_DELETE_ITEM",
                  publishPayloadType: "PROCESS",
                  publishPayloadModifiers: ["processCurrentItemTokens"],
                  publishPayload: {
                    files: ["{nodeRef}"]
                  },
                  publishGlobal: true,
                  renderFilter: [{
                    property: "permissions.userAccess.delete",
                    values: [true]
                  }]
                }
              }
            ]
          }
        });

        if (originalRequestConfig.data.node.properties["cm:title"]) {
          widgets = [{
            name: "alfresco/layout/TitleDescriptionAndContent",
            config: {
              title: originalRequestConfig.data.node.properties["cm:title"],
              description: originalRequestConfig.data.node.properties["cm:description"],
              itemKeyProperty: "nodeRef",
              subscriptionTopic: "ALVEX_REGISTER_UPDATED",
              subscribeGlobal: true,
              currentItem: {
                nodeRef: originalRequestConfig.data.node.nodeRef
              },
              widgets: widgets,
              invisibilityConfig: {
                initialValue: false,
                rules: [{
                  topic: "ALVEX_DELETE_REGISTER_SUCCESS",
                  attribute: "nodeRef",
                  is: [originalRequestConfig.data.node.nodeRef],
                  subscribeGlobal: true
                }]
              }
            }
          }];
        }

        this.alfPublish(originalRequestConfig.data.alfResponseTopic || originalRequestConfig.data.alfTopic + "_SUCCESS", {
          widgets: widgets
        });
      },


      updateRegister: function alvex_services_RegisterService__updateRegister(payload) {
        if (payload.nodeRef && payload.title) {
          var nodeRef = NodeUtils.processNodeRef(payload.nodeRef);
          var url = AlfConstants.PROXY_URI + "api/node/" + nodeRef.uri + "/formprocessor";
          var config = {
            url: url,
            method: "POST",
            nodeRef: payload.nodeRef,
            data: {
              prop_cm_title: payload.title,
              prop_cm_description: payload.description
            },
            successCallback: this.updateRegisterSuccess,
            failureCallback: this.updateRegisterFailure,
            callbackScope: this
          };
          this.serviceXhr(config);
        } else {
          this.alfLog("warn", "A request was made to update a Data List but either a 'nodeRef' or 'title' attribute was missing from the supplied payload", payload, this);
        }
      },

      updateRegisterSuccess: function alvex_services_RegisterService__updateRegisterSuccess(response, originalRequestConfig) {
        this.alfPublish(topics.RELOAD_DATA_TOPIC);
        this.alfPublish("ALVEX_REGISTER_UPDATED", {
          nodeRef: originalRequestConfig.nodeRef,
          title: originalRequestConfig.data.prop_cm_title,
          description: originalRequestConfig.data.prop_cm_description
        });
      },

      /**
       * This handles failed requests to update a Data List
       *
       * @instance
       * @param {object} response The response from the request
       * @param {object} originalRequestConfig The configuration passed on the original request
       */
      updateRegisterFailure: function alvex_services_RegisterService__updateRegisterFailure(response, originalRequestConfig) {
        this.alfLog("error", "Could not update Register", response, originalRequestConfig);
        this.alfServicePublish(topics.DISPLAY_PROMPT, {
          title: "registers.update.failure.title",
          message: "registers.update.failure.details"
        });
      },

      clonePayload: function alvex_services_RegisterService__clonePayload(payload) {
        return this.alfCleanFrameworkAttributes(payload, false, ["url", "createdItemKey"]);
      },

      onSaveColumnsConfig: function alvex_services_RegisterService__onSaveColumnsConfig(payload) {
        if (payload.nodeRef) {
          var nodeRef = NodeUtils.processNodeRef(payload.nodeRef);
          if (payload["default"] == true) {
            var preference = "com.alvexcore.registers." + nodeRef.id;
            this.alfPublish(topics.SET_PREFERENCE, {
              preference: preference,
              value: ""
            });
            var url = AlfConstants.PROXY_URI + "api/people/" + AlfConstants.USERNAME + "/preferences?pf=" + preference;
            var config = {
              url: url,
              method: "DELETE",
            };
            this.serviceXhr(config);

          } else {
            var propertyValue = "";
            var properties = this.clonePayload(payload);
            delete properties.alfCallerName;
            delete properties.alfPublishScope;
            delete properties.alfResponseScope;
            delete properties.alfTopic;
            delete properties.responseScope;
            delete properties.nodeRef;
            delete properties.siteId;
            delete properties.itemType;
            for (var key in properties) {
              if (properties[key] === true) {
                propertyValue = propertyValue + "," + key;
              }
            }
            if (propertyValue.charAt(0) === ',')
              propertyValue = propertyValue.slice(1);

            var preference = "com.alvexcore.registers." + nodeRef.id;
            this.alfPublish(topics.SET_PREFERENCE, {
              preference: preference,
              value: propertyValue
            });

          };

          var config = {
            siteId: payload.siteId,
            alfSuccessTopic: "ALVEX_GET_REGISTERS_SUCCESS",
            alfFailureTopic: "ALVEX_GET_REGISTERS_FAILURE",
            alfResponseTopic: "ALVEX_GET_REGISTERS"
          };
          this.alfPublish("ALVEX_GET_REGISTERS", config, true);
        }
      },

      onSetFiltersHashEmpty: function alvex_services_RegisterService__onSetFiltersHashEmpty(payload) {
        var hash = hashUtils.getHash();
        var newHash = "#";
        for (var key in hash) {
          if (key == "currentPage" || key == "currentPageSize" || key == "list" || key == "sortField" || key == "sortAscending") {
            newHash = newHash + key + "=" + hash[key] + "&"
          }
        };

        hashUtils.setHash(newHash, true);
        var config = {
          siteId: payload.siteId,
          alfSuccessTopic: "ALVEX_GET_REGISTERS_SUCCESS",
          alfFailureTopic: "ALVEX_GET_REGISTERS_FAILURE",
          alfResponseTopic: "ALVEX_GET_REGISTERS"
        };
        this.alfPublish("ALVEX_GET_REGISTERS", config, true);
      },

      onNavigateToPageAndSaveHash: function alvex_services_RegisterService__onNavigateToPageAndSaveHash(payload) {
        var hash = hashUtils.getHash();
        var urlExt = "";
        for (var i in hash) {
          if (i != "list") {
            urlExt = urlExt + "&" + i + "=" + hash[i];
          }
        }
        payload.url = payload.url + urlExt;
        this.alfPublish("ALF_NAVIGATE_TO_PAGE", payload);

      },

      onDeleteRegisterItemsRequest: function alvex_services_RegisterService__onDeleteRegisterItemsRequest(payload) {
        if (payload.files) {
          this.alfServicePublish(topics.REQUEST_CONFIRMATION_PROMPT, {
            confirmationTitle: "registers.delete.window.title",
            confirmationPrompt: "registers.delete.window.message",
            confirmationButtonLabel: "registers.delete.window.yes",
            cancellationButtonLabel: "registers.delete.window.no",
            confirmationPublication: {
              publishTopic: "ALVEX_REGISTER_DELETE_ITEM_CONFIRMATION",
              publishPayload: {
                files: payload.files,
                alfResponseScope: payload.alfResponseScope,
                parentLink: payload.parentLink
              },
              publishGlobal: true
            }
          });
        } else {
          this.alfLog("warn", "A request was made to delete items from a Data List but no 'nodeRefs' attribute was provided in the payload", payload, this);
        }
      },

      onDeleteRegisterItemsConfirmation: function alvex_services_RegisterService__onDeleteRegisterItemsConfirmation(payload) {
        var successFunction = lang.hitch(this, this.onDeleteRegisterItemsSuccess, payload.parentLink);
        var failureFunction = lang.hitch(this, this.onDeleteRegisterItemsFailure, payload.parentLink);
        this.serviceXhr({
          url: AlfConstants.PROXY_URI + "slingshot/doclib/action/files?alf_method=delete",
          method: "POST",
          successCallback: successFunction,
          failureCallback: failureFunction,
          data: {
            files: payload.files
          }
        });
      },

      onDeleteRegisterItemsSuccess: function alvex_services_RegisterService__onDeleteRegisterItemsSuccess(parentLink, response, originalRequestConfig) {
        // TODO: May need a more specific scoped publication
        if (parentLink == null) {
          this.alfPublish("ALF_DATA_LIST_ALF_DOCLIST_RELOAD_DATA");
        } else {
          this.alfPublish("ALF_NAVIGATE_TO_PAGE", {
            url: parentLink,
            type: "SHARE_PAGE_RELATIVE",
            target: "CURRENT"
          });
        }
      },

      onDeleteRegisterItemsFailure: function alvex_services_RegisterService__onDeleteRegisterItemsFailure(parentLink, response, originalRequestConfig) {
        this.alfServicePublish(topics.DISPLAY_NOTIFICATION, {
          message: "registers.delete.failure"
        });
        this.alfPublish("ALF_CLOSE_DIALOG");
      },
    });
  });
