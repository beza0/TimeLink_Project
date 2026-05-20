package com.timebank.timebank.publicsite;

import com.timebank.timebank.exchange.ExchangeRequestRepository;
import com.timebank.timebank.exchange.ExchangeRequestStatus;
import com.timebank.timebank.publicsite.dto.PublicPlatformStatsResponse;
import com.timebank.timebank.review.ReviewRepository;
import com.timebank.timebank.skill.SkillRepository;
import com.timebank.timebank.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PublicPlatformStatsService {

    private final UserRepository userRepository;
    private final SkillRepository skillRepository;
    private final ExchangeRequestRepository exchangeRequestRepository;
    private final ReviewRepository reviewRepository;

    public PublicPlatformStatsService(
            UserRepository userRepository,
            SkillRepository skillRepository,
            ExchangeRequestRepository exchangeRequestRepository,
            ReviewRepository reviewRepository
    ) {
        this.userRepository = userRepository;
        this.skillRepository = skillRepository;
        this.exchangeRequestRepository = exchangeRequestRepository;
        this.reviewRepository = reviewRepository;
    }

    @Transactional(readOnly = true)
    public PublicPlatformStatsResponse getPlatformStats() {
        long verifiedMembers = userRepository.countByEmailVerifiedTrue();
        long skills = skillRepository.count();
        long completedMinutes = exchangeRequestRepository.sumBookedMinutesByStatus(ExchangeRequestStatus.COMPLETED);
        long reviewCount = reviewRepository.count();

        Integer satisfactionPercent = null;
        if (reviewCount > 0) {
            Double avg = reviewRepository.averageRatingAll();
            if (avg != null && !avg.isNaN()) {
                int pct = (int) Math.round((avg / 5.0) * 100.0);
                satisfactionPercent = Math.min(100, Math.max(0, pct));
            }
        }

        return new PublicPlatformStatsResponse(
                verifiedMembers,
                skills,
                completedMinutes,
                reviewCount,
                satisfactionPercent
        );
    }
}
