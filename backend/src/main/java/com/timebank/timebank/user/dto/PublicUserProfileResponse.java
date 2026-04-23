package com.timebank.timebank.user.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * Giriş yapan kullanıcılar için, başka bir üyenin herkese açık alanları.
 */
public class PublicUserProfileResponse {

    private final UUID id;
    private final String fullName;
    private final String bio;
    private final String location;
    private final String languages;
    private final String website;
    private final String linkedin;
    private final String twitter;
    private final String avatarUrl;
    private final Instant memberSince;
    private final double averageRating;
    private final long totalReviews;

    public PublicUserProfileResponse(
            UUID id,
            String fullName,
            String bio,
            String location,
            String languages,
            String website,
            String linkedin,
            String twitter,
            String avatarUrl,
            Instant memberSince,
            double averageRating,
            long totalReviews
    ) {
        this.id = id;
        this.fullName = fullName;
        this.bio = bio;
        this.location = location;
        this.languages = languages;
        this.website = website;
        this.linkedin = linkedin;
        this.twitter = twitter;
        this.avatarUrl = avatarUrl;
        this.memberSince = memberSince;
        this.averageRating = averageRating;
        this.totalReviews = totalReviews;
    }

    public UUID getId() {
        return id;
    }

    public String getFullName() {
        return fullName;
    }

    public String getBio() {
        return bio;
    }

    public String getLocation() {
        return location;
    }

    public String getLanguages() {
        return languages;
    }

    public String getWebsite() {
        return website;
    }

    public String getLinkedin() {
        return linkedin;
    }

    public String getTwitter() {
        return twitter;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public Instant getMemberSince() {
        return memberSince;
    }

    public double getAverageRating() {
        return averageRating;
    }

    public long getTotalReviews() {
        return totalReviews;
    }
}
