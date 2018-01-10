define(["dojo/_base/declare",
    "dijit/_WidgetBase",
    "alfresco/renderers/_JsNodeMixin",
    "alfresco/core/ValueDisplayMapMixin",
    "alfresco/core/Core",
    "alfresco/core/CoreWidgetProcessing",
    "alfresco/core/ProcessWidgets",
    "alfresco/core/topics",
    "alfresco/core/ObjectTypeUtils",
    "alfresco/core/UrlUtilsMixin",
    "alfresco/core/TemporalUtils",
    "alfresco/core/NodeUtils",
    "dojo/_base/lang",
    "dojo/dom-class",
    "dojo/dom-style",
    "dijit/Tooltip",
    "dojo/on",
    "alfresco/services/DocumentService",
    "alfresco/layout/DynamicWidgets",
    "alfresco/core/DynamicWidgetProcessingTopics"
  ],

  function(declare, _WidgetBase, _JsNodeMixin, ValueDisplayMapMixin, AlfCore, CoreWidgetProcessing, ProcessWidgets, topics,
    ObjectTypeUtils, UrlUtilsMixin, TemporalUtils, NodeUtils, lang, domClass, domStyle, Tooltip, on, DocumentService, DynamicWidgets) {

    return declare([_WidgetBase, AlfCore, _JsNodeMixin, ValueDisplayMapMixin, TemporalUtils, UrlUtilsMixin, DynamicWidgets], {

      itemsToShow: [],

      subscriptionTopic: null,

      registerRenderName: null,

      propertyToRenderMap: {
        "cm:person": "%cm:firstName% %cm:lastName%",
        "alvexreg:invoice": "%alvexreg:id%"
      },

      postCreate: function alvex_renderers_registerItemLink__postCreate() {
        this.subscriptionTopic = "ST_" + this.generateUuid();
        this.itemsToShow = [];
        this.alfSubscribe(this.subscriptionTopic, lang.hitch(this, this.render), true);
        var data = [];
        if (this.isDatagridPage) {
          var propToRender = this.currentItemPropertyForDataItems.slice(0, this.currentItemPropertyForDataItems.lastIndexOf(".")) + ".value";
          data = lang.getObject(propToRender, false, this.currentItem).split(",");
        } else if (this.isArray) {
          data = lang.getObject(this.propertyToRender, false, this.currentItem);

        } else if (ObjectTypeUtils.isString(this.propertyToRender) &&
          ObjectTypeUtils.isObject(this.currentItem) &&
          lang.exists(this.propertyToRender, this.currentItem)) {

          data = lang.getObject(this.propertyToRender, false, this.currentItem);
          if (ObjectTypeUtils.isString(data)) {
            data = data.split(",");
          }
        }

        if ((data) && (data !== [])) {
          data.forEach(function(item) {
            var nodeRef = item;
            if (item.nodeRef) {
              nodeRef = item.nodeRef;
            }
            if (nodeRef !== "") {
              var responseTopic = this.generateUuid();
              var handle = this.alfSubscribe(responseTopic + "_SUCCESS", lang.hitch(this, function(payload) {
                this.alfUnsubscribe(handle);
                var node = lang.getObject("response.item.node", false, payload);
                if (node && this.propertyToRenderMap[node.type]) {
                  //payload.response.item.linkLabel = lang.getObject("properties." + this.propertyToRenderMap[node.type], false, node);
                  var tmprenderedValue = this.propertyToRenderMap[node.type];
                  var start = 0;
                  start = tmprenderedValue.indexOf("%");

                  while (start !== -1) {
                    var end = tmprenderedValue.indexOf("%", start + 1);
                    if (end !== -1) {
                      var prop = tmprenderedValue.substr(start + 1, end - start - 1);
                      if ((node["properties"].hasOwnProperty(prop)) || (prop.indexOf("alvexreg:") !== -1) || (prop.indexOf("cm:") !== -1)) {
                        var value = this.getRenderedProperty(lang.getObject("properties." + prop, false, node));
                        if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/) !== null) {
                          value = value.match(/^\d{4}-\d{2}-\d{2}/)[0];
                          value = value.substr(8, 2) + "." + value.substr(5, 2) + "." + value.substr(0, 4);
                        }
                        tmprenderedValue = tmprenderedValue.replace(tmprenderedValue.substr(start, end - start + 1), value);
                        start = tmprenderedValue.indexOf("%");
                      } else {

                        start = tmprenderedValue.indexOf("%", end + 1);
                      }
                    } else {
                      //there is only one % symbol - probably used in string
                      start = -1;
                    }
                  }
                  payload.response.item.linkLabel = tmprenderedValue;
                } else {
                  payload.response.item.linkLabel = nodeRef;
                }
                this.itemsToShow.push(payload.response.item);
                this.updateSelectedFiles(this.subscriptionTopic);
              }), true);

              // 3rd argument in alfPublish - true - for global publish
              this.alfPublish(topics.GET_DOCUMENT, {
                alfResponseTopic: responseTopic,
                nodeRef: nodeRef
              }, true);
            }
          }.bind(this));
        } else {
          this.alfLog("log", "Property does not exist:", this);
        }
      },

      getRenderedProperty: function alvex_renderers_RegisterItemLink__getRenderedProperty(property, highlight) {
        /*jshint maxcomplexity:false*/
        var value = "";
        if (property === null || typeof property === "undefined") {
          // No action required if a property isn't supplied
        } else if (ObjectTypeUtils.isString(property)) {
          value = this.encodeHTML(property);
        } else if (ObjectTypeUtils.isArray(property)) {
          value = property.length;
        } else if (ObjectTypeUtils.isBoolean(property)) {
          value = property;
        } else if (ObjectTypeUtils.isNumber(property)) {
          value = property;
        } else if (ObjectTypeUtils.isObject(property)) {
          // TODO: This should probably be moved out into a Node specific sub-class
          if (property.hasOwnProperty("iso8601")) {
            value = this.renderDate(property.iso8601);
          } else if (property.hasOwnProperty("userName") && property.hasOwnProperty("displayName")) {
            value = this.userProfileLink(property.userName, property.displayName);
          } else if (property.hasOwnProperty("displayName")) {
            value = this.encodeHTML(property.displayName || "");
          } else if (property.hasOwnProperty("title")) {
            value = this.encodeHTML(property.title || "");
          } else if (property.hasOwnProperty("name")) {
            value = this.encodeHTML(property.name || "");
          }
        }

        if (value && highlight) {
          value = this.addHighlightMarks(value, highlight);
        } else if (value && this.highlightPrefix && this.highlightPostfix) {
          value = value.replace(new RegExp(this.highlightPrefix, "g"), "<mark>").replace(new RegExp(this.highlightPostfix, "g"), "</mark>");
        }

        if (value && this.trimValue && typeof value.trim === "function") {
          value = value.replace(/ /g, " ").trim();
        }

        return value;
      },

      updateSelectedFiles: function alvex_renderers_RegisterItemLink__updateSelectedFiles(topic) {
        var widgetsForView = (this.isDatagridPage) ? lang.clone(this.widgetsForDatagridView) : lang.clone(this.widgetsForView);
        this.processObject(["processInstanceTokens"], widgetsForView);
        this.alfPublish(topic, {
          widgets: widgetsForView
        }, true);
      },

      widgetsForView: [{
        id: "{id}_LINKS_LIST",
        name: "alfresco/lists/views/AlfListView",
        config: {
          noItemsMessage: " ",
          currentData: {
            items: "{itemsToShow}"
          },
          widgets: [{
            name: "alfresco/lists/views/layouts/Row",
            config: {
              widgetModelModifiers: ["processCurrentItemTokens"],
              widgets: [{
                name: "alfresco/lists/views/layouts/Cell",
                config: {
                  widgets: [{
                    id: "{id}_SELECTED_FILES_NAME",
                    name: "alfresco/renderers/Link",
                    config: {
                      linkLabel: "{linkLabel}",
                      publishTopic: "CHANGE_FORM",
                      publishPayloadType: "PROCESS",
                      publishPayloadModifiers: ["processCurrentItemTokens"],
                      useCurrentItemAsPayload: false,
                      publishGlobal: true,
                      publishPayload: {
                        nodeRef: "{nodeRef}"
                      }
                    }
                  }]
                }
              }]
            }
          }]
        }
      }],

      widgetsForDatagridView: [{
                id: "{id}_LINKS_LIST",
                name: "alfresco/lists/views/AlfListView",
                config: {
                    noItemsMessage: " ",
                    currentData: {
                        items: "{itemsToShow}"
                    },
                    widgets:[
                        {
                            name: "alfresco/lists/views/layouts/Row",
                            config: {
                                widgetModelModifiers: ["processCurrentItemTokens"],
                                widgets: [
                                    {
                                        name: "alfresco/lists/views/layouts/Cell",
                                        config: {
                                            widgets: [
                                                {
                                                    id: "{id}_SELECTED_FILES_NAME",
                                                    name: "alfresco/renderers/Link",
                                                    config: {
                                                        linkLabel: "{registerRenderName}",
                                                        publishTopic: "ALF_NAVIGATE_TO_PAGE",
                                                        publishPayloadType: "PROCESS",
                                                        useCurrentItemAsPayload: false,
                                                        publishGlobal: true,
                                                        publishPayloadModifiers: ["processCurrentItemTokens"],
                                                        publishPayload: {
                                                            url: "/dp/ws/register-item#nodeRef={nodeRef}&form=view",
                                                            type: "SHARE_PAGE_RELATIVE",
                                                            target: "CURRENT"
                                                        }
                                                    }
                                                }
                                            ]
                                        }
                                    }
                                ]
                            }
                        }
                    ]
                }
            }]
    });
  });
