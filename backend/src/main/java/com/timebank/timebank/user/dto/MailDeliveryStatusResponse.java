package com.timebank.timebank.user.dto;

/** SMTP yapılandırma özeti (gizli bilgi içermez). */
public record MailDeliveryStatusResponse(
        boolean smtpMailDeliveryEnabled,
        boolean smtpLocalCapture,
        boolean mailHostConfigured,
        boolean mailFromConfigured
) {}
