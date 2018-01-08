define(["dojo/_base/declare",
        "service/constants/Default",
        "dijit/_WidgetBase",
        "alfresco/core/Core",
        "alfresco/core/CoreWidgetProcessing",
        "alfresco/core/topics",
        "alfresco/core/WidgetsCreator",
        "alfresco/layout/DynamicWidgets",
        "alfresco/core/DynamicWidgetProcessingTopics",
        "alfresco/util/hashUtils",
        "dojo/_base/lang",
        "dojo/_base/array",
        "dojo/dom-construct",
        "dojo/dom-class",
        "dojo/io-query",
        "dojo/sniff",
        "alfresco/core/CoreXhr",
        "alfresco/core/ObjectTypeUtils"
    ],
    function(declare, AlfConstants, _WidgetBase, AlfCore, CoreWidgetProcessing, topics, WidgetsCreator, DynamicWidgets, DynamicWidgetProcessingTopics,
        hashUtils, lang, array, domConstruct, domClass, ioQuery, sniff, AlfCoreXhr, ObjectTypeUtils) {

        return declare([_WidgetBase, AlfCore, CoreWidgetProcessing, DynamicWidgets, AlfCoreXhr], {

            i18nRequirements: [{
              i18nFile: "./i18n/FormContainer.properties"
            }],

            nodeType: "",

            constructor: function alvex_registers_FormContainer__constructor(args) {
                lang.mixin(this, args);
                this.alfSubscribe("RETRIEVE_FORM", lang.hitch(this, this.onShowViewForm));
                this.alfSubscribe("CHANGE_FORM", lang.hitch(this, this.onChangeForm));
                this.alfSubscribe("RETRIEVE_RECORD_DETAILS_SUCCESS", lang.hitch(this, this.onRetrieveRecordDetails));
                this.alfSubscribe("ALF_FORM_ALF_DOCLIST_RELOAD_DATA", lang.hitch(this, this.onShowForm));
            },

            postCreate: function alvex_registers_FormContainer__postCreate() {
                var hash = hashUtils.getHash();
                if (hash.nodeRef != null) {
                  this.alfPublish(topics.GET_DOCUMENT, {
                      nodeRef: hash.nodeRef,
                      alfResponseTopic: "RETRIEVE_RECORD_DETAILS"
                  });
                }
            },

            onChangeForm: function alvex_registers_FormContainer__onChangeForm(payload) {
                if (payload.form) {
                    hashUtils.updateHash({
                        form: payload.form
                    })
                } else if (payload.nodeRef) {
                    hashUtils.updateHash({
                        nodeRef: payload.nodeRef
                    })
                }
                var hash = hashUtils.getHash();
                this.alfPublish(topics.GET_DOCUMENT, {
                    nodeRef: hash.nodeRef,
                    alfResponseTopic: "RETRIEVE_RECORD_DETAILS"
                });
            },

            onUpdateForm: function alvex_registers_FormContainer__onUpdateForm() {
                var hash = hashUtils.getHash();
                if (hash.nodeRef && hash.form) {
                    var config = {
                        nodeRef: hash.nodeRef,
                        form: hash.form
                    };
                    var alfTopic = topics.REQUEST_FORM;
                    var alfSuccessTopic = "RETRIEVE_FORM";
                    if (hash.form === "edit") {
                        alfTopic = "EDIT_REGISTER_ITEM_FORM";
                    }
                    this.alfPublish(alfTopic, {
                        formConfig: {
                            useDialog: false,
                            formId: config.form.toUpperCase() + "_ITEM_FORM",
                            formSubmissionPayloadMixin: {
                                responseScope: "ALF_FORM_"
                            }
                        },
                        itemType: this.nodeType,
                        itemId: config.nodeRef,
                        itemKind: "node",
                        mode: config.form,
                        publishGlobal: true,
                        alfSuccessTopic: alfSuccessTopic
                    });
                    this.alfPublish("BUTTON_VISIBILITY_CONFIG", {
                        form: hash.form
                    });
                }
            },

            onShowViewForm: function alvex_registers_FormContainer__onShowViewForm(response) {
                this.render(response);
            },

            onShowForm: function alvex_registers_FormContainer__onShowForm() {
                this.onChangeForm({
                    form: "view"
                })
            },

            onRetrieveRecordDetails: function alvex_registers_FormContainer__onRetrieveRecordDetails(response) {
                var hash = hashUtils.getHash();
                var view = false,
                    edit = false;
                if (hash.form === "view") {
                    view = true;
                } else {
                    edit = true;
                }
                var parent = response.response.item.parent.nodeRef;
                this.nodeType = response.response.item.node.type;
                this.onUpdateForm();
                var urlExt = "";
                for (var i in hash) {
                  if (i !== "nodeRef" && i !== "form") {
                    urlExt = urlExt + "&" + i + "=" + hash[i];
                  }
                }

                var breadcrumbArray = [{
                  label: "register-item.breadcrumb.home",
                  publishTopic: "ALF_NAVIGATE_TO_PAGE",
                  publishPayloadType: "PROCESS",
                  publishPayload: {
                    url: "/",
                    type: "SHARE_PAGE_RELATIVE",
                    target: "CURRENT"
                  }
                }];

                if (response.response.item.location.site) {

                  var siteLabel = response.response.item.location.site.title;
                  var siteUrl = response.response.item.location.site.name;

                  breadcrumbArray.push({
                    label: siteLabel,
                    publishTopic: "ALF_NAVIGATE_TO_PAGE",
                    publishPayloadType: "PROCESS",
                    publishPayload: {
                      url: "/site/" + siteUrl + "/dp/ws/registers",
                      type: "SHARE_PAGE_RELATIVE",
                      target: "CURRENT"
                    }
                  }, {
                    label: response.response.item.parent.properties["cm:title"],
                    publishTopic: "ALF_NAVIGATE_TO_PAGE",
                    publishPayloadType: "PROCESS",
                    publishPayload: {
                      url: "/site/" + siteUrl + "/dp/ws/registers#list=" + parent,
                      type: "SHARE_PAGE_RELATIVE",
                      target: "CURRENT"
                    }
                  });
                }

                breadcrumbArray.push({
                  label: "register-item.breadcrumb.item"
                });

                this.alfPublish("ALVEX_REGISTER_SHOW_BREADCRUMBTRAIL", {
                    widgets: [{
                        name: "alfresco/documentlibrary/AlfBreadcrumbTrail",
                        config: {
                            lastBreadcrumbIsCurrentNode: true,
                            breadcrumbs: breadcrumbArray
                        }
                    }]
                });

                var MenuBar = [{
                        name: "alfresco/html/Spacer",
                        config: {
                            height: "20px"
                        }
                    },
                    {
                        name: "alfresco/menus/AlfVerticalMenuBar",
                        config: {
                            widgets: [{
                                name: "alfresco/menus/AlfMenuBarItem",
                                config: {
                                    id: "VIEW",
                                    label: "register-item.menu.view",
                                    iconClass: "alf-detailedlist-icon",
                                    publishTopic: "CHANGE_FORM",
                                    publishPayload: {
                                        form: "view"
                                    },
                                    visibilityConfig: {
                                        initialValue: edit,
                                        rules: [{
                                            topic: "BUTTON_VISIBILITY_CONFIG",
                                            attribute: "form",
                                            is: ["edit"],
                                            strict: true
                                        }]
                                    }
                                }
                            }]
                        }
                    }
                ];

                if (response.response.item.node.permissions.user.Write === true) {
                    MenuBar[1].config.widgets.push({
                        name: "alfresco/menus/AlfMenuBarItem",
                        config: {
                            id: "EDIT",
                            label: "register-item.menu.edit",
                            iconClass: "alf-edit-icon",
                            publishTopic: "CHANGE_FORM",
                            publishPayload: {
                                form: "edit"
                            },
                            visibilityConfig: {
                                initialValue: view,
                                rules: [{
                                    topic: "BUTTON_VISIBILITY_CONFIG",
                                    attribute: "form",
                                    is: ["view"],
                                    strict: true
                                }]
                            }
                        }
                    });
                }
                /*MenuBar[1].config.widgets.push({
                  name: "alfresco/menus/AlfMenuBarItem",
                  config: {
                      label: "register-item.menu.versions",
                      iconClass: "alf-simplelist-icon",
                      publishTopic: "VIEW_RECORD_VERSIONS",
                      publishPayload: {
                          node: response.response.item.node
                      },
                      visibilityConfig: {
                          initialValue: view,
                          rules: [{
                              topic: "BUTTON_VISIBILITY_CONFIG",
                              attribute: "form",
                              is: ["view"],
                              strict: true
                          }]
                      }
                  }
                });*/
                if (response.response.item.node.permissions.user.Delete === true) {
                    MenuBar[1].config.widgets.push({
                        name: "alfresco/menus/AlfMenuBarItem",
                        config: {
                            id: "DELETE",
                            label: "register-item.menu.delete",
                            iconClass: "alf-delete-icon",
                            publishTopic: "DELETE_RECORD",
                            publishPayloadType: "PROCESS",
                            publishPayloadModifiers: ["processCurrentItemTokens"],
                            publishPayload: {
                                url: "slingshot/datalists/action/items?alf_method=delete",
                                nodeRefs: [response.response.item.nodeRef],
                                parentLink: "/site/" + siteUrl + "/dp/ws/registers#list=" + parent
                            },
                            publishGlobal: true,
                            visibilityConfig: {
                                initialValue: view,
                                rules: [{
                                    topic: "BUTTON_VISIBILITY_CONFIG",
                                    attribute: "form",
                                    is: ["view"],
                                    strict: true
                                }]
                            }
                        }
                    });
                }
                MenuBar[1].config.widgets.push({
                    name: "alfresco/menus/AlfMenuBarItem",
                    config: {
                        id: "BACK",
                        iconClass: "alf-back-icon",
                        label: "register-item.menu.back",
                        publishTopic: "ALF_NAVIGATE_TO_PAGE",
                        publishPayloadType: "PROCESS",
                        publishPayload: {
                            url: "/site/" + siteUrl + "/dp/ws/registers#list=" + parent + urlExt,
                            type: "SHARE_PAGE_RELATIVE",
                            target: "CURRENT"
                        }
                    }
                });
                this.alfPublish("RIGHT_MENU_LINKS", {
                    widgets: MenuBar
                });

            }

        });
    });
