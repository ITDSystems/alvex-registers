define(["dojo/_base/declare",
        "alfresco/core/topics",
        "jquery",
        "alvex/services/FormsRuntimeService",

        // No call backs from here...
        "alvex/renderers/RegisterItemLink"],
function(declare, topics, $, FormsRuntimeService) {
    return declare([FormsRuntimeService], {
        registerControlMappings:{
            node: {
                edit: {
                    // This will work only if alvex-registers installed
                    "/com/alvexcore/components/form/controls/authority.ftl": {
                        name: "alfresco/forms/controls/MultiSelectInput",
                        config: {
                            width: "400px",
                            valueDelimiter: ",",
                            addedAndRemovedValues: true,
                            optionsConfig: {
                                labelAttribute: "name",
                                queryAttribute: "name",
                                valueAttribute: "nodeRef",
                                publishTopic: topics.GET_AUTHORITIES,
                                publishPayload: {
                                    resultsProperty: "response.data.items"
                                }
                            }
                        }
                    }
                },
                view: {
                    "/com/alvexcore/components/form/controls/authority.ftl": {
                        name: "alvex/renderers/RegisterItemLink",
                        config: {
                        }
                    }
                }
            }
        },
        registerSubscriptions: function alvex_services_RegisterFormsRuntimeService__registerSubscriptions() {
            this.inherited(arguments);
            this.controlMappings = $.extend({}, this.controlMappings, this.registerControlMappings);
        }
    });
});
