[![Build Status](https://travis-ci.org/ITDSystems/alvex-registers.svg?branch=master)](https://travis-ci.org/ITDSystems/alvex-registers)

Alvex Registers component
================================
Brings new component to Alfresco sites to store metadata-only nodes (case management, transaction content management, extended Alfresco Data Lists).

![image](http://www.itdhq.com/img/registers1.png)

Supports filtering, configuring columns to show in the datagrid, export to XLS.

Compatible with Alfresco 5.1 and 5.2.

This component requires:
* [Alvex Utils](https://github.com/ITDSystems/alvex-utils)
* Aikau 1.0.101 or later
* Aikau Forms Runtime Support

# Using this project

Recommended way to use Alvex components is to include them as dependencies to your Maven project. Follow [this guide](https://github.com/ITDSystems/alvex#recommended-way-include-alvex-to-your-project-via-maven-configuration) to include this component to your project.

# Build from source

To build Alvex follow [this guide](https://github.com/ITDSystems/alvex#build-component-from-source).

# Quick Start

## Creating a register

* Create a site in Alfresco Share
* Open Customize Site page
* Add Registers component, click Save
* Open Registers page from the site toolbar
* Create a register

## Custom register types

Currently component contains two types of registers out-of-the-box: contracts and invoices. You can add your type with custom fields by creating a custom content type, inherited from alvexreg:registerItem.

** Note**: Registers UI is built on Aikau. We use Aikau Forms Runtime Service to build create, edit and view forms. If field form control you need is not mapped to any Aikau widget, it will not be rendered. See FormsRuntimeService in [Alvex Aikau Components](https://github.com/ITDSystems/alvex-aikau-components) and [extension of this service for alvex-registers](https://github.com/ITDSystems/alvex-registers/blob/master/share/src/main/amp/web/js/alvex/services/RegisterFormsRuntimeService.js) and extend them with new widgets and mappings you need.
