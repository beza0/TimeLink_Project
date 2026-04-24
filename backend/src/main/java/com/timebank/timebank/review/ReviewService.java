package com.timebank.timebank.review;

import com.timebank.timebank.exchange.ExchangeRequest;
import com.timebank.timebank.exchange.ExchangeRequestRepository;
import com.timebank.timebank.exchange.ExchangeRequestStatus;
import com.timebank.timebank.review.dto.CreateReviewRequest;
import com.timebank.timebank.review.dto.ReviewResponse;
import com.timebank.timebank.review.dto.UserRatingSummaryResponse;
import com.timebank.timebank.user.User;
import com.timebank.timebank.user.UserRepository;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final ExchangeRequestRepository exchangeRequestRepository;
    private final UserRepository userRepository;

    public ReviewService(
            ReviewRepository reviewRepository,
            ExchangeRequestRepository exchangeRequestRepository,
            UserRepository userRepository
    ) {
        this.reviewRepository = reviewRepository;
        this.exchangeRequestRepository = exchangeRequestRepository;
        this.userRepository = userRepository;
    }

    public ReviewResponse createReview(UUID exchangeRequestId, CreateReviewRequest req, String reviewerEmail) {
        User reviewer = userRepository.findByEmailIgnoreCase(reviewerEmail)
                .orElseThrow(() -> new BadCredentialsException("Kullanıcı bulunamadı"));

        ExchangeRequest exchangeRequest = exchangeRequestRepository.findById(exchangeRequestId)
                .orElseThrow(() -> new IllegalArgumentException("Exchange request bulunamadı"));

        if (exchangeRequest.getStatus() != ExchangeRequestStatus.COMPLETED) {
            throw new IllegalArgumentException("Sadece tamamlanan işlemler için yorum yapılabilir");
        }

        if (!exchangeRequest.getRequester().getEmail().equals(reviewerEmail)) {
            throw new IllegalArgumentException("Bu işlem için sadece talep sahibi yorum bırakabilir");
        }

        if (reviewRepository.existsByExchangeRequestId(exchangeRequestId)) {
            throw new IllegalArgumentException("Bu işlem için zaten yorum yapılmış");
        }

        User reviewedUser = exchangeRequest.getSkill().getOwner();

        Review review = new Review();
        review.setExchangeRequest(exchangeRequest);
        review.setReviewer(reviewer);
        review.setReviewedUser(reviewedUser);
        review.setRating(req.getRating());
        review.setComment(req.getComment() != null ? req.getComment().trim() : null);

        Review saved = reviewRepository.save(review);
        return mapToResponse(saved);
    }

    public List<ReviewResponse> getReviewsForUser(String email) {
        return reviewRepository.findByReviewedUserEmailOrderByCreatedAtDesc(email)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    public UserRatingSummaryResponse getRatingSummary(String email) {
        long totalReviews = reviewRepository.countByReviewedUserEmail(email);
        Double avg = reviewRepository.findAverageRatingByReviewedUserEmail(email);

        return new UserRatingSummaryResponse(
                totalReviews,
                avg != null ? avg : 0.0
        );
    }

    /** Öğrencinin eğitmenlere bıraktığı yorumlar (verdiği puanlar) */
    public List<ReviewResponse> getReviewsWrittenByUser(String reviewerEmail) {
        return reviewRepository.findByReviewer_EmailOrderByCreatedAtDesc(reviewerEmail)
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    /** Verdiğin yorumların ortalama yıldızı ve adedi */
    public UserRatingSummaryResponse getRatingSummaryForReviewsGiven(String reviewerEmail) {
        long total = reviewRepository.countByReviewer_Email(reviewerEmail);
        Double avg = reviewRepository.findAverageRatingByReviewerEmail(reviewerEmail);
        return new UserRatingSummaryResponse(
                total,
                avg != null ? avg : 0.0
        );
    }

    private ReviewResponse mapToResponse(Review review) {
        String skillTitle = review.getExchangeRequest().getSkill() != null
                ? review.getExchangeRequest().getSkill().getTitle()
                : null;
        return new ReviewResponse(
                review.getId(),
                review.getExchangeRequest().getId(),
                review.getReviewer().getId(),
                review.getReviewer().getFullName(),
                review.getReviewedUser().getId(),
                review.getReviewedUser().getFullName(),
                skillTitle,
                review.getRating(),
                review.getComment(),
                review.getCreatedAt()
        );
    }
}