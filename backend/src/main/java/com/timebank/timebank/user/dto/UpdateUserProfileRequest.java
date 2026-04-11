package com.timebank.timebank.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class UpdateUserProfileRequest {

    @NotBlank(message = "Ad soyad boş olamaz")
    @Size(max = 100, message = "Ad soyad en fazla 100 karakter olabilir")
    private String fullName;

    @Size(max = 1000, message = "Bio en fazla 1000 karakter olabilir")
    private String bio;

    @Size(max = 30, message = "Telefon en fazla 30 karakter olabilir")
    private String phone;

    @Size(max = 120, message = "Konum en fazla 120 karakter olabilir")
    private String location;

    @Size(max = 200, message = "Diller en fazla 200 karakter olabilir")
    private String languages;

    @Size(max = 255, message = "Web sitesi en fazla 255 karakter olabilir")
    private String website;

    @Size(max = 255, message = "LinkedIn en fazla 255 karakter olabilir")
    private String linkedin;

    @Size(max = 255, message = "Twitter en fazla 255 karakter olabilir")
    private String twitter;

    /** Profil fotoğrafı (data URL veya kısa HTTPS URL); null = fotoğrafı kaldır */
    @Size(max = 7_000_000, message = "Profil görseli çok büyük")
    private String avatarUrl;

    public String getFullName() {
        return fullName;
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

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public void setLanguages(String languages) {
        this.languages = languages;
    }

    public void setWebsite(String website) {
        this.website = website;
    }

    public void setLinkedin(String linkedin) {
        this.linkedin = linkedin;
    }

    public void setTwitter(String twitter) {
        this.twitter = twitter;
    }

    public String getAvatarUrl() {
        return avatarUrl;
    }

    public void setAvatarUrl(String avatarUrl) {
        this.avatarUrl = avatarUrl;
    }
}
