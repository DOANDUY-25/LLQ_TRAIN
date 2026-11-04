package com.pmh.model.dto.component;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ComponentSearchDTO {
    private List<String> componentCodes;
    private List<String> componentNames;
    private List<Integer> statuses;
    private List<Integer> isActives;
    private Integer page;
    private Integer size;
}
