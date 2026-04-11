package com.timebank.timebank.user.dto;

import java.time.Instant;
import java.util.UUID;

public class UserProfileResponse {

    private UUID id;
    private String fullName;
    private String email;
    private String bio;
    private String phone;
    private String location;
    private String languages;
    private String website;
    private String linkedin;
    private String twitter;
    private String avatarUrl;
    private long timeCreditMinutes;
    private Instant createdAt;

    public UserProfileResponse(
            UUID id,
            String fullName,
            String email,
            String bio,
            String phone,
            String location,
            String languages,
            String website,
            String linkedin,
            String twitter,
            String avatarUrl,
            long timeCreditMinutes,
            Instant createdAt
    ) {
        this.id = id;
        this.fullName = fullName;
        this.email = email;
        this.bio = bio;
        this.phone = phone;
        this.location = location;
        this.languages = languages;
        this.website = website;
        this.linkedin = linkedin;
        this.twitter = twitter;
        this.avatarUrl = avatarUrl;
        this.timeCreditMinutes = timeCreditMinutes;
        this.createdAt = createdAt;
    }

    public UUID getId() {
        return id;
    }

    public String getFullName() {
        return fullName;
    }

    public String getEmail() {
        return email;
    }

    public String getBio() {
        return bio;
    }

    public String getPhone() {
        return phone;
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

    public long getTimeCreditMinutes() {
        return timeCreditMinutes;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
