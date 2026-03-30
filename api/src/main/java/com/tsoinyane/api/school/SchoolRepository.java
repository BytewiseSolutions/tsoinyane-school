package com.tsoinyane.api.school;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SchoolRepository extends JpaRepository<School, Long> {
    List<School> findAllByUsers_Id(Long userId);

    long countById(Long id);
}
