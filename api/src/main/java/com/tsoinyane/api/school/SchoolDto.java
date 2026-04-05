package com.tsoinyane.api.school;

import com.tsoinyane.api.common.BaseDto;
import lombok.*;
import lombok.experimental.SuperBuilder;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@SuperBuilder
@EqualsAndHashCode(callSuper = true)
public class SchoolDto extends BaseDto {

    private String code;
    private String name;
    private String email;
    private String phone;
    private String location;
    private String aboutHeadline;
    private String aboutDescription;
    private String aboutSupportingText;
    private String missionText;
    private String visionText;
    private String valuesText;
    private String heroImageUrl;
    private String aboutImageUrl;
    private Long heroImageFileId;
    private Long aboutImageFileId;
    private Double mapLatitude;
    private Double mapLongitude;
    private String academicYear;
    private Term currentTerm;
    private Integer passingMark;
    private Integer attendanceThreshold;
    private String language;
    private SchoolType type;

    private List<Long> userIds;
    private List<String> userNames;
}
