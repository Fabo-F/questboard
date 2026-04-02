package ch.questboard.backend.feedback;

import ch.questboard.backend.user.UserRepository;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/feedback")
public class FeedbackController {

    private final FeedbackRepository repo;
    private final UserRepository users;

    public FeedbackController(FeedbackRepository repo, UserRepository users) {
        this.repo = repo;
        this.users = users;
    }

    public record CreateFeedbackRequest(
        @jakarta.validation.constraints.NotBlank
        String name,
        String email,
        @jakarta.validation.constraints.NotBlank
        String message
    ) {}

    @PostMapping
    public Feedback create(@RequestBody @jakarta.validation.Valid CreateFeedbackRequest req) {
        Feedback feedback = new Feedback(
            req.name().trim(),
            req.email() != null ? req.email().trim() : null,
            req.message().trim()
        );

        return repo.save(feedback);
    }

    @GetMapping
    public List<Feedback> all(@RequestParam Long userId) {
        var user = users.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        if (!user.isAdmin()) {
            throw new RuntimeException("Unauthorized");
        }

        return repo.findAllByOrderByCreatedAtDesc();
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id, @RequestParam Long userId) {
        var user = users.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));

        if (!user.isAdmin()) {
            throw new RuntimeException("Unauthorized");
        }

        repo.deleteById(id);
    }
}