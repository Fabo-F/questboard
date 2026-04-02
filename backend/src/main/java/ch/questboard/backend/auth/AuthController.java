package ch.questboard.backend.auth;

import ch.questboard.backend.user.User;
import ch.questboard.backend.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(
    origins = "http://localhost:5173",
    methods = {RequestMethod.GET, RequestMethod.POST, RequestMethod.OPTIONS, RequestMethod.PATCH, RequestMethod.PUT, RequestMethod.DELETE},
    allowedHeaders = "*"
)
public class AuthController {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;

    public AuthController(UserRepository users, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
    }

    // public record AuthUserResponse(Long id, String username) {}

    @PostMapping("/login")
    public AuthResponse login(@RequestBody LoginRequest req) {
        User user = users.findByUsername(req.username())
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid password");
        }

        return new AuthResponse(
            user.getId(),
            user.getUsername(),
            user.getTotalXp(),
            user.getAvatarBytes() != null,
            user.isAdmin()
        );
    }

    @PostMapping("/register")
    public AuthResponse register(@RequestBody LoginRequest req) {
        if (users.findByUsername(req.username()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already taken");
        }

        User u = new User(req.username());
        u.setPasswordHash(passwordEncoder.encode(req.password()));
        u = users.save(u);

        return new AuthResponse(
            u.getId(),
            u.getUsername(),
            u.getTotalXp(),
            false,
            u.isAdmin()
        );
    }

    @PutMapping("/users/{id}/password")
    public void changePassword(@PathVariable Long id, @RequestBody ChangePasswordRequest req) {

    User user = users.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

    if (req.currentPassword() == null || req.newPassword() == null) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing password fields");
    }

    if (!passwordEncoder.matches(req.currentPassword(), user.getPasswordHash())) {
        throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Current password is wrong");
    }

    if (req.newPassword().length() < 6) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password too short (min 6)");
    }

    user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
    users.save(user);
    }
}
