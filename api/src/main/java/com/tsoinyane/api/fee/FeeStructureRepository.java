package com.tsoinyane.api.fee;

import com.tsoinyane.api.school.Term;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FeeStructureRepository extends JpaRepository<FeeStructure, Long> {

    @Query("""
            select fs from FeeStructure fs
            join fetch fs.school school
            join fetch fs.grade grade
            left join fetch fs.createdBy
            left join fetch fs.updatedBy
            where (:schoolId is null or school.id = :schoolId)
            order by fs.academicYear desc, fs.term asc, grade.name asc, fs.id asc
            """)
    List<FeeStructure> findAllWithAssociations(@Param("schoolId") Long schoolId);

    @Query("""
            select fs from FeeStructure fs
            join fetch fs.school school
            join fetch fs.grade grade
            left join fetch fs.createdBy
            left join fetch fs.updatedBy
            where fs.id = :id
            """)
    Optional<FeeStructure> findWithAssociationsById(@Param("id") Long id);

    Optional<FeeStructure> findBySchoolIdAndGradeIdAndTermAndAcademicYear(Long schoolId, Long gradeId, Term term, String academicYear);

    @Query("""
            select count(fs) from FeeStructure fs
            where (:schoolId is null or fs.school.id = :schoolId)
            """)
    long countBySchoolId(@Param("schoolId") Long schoolId);
}
