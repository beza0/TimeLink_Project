package com.timebank.timebank.skill;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SkillRepository extends JpaRepository<Skill, UUID> {

    void deleteAllByOwner_Id(UUID ownerId);

    @EntityGraph(attributePaths = "owner")
    List<Skill> findByOwnerId(UUID ownerId);

    @EntityGraph(attributePaths = "owner")
    @Query("SELECT s FROM Skill s JOIN s.owner o WHERE LOWER(o.email) = LOWER(:email)")
    List<Skill> findByOwnerEmailIgnoreCase(@Param("email") String email);

    @EntityGraph(attributePaths = "owner")
    Optional<Skill> findByIdAndOwnerEmail(UUID id, String ownerEmail);

    @Override
    @EntityGraph(attributePaths = "owner")
    List<Skill> findAll();

    @Override
    @EntityGraph(attributePaths = "owner")
    Optional<Skill> findById(UUID id);

    long countByOwnerEmail(String ownerEmail);
}