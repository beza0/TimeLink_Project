package com.timebank.timebank.exchange.dto;

import com.timebank.timebank.exchange.ExchangeRequestStatus;

import java.time.Instant;
import java.util.UUID;

public class ExchangeRequestResponse {

    private UUID id;
    private UUID skillId;
    private String skillTitle;
    private UUID requesterId;
    private String requesterName;
    private UUID ownerId;
    private String ownerName;
    private String message;
    private int bookedMinutes;
    private Instant scheduledStartAt;
    private boolean pendingFromOwner;
    private ExchangeRequestStatus status;
    private Instant createdAt;
    private String sessionMeetingUrl;
    private Instant requesterAttendanceAckAt;
    private Instant ownerAttendanceAckAt;

    public ExchangeRequestResponse(
            UUID id,
            UUID skillId,
            String skillTitle,
            UUID requesterId,
            String requesterName,
            UUID ownerId,
            String ownerName,
            String message,
            int bookedMinutes,
            Instant scheduledStartAt,
            boolean pendingFromOwner,
            ExchangeRequestStatus status,
            Instant createdAt,
            String sessionMeetingUrl,
            Instant requesterAttendanceAckAt,
            Instant ownerAttendanceAckAt
    ) {
        this.id = id;
        this.skillId = skillId;
        this.skillTitle = skillTitle;
        this.requesterId = requesterId;
        this.requesterName = requesterName;
        this.ownerId = ownerId;
        this.ownerName = ownerName;
        this.message = message;
        this.bookedMinutes = bookedMinutes;
        this.scheduledStartAt = scheduledStartAt;
        this.pendingFromOwner = pendingFromOwner;
        this.status = status;
        this.createdAt = createdAt;
        this.sessionMeetingUrl = sessionMeetingUrl;
        this.requesterAttendanceAckAt = requesterAttendanceAckAt;
        this.ownerAttendanceAckAt = ownerAttendanceAckAt;
    }

    public UUID getId() {
        return id;
    }

    public UUID getSkillId() {
        return skillId;
    }

    public String getSkillTitle() {
        return skillTitle;
    }

    public UUID getRequesterId() {
        return requesterId;
    }

    public String getRequesterName() {
        return requesterName;
    }

    public UUID getOwnerId() {
        return ownerId;
    }

    public String getOwnerName() {
        return ownerName;
    }

    public String getMessage() {
        return message;
    }

    public int getBookedMinutes() {
        return bookedMinutes;
    }

    public Instant getScheduledStartAt() {
        return scheduledStartAt;
    }

    public ExchangeRequestStatus getStatus() {
        return status;
    }

    public boolean isPendingFromOwner() {
        return pendingFromOwner;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public String getSessionMeetingUrl() {
        return sessionMeetingUrl;
    }

    public Instant getRequesterAttendanceAckAt() {
        return requesterAttendanceAckAt;
    }

    public Instant getOwnerAttendanceAckAt() {
        return ownerAttendanceAckAt;
    }
}