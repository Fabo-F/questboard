package ch.questboard.backend.auth;

public record ChangePasswordRequest(String currentPassword, String newPassword) {
    
}
