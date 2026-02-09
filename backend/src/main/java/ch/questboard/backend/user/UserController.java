package ch.questboard.backend.user;

import ch.questboard.backend.task.Task;
import ch.questboard.backend.task.TaskRepository;
import ch.questboard.backend.task.TaskStatus;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@CrossOrigin(origins = "http://localhost:5173")
@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserRepository users;
    private final TaskRepository tasks;

    public UserController(UserRepository users, TaskRepository tasks){
        this.users = users;
        this.tasks = tasks;
    }

    public record AvatarRequest(String avatarUrl) {}

    @PostMapping("/ensure")
    public User ensure(@RequestParam String username){
        return users.findByUsername(username).orElseGet(() -> users.save(new User(username)));
    }

    @GetMapping("/{id}")
    public User get(@PathVariable Long id){
        return users.findById(id).orElseThrow();
    }

    @GetMapping("/{id}/dashboard")
    public UserDashboardResponse dashboard(@PathVariable Long id) {
        User user = users.findById(id).orElseThrow();
        List<Task> userTasks = tasks.findByUserId(id);

        int open = (int) userTasks.stream().filter(t -> t.getStatus() == TaskStatus.OPEN).count();
        int done = (int) userTasks.stream().filter(t -> t.getStatus() == TaskStatus.DONE).count();

        return new UserDashboardResponse(
                user.getId(),
                user.getUsername(),
                user.getTotalXp(),
                open,
                done,
                userTasks
        );
    }

    // @PatchMapping("/{id}/avatar")
    // public User updateAvatar(@PathVariable Long id, @RequestBody AvatarRequest req) {
    //     User u = users.findById(id)
    //         .orElseThrow(() -> new RuntimeException("User not found"));

    //     u.setAvatarUrl(req.avatarUrl());
    //     return users.save(u);
    // }

    @PatchMapping("/{id}/profile")
    public User updateProfile(@PathVariable Long id, @RequestBody UpdateProfileRequest req) {
        User user = users.findById(id)
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        if (req.username() != null && !req.username().trim().isEmpty()) {
        String newName = req.username().trim();

        users.findByUsername(newName).ifPresent(existing -> {
            if (!existing.getId().equals(id)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Username already taken");
            }
        });

        user.setUsername(newName);
        }

        if (req.avatarUrl() != null) {
        user.setAvatarUrl(req.avatarUrl().trim());
        }

        return users.save(user);
    }
}
