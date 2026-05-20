package com.timebank.timebank.publicsite;

import com.timebank.timebank.publicsite.dto.PublicPlatformStatsResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/public")
public class PublicPlatformStatsController {

    private final PublicPlatformStatsService publicPlatformStatsService;

    public PublicPlatformStatsController(PublicPlatformStatsService publicPlatformStatsService) {
        this.publicPlatformStatsService = publicPlatformStatsService;
    }

    @GetMapping("/stats")
    public ResponseEntity<PublicPlatformStatsResponse> getStats() {
        return ResponseEntity.ok(publicPlatformStatsService.getPlatformStats());
    }
}
