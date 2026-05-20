package com.timebank.timebank.review;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ReviewRepository extends JpaRepository<Review, UUID> {

    void deleteAllByExchangeRequest_IdIn(Collection<UUID> exchangeRequestIds);

    boolean existsByExchangeRequestId(UUID exchangeRequestId);

    @EntityGraph(attributePaths = {"reviewer", "reviewedUser", "exchangeRequest", "exchangeRequest.skill"})
    List<Review> findByReviewedUserEmailOrderByCreatedAtDesc(String email);

    @EntityGraph(attributePaths = {"reviewer", "reviewedUser", "exchangeRequest", "exchangeRequest.skill"})
    Optional<Review> findById(UUID id);

    long countByReviewedUserEmail(String email);

    @Query("select avg(r.rating) from Review r where r.reviewedUser.email = :email")
    Double findAverageRatingByReviewedUserEmail(String email);

    @EntityGraph(attributePaths = {"reviewer", "reviewedUser", "exchangeRequest", "exchangeRequest.skill"})
    List<Review> findByReviewer_EmailOrderByCreatedAtDesc(String reviewerEmail);

    long countByReviewer_Email(String reviewerEmail);

    @Query("select avg(r.rating) from Review r where r.reviewer.email = :email")
    Double findAverageRatingByReviewerEmail(String email);

    @Query("SELECT AVG(r.rating) FROM Review r")
    Double averageRatingAll();
}