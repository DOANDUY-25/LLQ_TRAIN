package com.pmh.specification;

import com.pmh.model.entity.Components;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

public class ComponentSpecs {

    public static Specification<Components> hasComponentCode(List<String> codes) {
        return (root, query, cb) ->
                root.get("componentCode").in(codes);
    }

    public static Specification<Components> hasComponentName(List<String> names) {
        return (root, query, cb) ->
                root.get("componentName").in(names);
    }

    public static Specification<Components> hasStatus(List<Integer> statuses) {
        return (root, query, cb) ->
                root.get("status").in(statuses);
    }

    public static Specification<Components> hasIsActive(List<Integer> isActives) {
        return (root, query, cb) ->
                root.get("isActive").in(isActives);
    }


}
