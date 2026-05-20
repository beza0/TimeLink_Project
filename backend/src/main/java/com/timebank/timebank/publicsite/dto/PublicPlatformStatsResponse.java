package com.timebank.timebank.publicsite.dto;

/**
 * Özet platform metrikleri (About sayfası). Kimlik doğrulaması gerektirmez.
 */
public class PublicPlatformStatsResponse {

    private final long verifiedMemberCount;
    private final long skillsListedCount;
    private final long completedSessionMinutesTotal;
    private final long reviewCount;
    /** Ortalama yıldız (1–5) → yüzde; hiç değerlendirme yoksa null. */
    private final Integer satisfactionPercent;

    public PublicPlatformStatsResponse(
            long verifiedMemberCount,
            long skillsListedCount,
            long completedSessionMinutesTotal,
            long reviewCount,
            Integer satisfactionPercent
    ) {
        this.verifiedMemberCount = verifiedMemberCount;
        this.skillsListedCount = skillsListedCount;
        this.completedSessionMinutesTotal = completedSessionMinutesTotal;
        this.reviewCount = reviewCount;
        this.satisfactionPercent = satisfactionPercent;
    }

    public long getVerifiedMemberCount() {
        return verifiedMemberCount;
    }

    public long getSkillsListedCount() {
        return skillsListedCount;
    }

    public long getCompletedSessionMinutesTotal() {
        return completedSessionMinutesTotal;
    }

    public long getReviewCount() {
        return reviewCount;
    }

    public Integer getSatisfactionPercent() {
        return satisfactionPercent;
    }
}
