package com.tsoinyane.api.school;

import com.tsoinyane.api.common.BaseEntity;
import com.tsoinyane.api.common.DataFile;
import com.tsoinyane.api.user.User;
import jakarta.persistence.*;
import lombok.*;
import lombok.Builder;
import lombok.experimental.SuperBuilder;

import java.util.HashSet;
import java.util.Set;

@Data
@SuperBuilder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@ToString(callSuper = true, exclude = "users")
@EqualsAndHashCode(callSuper = true, exclude = "users")
public class School extends BaseEntity {

    private String code;
    private String name;
    private String email;
    private String phone;
    private String location;
    private String aboutHeadline;

    @Column(columnDefinition = "TEXT")
    private String aboutDescription;

    @Column(columnDefinition = "TEXT")
    private String aboutSupportingText;

    @Column(columnDefinition = "TEXT")
    private String missionText;

    @Column(columnDefinition = "TEXT")
    private String visionText;

    @Column(columnDefinition = "TEXT")
    private String valuesText;

    @Column(length = 500)
    private String heroImageUrl;

    @Column(length = 500)
    private String aboutImageUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hero_image_file_id")
    private DataFile heroImageFile;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "about_image_file_id")
    private DataFile aboutImageFile;

    private Double mapLatitude;
    private Double mapLongitude;

    @Column(name = "academic_year", length = 10)
    private String academicYear;

    @Column(name = "current_term", length = 20)
    @Enumerated(EnumType.STRING)
    private Term currentTerm;

    @Column(name = "passing_mark")
    private Integer passingMark;

    @Column(name = "attendance_threshold")
    private Integer attendanceThreshold;

    @Column(length = 20)
    private String language;

    @Enumerated(EnumType.STRING)
    private SchoolType type;

    @ManyToMany(mappedBy = "schools")
    @Builder.Default
    private Set<User> users = new HashSet<>();
}
