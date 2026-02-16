package ch.questboard.backend.auth;

public record AuthResponse(
    Long id,
    String username,
    int totalXp,
    boolean hasAvatar
) {}
