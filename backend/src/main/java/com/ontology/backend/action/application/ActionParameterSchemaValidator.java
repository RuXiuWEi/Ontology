package com.ontology.backend.action.application;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.ontology.backend.web.BusinessException;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.util.Iterator;
import java.util.Map;
import java.util.Set;

@Component
public class ActionParameterSchemaValidator {

    private static final Set<String> SUPPORTED_TYPES = Set.of(
            "object",
            "string",
            "number",
            "integer",
            "boolean",
            "array"
    );

    private final ObjectMapper objectMapper;

    public ActionParameterSchemaValidator(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public String normalizeAndValidateSchema(String schemaText) {
        if (!StringUtils.hasText(schemaText)) {
            return null;
        }
        JsonNode schema = parseSchema(schemaText);
        validateSchemaNode(schema, "$");
        return schema.toString();
    }

    public void validatePayload(String schemaText, Map<String, Object> payload) {
        if (!StringUtils.hasText(schemaText)) {
            return;
        }
        JsonNode schema = parseSchema(schemaText);
        JsonNode payloadNode = payload == null
                ? objectMapper.nullNode()
                : objectMapper.valueToTree(payload);
        validatePayloadBySchema(payloadNode, schema, "$");
    }

    private JsonNode parseSchema(String schemaText) {
        try {
            JsonNode schema = objectMapper.readTree(schemaText);
            if (!schema.isObject()) {
                throw new BusinessException(40044, "动作参数Schema必须是JSON对象");
            }
            return schema;
        } catch (IOException ex) {
            throw new BusinessException(40044, "动作参数Schema格式非法");
        }
    }

    private void validateSchemaNode(JsonNode schemaNode, String path) {
        JsonNode typeNode = schemaNode.get("type");
        if (typeNode != null && !typeNode.isTextual()) {
            throw new BusinessException(40044, "Schema字段type必须是字符串，位置：" + path);
        }
        String type = typeNode == null ? null : typeNode.asText().trim().toLowerCase();
        if (type != null && !SUPPORTED_TYPES.contains(type)) {
            throw new BusinessException(40044, "Schema字段type不支持：" + type + "，位置：" + path);
        }

        JsonNode requiredNode = schemaNode.get("required");
        if (requiredNode != null) {
            if (!requiredNode.isArray()) {
                throw new BusinessException(40044, "Schema字段required必须是字符串数组，位置：" + path);
            }
            for (JsonNode item : requiredNode) {
                if (!item.isTextual() || !StringUtils.hasText(item.asText())) {
                    throw new BusinessException(40044, "Schema字段required元素必须是非空字符串，位置：" + path);
                }
            }
        }

        JsonNode propertiesNode = schemaNode.get("properties");
        if (propertiesNode != null && !propertiesNode.isObject()) {
            throw new BusinessException(40044, "Schema字段properties必须是对象，位置：" + path);
        }

        if ((requiredNode != null || propertiesNode != null) && type != null && !"object".equals(type)) {
            throw new BusinessException(40044, "required/properties仅允许在object类型中使用，位置：" + path);
        }

        if (propertiesNode != null) {
            Iterator<Map.Entry<String, JsonNode>> iterator = propertiesNode.fields();
            while (iterator.hasNext()) {
                Map.Entry<String, JsonNode> entry = iterator.next();
                if (!entry.getValue().isObject()) {
                    throw new BusinessException(40044, "Schema属性定义必须是对象，位置：" + path + ".properties." + entry.getKey());
                }
                validateSchemaNode(entry.getValue(), path + ".properties." + entry.getKey());
            }
        }

        JsonNode itemsNode = schemaNode.get("items");
        if (itemsNode != null) {
            if (!itemsNode.isObject()) {
                throw new BusinessException(40044, "Schema字段items必须是对象，位置：" + path);
            }
            if (type != null && !"array".equals(type)) {
                throw new BusinessException(40044, "items仅允许在array类型中使用，位置：" + path);
            }
            validateSchemaNode(itemsNode, path + ".items");
        }
    }

    private void validatePayloadBySchema(JsonNode payloadNode, JsonNode schemaNode, String path) {
        String expectedType = null;
        JsonNode typeNode = schemaNode.get("type");
        if (typeNode != null && typeNode.isTextual()) {
            expectedType = typeNode.asText().trim().toLowerCase();
        }
        if (expectedType == null
                && (schemaNode.has("required") || schemaNode.has("properties"))) {
            expectedType = "object";
        }

        if (expectedType == null) {
            return;
        }

        switch (expectedType) {
            case "object" -> validateObjectPayload(payloadNode, schemaNode, path);
            case "string" -> ensure(payloadNode.isTextual(), path + "必须是字符串");
            case "number" -> ensure(payloadNode.isNumber(), path + "必须是数字");
            case "integer" -> ensure(payloadNode.isIntegralNumber(), path + "必须是整数");
            case "boolean" -> ensure(payloadNode.isBoolean(), path + "必须是布尔值");
            case "array" -> validateArrayPayload(payloadNode, schemaNode, path);
            default -> throw new BusinessException(40044, "Schema字段type不支持：" + expectedType + "，位置：" + path);
        }
    }

    private void validateObjectPayload(JsonNode payloadNode, JsonNode schemaNode, String path) {
        ensure(payloadNode.isObject(), path + "必须是对象");

        JsonNode requiredNode = schemaNode.get("required");
        if (requiredNode != null && requiredNode.isArray()) {
            for (JsonNode requiredField : requiredNode) {
                String fieldName = requiredField.asText();
                if (!payloadNode.has(fieldName) || payloadNode.get(fieldName).isNull()) {
                    throw new BusinessException(40045, "动作参数缺少必填字段：" + fieldName);
                }
            }
        }

        JsonNode propertiesNode = schemaNode.get("properties");
        if (propertiesNode == null || !propertiesNode.isObject()) {
            return;
        }
        Iterator<Map.Entry<String, JsonNode>> iterator = propertiesNode.fields();
        while (iterator.hasNext()) {
            Map.Entry<String, JsonNode> entry = iterator.next();
            if (!payloadNode.has(entry.getKey()) || payloadNode.get(entry.getKey()).isNull()) {
                continue;
            }
            validatePayloadBySchema(
                    payloadNode.get(entry.getKey()),
                    entry.getValue(),
                    path + "." + entry.getKey()
            );
        }
    }

    private void validateArrayPayload(JsonNode payloadNode, JsonNode schemaNode, String path) {
        ensure(payloadNode.isArray(), path + "必须是数组");
        JsonNode itemsNode = schemaNode.get("items");
        if (itemsNode == null || !itemsNode.isObject()) {
            return;
        }
        int index = 0;
        for (JsonNode item : payloadNode) {
            validatePayloadBySchema(item, itemsNode, path + "[" + index + "]");
            index++;
        }
    }

    private void ensure(boolean condition, String message) {
        if (!condition) {
            throw new BusinessException(40045, message);
        }
    }
}
