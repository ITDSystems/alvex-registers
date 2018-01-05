package com.alvexcore.repo.registers;

import org.alfresco.service.namespace.QName;

public class AlvexRegistersContentModel {

    public final static String REGISTERS_MODEL_URI = "http://alvexcore.com/prefix/alvexreg";
    public final static String REGISTERS_MODEL_PREFIX = "alvexreg";

    public final static QName TYPE_ALVEX_REGISTER = QName.createQName(REGISTERS_MODEL_URI, "register");
    public final static QName PROP_ALVEX_REGISTER_ITEM_TYPE = QName.createQName(REGISTERS_MODEL_URI, "registerItemType");

    public final static QName TYPE_ALVEX_REGISTER_ITEM = QName.createQName(REGISTERS_MODEL_URI, "registerItem");
}