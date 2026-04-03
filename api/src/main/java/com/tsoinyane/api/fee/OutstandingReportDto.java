package com.tsoinyane.api.fee;

public class OutstandingReportDto {
    private Long gradeId;
    private String gradeName;
    private Integer totalStudents;
    private Integer studentsWithOutstanding;
    private Double totalOutstanding;
    private Double averageOutstanding;

    public OutstandingReportDto() {}

    public OutstandingReportDto(Long gradeId, String gradeName, Integer totalStudents,
                               Integer studentsWithOutstanding, Double totalOutstanding, Double averageOutstanding) {
        this.gradeId = gradeId;
        this.gradeName = gradeName;
        this.totalStudents = totalStudents;
        this.studentsWithOutstanding = studentsWithOutstanding;
        this.totalOutstanding = totalOutstanding;
        this.averageOutstanding = averageOutstanding;
    }

    public Long getGradeId() { return gradeId; }
    public void setGradeId(Long gradeId) { this.gradeId = gradeId; }

    public String getGradeName() { return gradeName; }
    public void setGradeName(String gradeName) { this.gradeName = gradeName; }

    public Integer getTotalStudents() { return totalStudents; }
    public void setTotalStudents(Integer totalStudents) { this.totalStudents = totalStudents; }

    public Integer getStudentsWithOutstanding() { return studentsWithOutstanding; }
    public void setStudentsWithOutstanding(Integer studentsWithOutstanding) { this.studentsWithOutstanding = studentsWithOutstanding; }

    public Double getTotalOutstanding() { return totalOutstanding; }
    public void setTotalOutstanding(Double totalOutstanding) { this.totalOutstanding = totalOutstanding; }

    public Double getAverageOutstanding() { return averageOutstanding; }
    public void setAverageOutstanding(Double averageOutstanding) { this.averageOutstanding = averageOutstanding; }
}